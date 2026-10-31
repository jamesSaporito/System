import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section } from "@/components/project-page";
import { TimingTable, UNMEASURED } from "@/components/timing-table";
import { findWatch, watchSpecs, watchTitle } from "@/lib/watches";

// The watch's facts (spec sheet, photo) live in lib/watches.ts; its story lives here. Text and
// photos are placeholders for now; when photos are added to media/time/hamilton/748/, swap each null src
// for mediaUrl("time/hamilton/748/<name>.webp").
const WATCH = findWatch("Hamilton", "748");

export const metadata: Metadata = { title: watchTitle(WATCH) };

const INTRO = <p>Placeholder introduction to the {watchTitle(WATCH)}.</p>;

const SECTIONS: Section[] = [
  {
    title: "Condition",
    image: { src: null, alt: "Placeholder photo" },
    content: <p>Placeholder text about the watch as it arrived.</p>,
  },
  {
    title: "Service",
    image: { src: null, alt: "Placeholder photo" },
    content: <p>Placeholder text about the work done.</p>,
  },
  {
    title: "Timing",
    content: (
      <>
        <p>Placeholder text about the timegrapher results.</p>
        <TimingTable rows={UNMEASURED} />
      </>
    ),
  },
];

export default function Hamilton748Page() {
  return (
    <>
      <h1 className="sr-only">{watchTitle(WATCH)}</h1>

      <Hero
        src={WATCH.photo?.src ?? null}
        alt={WATCH.photo?.alt ?? watchTitle(WATCH)}
        aspect="aspect-[4/3]"
      />

      <Intro specs={watchSpecs(WATCH)}>{INTRO}</Intro>

      <Sections sections={SECTIONS} />
    </>
  );
}
