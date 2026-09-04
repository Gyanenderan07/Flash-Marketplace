import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  containerClassName?: string;
}

export function SafeImage({
  src,
  alt = 'Product image',
  className = '',
  containerClassName = '',
  fallbackText = 'Flash Product',
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || hasError) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center bg-[#131722] text-neutral-500 p-4 text-center ${containerClassName}`}
      >
        <Package className="h-8 w-8 text-[#CCFF00]/40 mb-2" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 line-clamp-1">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-neutral-800/50" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
    </div>
  );
}
