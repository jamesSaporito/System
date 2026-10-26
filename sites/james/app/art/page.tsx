import type { Metadata } from "next";
import { Sections, type Section } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Art" };

// Page content lives here in code. Photos are in media/art/; each frame matches its piece's
// proportions so the whole piece shows, and portrait pieces are narrowed.
const SECTIONS: Section[] = [
  {
    title: "House",
    image: {
      src: mediaUrl("art/house.webp"),
      alt: "Painting of a thatched stone cottage on a quiet lane, beneath a large tree and flowering shrubs",
      aspect: "aspect-[2860/2851]",
    },
  },
  {
    title: "Winter",
    image: {
      src: mediaUrl("art/winter.webp"),
      alt: "Painting of a wooden house after a light snow, with yellow forsythia in the foreground and a stone path to the porch",
      aspect: "aspect-[2803/3360]",
      portrait: true,
    },
  },
  {
    title: "Bird",
    image: {
      src: mediaUrl("art/bird.webp"),
      alt: "Painting of a European robin on a frosted perch against a soft green and gold background",
      aspect: "aspect-[3353/2684]",
    },
  },
  {
    title: "Perspective",
    image: {
      src: mediaUrl("art/perspective.webp"),
      alt: "Ink and watercolor fisheye sketch of a New York intersection across two sketchbook pages, dated November 20th, 2023, 76th and 1st",
      aspect: "aspect-[3929/2692]",
    },
  },
  {
    title: "Bold and Brash",
    image: {
      src: mediaUrl("art/bold-and-brash.webp"),
      alt: "Recreation of Squidward's painting Bold and Brash: a green figure against a loose orange background",
      aspect: "aspect-[2689/3374]",
      portrait: true,
    },
  },
];

export default function ArtPage() {
  return (
    <>
      <h1 className="sr-only">Art</h1>

      <Sections sections={SECTIONS} first />
    </>
  );
}
