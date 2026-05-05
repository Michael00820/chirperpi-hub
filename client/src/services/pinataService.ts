import axios from 'axios'

const PINATA_API_URL = 'https://api.pinata.cloud'

export const uploadToPinata = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const metadata = {
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      app: 'piconnect'
    }
  }

  formData.append('pinataMetadata', JSON.stringify(metadata))
  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1
  }))

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY || '',
          'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_API_KEY || '',
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress?.(percentCompleted)
          }
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

export const uploadJSONToPinata = async (data: object, name: string): Promise<string> => {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], `${name}.json`)

  return uploadToPinata(file)
}

export const pinCIDToIPFS = async (ipfsHash: string, name: string): Promise<void> => {
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
          'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY || '',
          'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_API_KEY || ''
        }
      }
    )
  } catch (error) {
    console.error('Pin to IPFS failed:', error)
    throw new Error('Failed to pin content to IPFS')
  }
}