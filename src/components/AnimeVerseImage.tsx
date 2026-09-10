"use client";

import Image from "next/image";

type AnimeVerseImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  preload?: boolean;
};

/** Product/editorial imagery served through Next's optimizer and cache. */
export function AnimeVerseImage({ src, alt, className, sizes, preload = false }: AnimeVerseImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      loading={preload ? undefined : "lazy"}
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
