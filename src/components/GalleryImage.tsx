import React, { useState, useEffect } from "react";

interface GalleryImageProps {
  src?: string;
  alt: string;
  className?: string;
  id?: string;
}

export default function GalleryImage({ src, alt, className = "", id }: GalleryImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`w-full h-full bg-[#F4F1EC] dark:bg-[#22211E] flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-8 h-[1px] bg-[#966830] dark:bg-[#C89B62] mb-3" />
        <span className="font-display text-lg text-[#141413] dark:text-[#F3F1EC] tracking-wide">{alt}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#66625B] dark:text-[#A7A299] mt-1">
          BTNX Archive
        </span>
      </div>
    );
  }

  return (
    <img
      id={id}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
