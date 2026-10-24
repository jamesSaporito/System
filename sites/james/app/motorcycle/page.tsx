import type { Metadata } from "next";
import { FeatureRow } from "@/components/feature-row";
import { MediaImage } from "@/components/media-image";

export const metadata: Metadata = { title: "Motorcycle" };

// Page content lives here in code. Photos go in sites/james/media/motorcycle/ and are uploaded
// with `pnpm media:push`; set `src` to e.g. mediaUrl("motorcycle/hero.jpg") from "@/lib/media"
// to replace a placeholder.
const HERO = { src: null, alt: "1971 CL350" };

const DESCRIPTION = [
  "One of my favorite projects I've taken on is restoring a 1971 Honda CL350. This took roughly a year from start to finish. " +
    "This image was taken the very last day when I called it officially complete.",
];

const SECTIONS = [
  {
    image: { src: null, alt: "First detail photo" },
    title: "Section title",
    body: "Describe what this photo shows.",
  },
  {
    image: { src: null, alt: "Second detail photo" },
    title: "Section title",
    body: "Describe what this photo shows.",
  },
  {
    image: { src: null, alt: "Third detail photo" },
    title: "Section title",
    body: "Describe what this photo shows.",
  },
];

export default function MotorcyclePage() {
  return (
    <>
      <h1 className="sr-only">Motorcycle</h1>

      <MediaImage
        {...HERO}
        eager
        aspect="aspect-[16/9]"
        sizes="(min-width: 1152px) 1120px, 100vw"
        className="mt-6 motion-safe:animate-fade-in"
      />

      <div className="mx-auto mt-12 max-w-3xl space-y-4 text-lg leading-relaxed">
        {DESCRIPTION.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-20 grid gap-20 md:gap-28">
        {SECTIONS.map(({ image, title, body }, index) => (
          // Alternate sides: image left, then text left, and so on.
          <FeatureRow key={image.alt} image={image} title={title} reverse={index % 2 === 1}>
            <p>{body}</p>
          </FeatureRow>
        ))}
      </div>
    </>
  );
}
