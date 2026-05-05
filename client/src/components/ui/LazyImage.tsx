import { ImgHTMLAttributes, useState } from 'react'

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
  blur?: boolean
}

const LazyImage = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/default-avatar.png',
  blur = true,
  onLoad,
  ...props
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false)
  const effectiveSrc = src || fallbackSrc

  return (
    <img
      src={effectiveSrc}
      alt={alt ?? ''}
      loading="lazy"
      className={`${className} transition duration-500 ease-out ${blur ? 'bg-gray-100' : ''} ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`.trim()}
      onLoad={(event) => {
        setLoaded(true)
        if (onLoad) onLoad(event)
      }}
      {...props}
    />
  )
}

export default LazyImage
