import { create } from 'ipfs-http-client'

// Connect to Pi Network's IPFS gateway or a public gateway
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${btoa(
      `${import.meta.env.VITE_INFURA_PROJECT_ID || ''}:${import.meta.env.VITE_INFURA_PROJECT_SECRET || ''}`
    )}`,
  },
})

export const uploadToIPFS = async (file: File): Promise<string> => {
  try {
    const result = await ipfs.add({
      path: file.name,
      content: file
    })

    // Return the IPFS URL
    return `https://ipfs.io/ipfs/${result.cid}`
  } catch (error) {
    console.error('IPFS upload failed:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

export const uploadJSONToIPFS = async (data: object): Promise<string> => {
  try {
    const result = await ipfs.add({
      path: 'metadata.json',
      content: JSON.stringify(data)
    })

    return `https://ipfs.io/ipfs/${result.cid}`
  } catch (error) {
    console.error('IPFS JSON upload failed:', error)
    throw new Error('Failed to upload metadata to IPFS')
  }
}

export const getFromIPFS = async (cid: string): Promise<any> => {
  try {
    const stream = ipfs.cat(cid)
    let data = ''

    for await (const chunk of stream) {
      data += chunk.toString()
    }

    return JSON.parse(data)
  } catch (error) {
    console.error('IPFS fetch failed:', error)
    throw new Error('Failed to fetch from IPFS')
  }
}