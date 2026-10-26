import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Tools" };

// Page content lives here in code. Photos are in media/time/tools/.
const HERO = {
  src: mediaUrl("time/tools/jacot-lathe.webp"),
  alt: "The Jacot tool in its red-lined wooden case, with its runners and burnisher laid out beside the bed",
};

const INTRO = (
  <p>
    These are some tools used to service vintage watches. Most of the work happens at a scale where
    fingers aren&apos;t precise enough, so each tool exists to hold, align, or press a part exactly
    where it needs to go.
  </p>
);

const SECTIONS: Section[] = [
  {
    title: "Staking",
    images: [
      {
        src: mediaUrl("time/tools/staking-set.webp"),
        alt: "The K & D staking set open in its dovetailed wooden case, rows of punches on either side of the frame",
        portrait: true,
      },
      {
        src: mediaUrl("time/tools/staking-set-example.webp"),
        alt: "The staking frame out of its case, a punch held in the guide above the die plate",
        portrait: true,
      },
      {
        src: mediaUrl("time/tools/staking-set-example-alignment.webp"),
        alt: "A pointed punch above a hollow stake standing in the die plate",
        portrait: true,
      },
      {
        src: mediaUrl("time/tools/staking-set-example-alignment-2.webp"),
        alt: "The punch lowered into the hollow stake, lined up with the hole beneath it",
        portrait: true,
      },
    ],
    content: (
      <>
        <p>
          A staking set is a small press for parts that have to go on or come off perfectly
          straight. The frame in the middle of the case holds a punch in a vertical guide, directly
          above a die plate, which is a hardened disc that rotates to bring holes of many sizes under the
          punch. This type of staking set is called an inverto, which means you can flip over a punch and
          use it as a stump.
        </p>
        <p>
          The rest of the case holds the set&apos;s punches and stumps, in rows on either side and
          along the front. Before pressing, the chosen hole is centered and the plate is locked, so the
          punch comes down exactly where it should.
        </p>
      </>
    ),
  },
  {
    title: "Jeweling",
    images: [
      {
        src: mediaUrl("time/tools/seitz.webp"),
        alt: "The Seitz jeweling tool in its case: a black crackle-finish press with a chrome lever, above the red accessory block",
        portrait: true,
      },
      {
        src: mediaUrl("time/tools/seitz-pieces.webp"),
        alt: "The Seitz accessory block: red rows of anvils, reamers and pushers, each labeled",
      },
    ],
    content: (
      <>
        <p>
          The pivots of a watch&apos;s wheels turn in jewels, synthetic rubies that are friction fit
          into the plates and bridges. The Seitz tool is a press made for setting them. The lever
          drives a pusher straight down through the frame, and the knurled collar on top sets how
          far it can travel, so a jewel can be moved in very small, repeatable steps. There are a
          variety of anvils to support the plate from below, reamers to open up a hole, and pushers
          to press on the jewel itself.
        </p>
      </>
    ),
    subsections: [
      {
        title: "Straightener",
        image: {
          src: mediaUrl("time/tools/seitz-pivot-straightener.webp"),
          alt: "The Seitz pivot straightener: a knurled disc with numbered holes and a spring arm held by a thumbscrew",
          portrait: true,
        },
        content: (
          <>
            <p>
              A bent pivot can sometimes be saved rather than replaced. The straightener&apos;s disc
              has a ring of numbered holes in graded sizes: the pivot goes into the closest fit, and
              the spring arm holds the part steady while it&apos;s eased back into line.
            </p>
            <p>
              However, many people have called these pivot breakers. The tool is somewhat unreliable,
              and only works in the least severe cases.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Jacot",
    content: (
      <>
        <p>
          A Jacot tool finishes pivots, the fine ends of the wheels. The pivot rests in a
          grooved bed and the wheel is turned back and forth while a burnisher is drawn across the pivot.
          This polishes and hardens the pivot, so it turns with the least amount of friction possible.
        </p>
      </>
    ),
    subsections: [
      {
        title: "Scale",
        image: {
          src: mediaUrl("time/tools/lanterns.webp"),
          alt: "Two small steel lanterns on a wooden bench next to a ballpoint pen",
          portrait: true,
        },
        content: (
          <>
            <p>
              When polishing the end of a pivot, a lantern is used so the burnisher can reach the very end.
              The end of the balance staff pivot has to have a slight roundness to it so it rotates with very
              little friction. Lanterns come in different sizes to suit different pivot sizes. The two here are
              shown next to a pen for scale.
            </p>
          </>
        ),
      },
    ],
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
