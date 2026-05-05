import axios from 'axios'
import FormData from 'form-data'
import { Readable } from 'stream'

const PINATA_API_URL = 'https://api.pinata.cloud'

export class MediaService {
  static async uploadToPinata(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const stream = Readable.from([fileBuffer])

      const form = new FormData()
      form.append('file', stream, fileName)

      const metadata = {
        name: fileName,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          app: 'piconnect'
        }
      }

      form.append('pinataMetadata', JSON.stringify(metadata))
      form.append('pinataOptions', JSON.stringify({
        cidVersion: 1
      }))

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'pinata_api_key': process.env.PINATA_API_KEY || '',
            'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY || ''
          }
        }
      )

      // Return IPFS gateway URL
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    } catch (error) {
      console.error('Pinata upload failed:', error)
      throw new Error('Failed to upload media to IPFS')
    }
  }

  static async uploadJSONToPinata(data: object, name: string): Promise<string> {
    try {
      const jsonString = JSON.stringify(data)
      const buffer = Buffer.from(jsonString)

      return this.uploadToPinata(buffer, `${name}.json`)
    } catch (error) {
      console.error('Pinata JSON upload failed:', error)
      throw new Error('Failed to upload JSON to IPFS')
    }
  }

  static async pinCIDToIPFS(ipfsHash: string, name: string): Promise<void> {
    try {
      await axios.post(
        `${PINATA_API_URL}/pinning/pinByHash`,
        {
          hashToPin: ipfsHash,
          pinataMetadata: {
            name: name,
            keyvalues: {
              app: 'piconnect'
            }
          }
        },
        {
          headers: {
            'pinata_api_key': process.env.PINATA_API_KEY || '',
            'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY || ''
          }
        }
      )
    } catch (error) {
      console.error('Pin to IPFS failed:', error)
      throw new Error('Failed to pin content to IPFS')
    }
  }
}

export const uploadToPinata = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  return MediaService.uploadToPinata(fileBuffer, fileName)
}