import type { ReactNode } from "react";
import { MediaImage, type MediaImageProps } from "./media-image";

type FeatureRowProps = {
  image: Pick<MediaImageProps, "src" | "alt">;
  title?: string;
  children: ReactNode;
  /** Put the text on the left and the image on the right (desktop only; phones always stack). */
  reverse?: boolean;
};

/** A large image with text beside it on wider screens, stacked image-then-text on phones. */
export function FeatureRow({ image, title, children, reverse = false }: FeatureRowProps) {
  return (
    <section className="grid items-center gap-6 md:grid-cols-5 md:gap-12">
      <MediaImage
        {...image}
        aspect="aspect-[4/3]"
        sizes="(min-width: 768px) 60vw, 100vw"
        className={`md:col-span-3 ${reverse ? "md:order-last" : ""}`}
      />
      <div className="md:col-span-2">
        {title ? <h2 className="text-2xl font-semibold tracking-tight">{title}</h2> : null}
        <div className="mt-3 space-y-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
          {children}
        </div>
      </div>
    </section>
  );
}
