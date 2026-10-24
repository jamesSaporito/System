import Image from "next/image";

export type MediaImageProps = {
  /** Path under public/, e.g. "/motorcycle/hero.jpg". Null shows a placeholder until a photo is added. */
  src: string | null;
  alt: string;
  /** Tailwind aspect-ratio class for the frame, e.g. "aspect-[16/9]". */
  aspect: string;
  /** Load immediately (above-the-fold images such as a hero). */
  eager?: boolean;
  /** Passed to the browser to pick a size; describe how wide the image renders. */
  sizes: string;
  className?: string;
};

/** A fixed-ratio, rounded image frame that crops its photo to fill. */
export function MediaImage({
  src,
  alt,
  aspect,
  eager = false,
  sizes,
  className = "",
}: MediaImageProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60 ${aspect} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400 dark:text-neutral-500">
          Image coming soon
        </div>
      )}
    </div>
  );
}
