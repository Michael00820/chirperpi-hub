declare global {
  interface Window {
    pi?: any
    Pi?: any
  }
}

export const loadPiSdk = async (): Promise<any> => {
  const sdkUrl = import.meta.env.VITE_PI_SDK_URL
  if (!sdkUrl) {
    return window.pi || window.Pi
  }

  if (window.pi || window.Pi) {
    return window.pi || window.Pi
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = sdkUrl
    script.async = true
    script.onload = () => resolve(window.pi || window.Pi)
    script.onerror = () => reject(new Error('Failed to load Pi SDK'))
    document.body.appendChild(script)
  })
}

export const requestPiPayment = async (amount: number, memo: string) => {
  const sdk = window.pi || window.Pi
  if (!sdk || typeof sdk.requestPayment !== 'function') {
    throw new Error('Pi SDK is not available')
  }

  return sdk.requestPayment({
    amount,
    currency: 'PI',
    memo
  })
}

export const requestPiSignature = async (message: string): Promise<string> => {
  const sdk = window.pi || window.Pi
  if (!sdk || typeof sdk.requestSignature !== 'function') {
    throw new Error('Pi SDK is not available')
  }

  const result = await sdk.requestSignature(message)
  return result.signature
}
