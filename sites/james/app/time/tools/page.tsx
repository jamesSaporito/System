import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section } from "@/components/project-page";

export const metadata: Metadata = { title: "Tools" };

// Page content lives here in code. Text and photos are placeholders for now; when photos are added
// to media/time/tools/, swap each null src for mediaUrl("time/tools/<name>.webp").
const HERO = { src: null, alt: "Placeholder for the watchmaking tools" };

const INTRO = <p>Placeholder paragraph with more detail.</p>;

const SECTIONS: Section[] = [
  {
    title: "K & D Staking Set",
    image: { src: null, alt: "Placeholder for the K & D staking set" },
    content: <p>Placeholder text about the K &amp; D staking set.</p>,
  },
  {
    title: "Seitz Jeweling Tool",
    image: { src: null, alt: "Placeholder for the Seitz jeweling tool" },
    content: <p>Placeholder text about the Seitz jeweling tool.</p>,
  },
  {
    title: "Jacot Lathe",
    image: { src: null, alt: "Placeholder for the Jacot lathe" },
    content: <p>Placeholder text about the Jacot lathe.</p>,
  },
];

export default function ToolsPage() {
  return (
    <>
      <h1 className="sr-only">Tools</h1>

      <Hero {...HERO} aspect="aspect-[4/3]" />

      <Intro>{INTRO}</Intro>

      <Sections sections={SECTIONS} />
    </>
  );
}
