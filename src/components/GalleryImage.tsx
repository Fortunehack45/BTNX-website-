import { useState, useEffect, useRef } from "react";

interface GalleryImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  id?: string;
}

export default function GalleryImage({ src, fallbackSrc, alt, className = "", id }: GalleryImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(src);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div
        className={`w-full h-full bg-[#F4F1EC] dark:bg-[#22211E] flex flex-col items-center justify-center p-2 text-center select-none overflow-hidden ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-4 h-[1px] bg-[#966830] dark:bg-[#C89B62] mb-1 opacity-70" />
        <span className="font-display text-[11px] leading-tight text-[#141413] dark:text-[#F3F1EC] line-clamp-2 px-1">{alt}</span>
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] mt-0.5 opacity-80">
          BTNX
        </span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      id={id}
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
      className={`${className} ${!isLoaded ? "skeleton-shimmer" : ""}`}
    />
  );
}
