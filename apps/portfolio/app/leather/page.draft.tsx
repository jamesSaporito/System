import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section, type Spec } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Leather" };

// Page content lives here in code. Photos are in media/leather/; they're portrait, so sections use
// `portrait: true` and the hero shows its photo whole inside the 4:3 frame. This page is a draft
// (page.draft.tsx, and `draft: true` in lib/nav.ts) until it's filled in.
const HERO = {
  src: mediaUrl("leather/bag3.webp"),
  alt: "Front of a dark brown leather bag with a curved flap, brown stitching and a brass tuck lock",
};

const INTRO = (
  <p>
    A small leather bag in dark brown, stitched with a light brown thread. The flap closes with an
    antique brass tuck lock, and two D-rings on the back hold a shoulder strap.
  </p>
);

const SPECS: Spec[] = [
  { label: "Leather", value: "Badalassi Carlo Pueblo" },
  { label: "Thread", value: "Brown" },
  { label: "Hardware", value: "Brass Buckle, D-rings" },
  { label: "Completed", value: "2025" },
];

const SECTIONS: Section[] = [
  {
    title: "Front",
    image: {
      src: mediaUrl("leather/bag1.webp"),
      alt: "The bag standing on a wooden windowsill, showing the flap, tuck lock and stitched edges",
      portrait: true,
    },
    content: (
      <p>
        The flap comes down over the front and fastens with a tuck lock, whose tongue sits on a
        stitched leather tab. The brown stitching runs around the flap, the tab and the edges of the
        bag.
      </p>
    ),
  },
  {
    title: "Back",
    image: {
      src: mediaUrl("leather/bag2.webp"),
      alt: "Back of the bag with two D-rings stitched on leather tabs near the top",
      portrait: true,
    },
    content: (
      <p>
        Two D-rings are stitched to the back on leather tabs, one near each top corner, for
        attaching a strap.
      </p>
    ),
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
