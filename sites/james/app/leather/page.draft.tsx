import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section, type Spec } from "@/components/project-page";

export const metadata: Metadata = { title: "Leather" };

// Page content lives here in code. Text and photos are placeholders for now; when photos are added
// to media/leather/, swap each null src for mediaUrl("leather/<name>.webp"). This page is a draft
// (page.draft.tsx, and `draft: true` in lib/nav.ts) until it's filled in.
const HERO = { src: null, alt: "Placeholder for a leather project" };

const INTRO = <p>Placeholder paragraph introducing the leather work.</p>;

const SPECS: Spec[] = [
  { label: "Leather", value: "TBD" },
  { label: "Thread", value: "TBD" },
  { label: "Completed", value: "TBD" },
];

const SECTIONS: Section[] = [
  {
    title: "Section One",
    image: { src: null, alt: "Placeholder photo" },
    content: <p>Placeholder text for the first section.</p>,
  },
  {
    title: "Section Two",
    image: { src: null, alt: "Placeholder photo" },
    content: <p>Placeholder text for the second section.</p>,
  },
  {
    title: "Section Three",
    image: { src: null, alt: "Placeholder photo" },
    content: <p>Placeholder text for the third section.</p>,
  },
];

export default function LeatherPage() {
  return (
    <>
      <h1 className="sr-only">Leather</h1>

      <Hero {...HERO} aspect="aspect-[4/3]" />

      <Intro specs={SPECS}>{INTRO}</Intro>

      <Sections sections={SECTIONS} />
    </>
  );
}
