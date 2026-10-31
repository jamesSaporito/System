"use client";

import Image from "next/image";
import { useRef } from "react";

export type MediaImageProps = {
  /** Usually mediaUrl("motorcycle/hero.webp"). Null shows a placeholder until a photo is added. */
  src: string | null;
  alt: string;
  /**
   * Tailwind aspect-ratio class for the frame, e.g. "aspect-[4/3]". Match the photo's shape: the
   * whole photo is always shown, so a mismatched frame leaves empty bands instead of cropping.
   */
  aspect: string;
  /** Load immediately (above-the-fold images such as a hero). */
  eager?: boolean;
  /** Passed to the browser to pick a size; describe how wide the image renders. */
  sizes: string;
  className?: string;
};

/** A rounded image frame showing the whole photo; clicking it opens an enlarged view. */
export function MediaImage({
  src,
  alt,
  aspect,
  eager = false,
  sizes,
  className = "",
}: MediaImageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frame = `relative overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800/60 ${aspect} ${className}`;

  if (!src) {
    return (
      <div className={frame}>
        <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400 dark:text-neutral-500">
          Image coming soon
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Enlarge photo: ${alt}`}
        onClick={() => dialogRef.current?.showModal()}
        className={`block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${frame}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="object-contain"
        />
      </button>

      {/* Native modal: Escape closes it and focus returns to the photo. A closed dialog isn't
          rendered, so its lazy image only downloads when opened (usually from cache). */}
      <dialog
        ref={dialogRef}
        aria-label={alt}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 backdrop:bg-black/90"
      >
        {/* Clicking anywhere closes the enlarged view. */}
        <button
          type="button"
          aria-label="Close enlarged photo"
          onClick={() => dialogRef.current?.close()}
          className="relative block size-full cursor-zoom-out p-4 focus-visible:outline-none sm:p-10"
        >
          <span className="relative block size-full">
            <Image src={src} alt={alt} fill sizes="100vw" className="object-contain" />
          </span>
          <span
            aria-hidden="true"
            className="absolute top-3 right-4 text-3xl leading-none text-white/70 sm:top-4 sm:right-6"
          >
            ×
          </span>
        </button>
      </dialog>
    </>
  );
}
