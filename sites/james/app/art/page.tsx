import type { Metadata } from "next";
import { Sections, type Section } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Art" };

// Page content lives here in code. Photos are in media/art/; each frame matches its piece's
// proportions so the whole piece shows. Portrait pieces are narrowed less than on other pages, so
// they come out close in size to the landscape ones.
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
      width: "max-w-xl",
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
    title: "Woods",
    image: {
      src: mediaUrl("art/woods.webp"),
      alt: "Painting of a dirt path winding through a spring wood, with bluebells under the trees and a fallen branch in sunlight",
      aspect: "aspect-[2893/2853]",
    },
  },
  {
    title: "Park",
    image: {
      src: mediaUrl("art/park.webp"),
      alt: "Painting of a still brown river between leafy trees under a clear blue sky, with grass and grey rocks in the foreground",
      aspect: "aspect-[2868/3381]",
      portrait: true,
      width: "max-w-xl",
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
