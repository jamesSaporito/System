import type { Metadata } from "next";
import { Hero, Intro, Sections, type Section, type Spec } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Motorcycle" };

// Page content lives here in code. Photos go in sites/james/media/motorcycle/ (resized WebP; keep
// full-size originals in media-originals/) and are uploaded with `pnpm media:push`; reference them
// with mediaUrl("motorcycle/<file>").
// Photos are shown whole, so each frame matches its photo: 4:3 by default, `portrait: true` for 3:4.
const HERO = {
  src: mediaUrl("motorcycle/complete.webp"),
  alt: "The finished 1971 Honda CL350",
};

const INTRO = (
  <p>
    One of the most ambitious projects I&apos;ve taken on is restoring a 1971 Honda CL350. This took
    roughly a year from start to finish, and this image was taken the very last day when I called it
    officially complete. I became very familiar with the entire vehicle, and assembled every single
    bolt down to the smallest screws. My goal with this project was to restore the motorcycle to its
    original state.
  </p>
);

const SPECS: Spec[] = [
  { label: "Model", value: "Honda CL350" },
  { label: "Year", value: "1971" },
  { label: "Completed", value: "September 2019" },
];

const SECTIONS: Section[] = [
  {
    image: {
      src: mediaUrl("motorcycle/day-one.webp"),
      alt: "Workbench covered in bagged, oil-soaked parts from the disassembled bike",
      portrait: true,
    },
    title: "Day One",
    content: (
      <p>
        This was moments after purchasing the bike in the exact state I bought it in. The person I
        bought it from owned the community garage and had it disassembled and stored away. The frame
        was hanging on the wall at this point, and I wouldn&apos;t need it for several months. All
        the parts were wrapped in newspaper inside of labeled plastic bags. Almost all these parts
        were soaked in old oil.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-dirty.webp"),
      alt: "Two pistons caked in decades of carbon buildup",
      portrait: true,
    },
    title: "Pistons",
    content: (
      <p>
        The garage I worked in had a vapor blaster, which is what initially attracted me to this
        place. A vapor blaster is like a sand blaster, but instead of sand it uses fine glass beads
        in water. This is less abrasive than sand and won&apos;t remove the metal, only the grime. I
        chose to start by cleaning the pistons considering they had almost 50 years of carbon build
        up.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-clean.webp"),
      alt: "The same two pistons after vapor blasting, clean bare aluminum",
      portrait: true,
    },
    title: "Results",
    content: (
      <p>
        This is what the same pistons looked like after vapor blasting. I was surprised that it took
        quite a bit longer than I thought to get rid of that carbon build up. But the results were
        worth the effort.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/cleaning-process.webp"),
      alt: "Cleaned engine parts and case halves laid out on a workbench",
    },
    title: "Cleaning Engine Parts",
    content: (
      <p>
        The cleaning process for the engine took about a month. Some parts are required to be
        replaced like the gaskets and piston rings, so those were ordered during that time as well.
        Most of these parts were cleaned with a brush and solvent to remove all the old oil,
        followed by a light coating of a new oil to prevent flash rusting.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/carbs-rebuilt.webp"),
      alt: "The pair of rebuilt carburetors with their original brass floats",
      portrait: true,
    },
    title: "Carburetors",
    content: (
      <p>
        When a motorcycle sits for a long period of time, the leftover gas sitting in the
        carburetors gets extremely thick and sticky. The small holes in the brass tubes need to be
        pristine for the correct mix of oxygen and gas. Fortunately, they were designed to be able
        to replace these parts. However, the circular brass floats are original. It was common for
        them to have small holes that prevented them from actually floating, but these ones were in
        great condition.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/first-assembly.webp"),
      alt: "Open engine case with the kick start shaft installed",
    },
    title: "Kick Starter",
    content: (
      <p>
        This was the very first step for reassembling the engine. This shaft connects to the kick
        start lever, which manually turns over the crank shaft and starts the bike. A backup in case
        the electric starter fails.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/transmission-assembly.webp"),
      alt: "Engine case with the transmission gears and bolts laid out beside it",
      portrait: true,
    },
    title: "Engine Assembly",
    content: (
      <p>
        The next step was adding the transmission, crank shaft, and sealing up the case. I laid
        everything out to move fairly quickly while doing this part. When closing the case you use a
        special sealant that glues it shut. This sealant dries somewhat fast, so you have to get the
        case closed, put all the bolts in the correct location and tighten them to the proper
        torque.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pre-case-seal.webp"),
      alt: "Crank shaft and transmission seated in the lower engine case",
      portrait: true,
    },
    title: "Sealing the Case",
    content: (
      <p>
        With the transmission and crank shaft in place, it was time to close up the case.
        There&apos;s no going back after this without a lot of extra work, so triple-checking
        everything looks good beforehand was a good idea.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/engine-sealed.webp"),
      alt: "Closed engine case with the cam chain resting on top",
      portrait: true,
    },
    title: "Sealed Case",
    content: (
      <p>
        About half of the engine reassembly was complete at this point. The chain seen resting on
        top of the engine case had to avoid slipping in where it was looped through. It&apos;s
        possible to fish it out, but the more parts that go on the harder it gets to do so.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-assembled.webp"),
      alt: "Pistons with new rings fitted to the engine, cam chain alongside",
      portrait: true,
    },
    title: "Pistons Assembled",
    content: (
      <p>
        Both pistons are added with brand new piston rings and a fresh gasket. The cam chain
        tensioner is in place as well.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-test.webp"),
      alt: "Combustion chamber filled with oil to test the valve seal",
      portrait: true,
    },
    title: "Valve Test",
    content: (
      <p>
        In order for the engine to run well, I needed to lap the valves and ensure they made perfect
        contact to the inside of the combustion chamber. The lapping was done by hand. This process
        involves an abrasive compound, and a small plunger that sticks to the inside of the valve
        while it rests in place in its slot. The plunger is held between the palms and you twist
        back and forth to grind away material to create a perfect plane. To test that it is sealed
        properly, the valves are put in place, turned upside down, and oil is poured in. This is
        left to sit for around 24 hours. If any oil leaks through, more lapping is required or even
        a replacement.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-springs.webp"),
      alt: "Cylinder head with the valve springs installed",
    },
    title: "Valve Springs",
    content: (
      <p>
        Last step is to assemble the valve springs and gasket. The top of the case is then put on
        top, and acorn nuts are tightened to specific torque in a specific order.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/engine-complete.webp"),
      alt: "Fully assembled engine with the clutch installed",
      portrait: true,
    },
    title: "Engine Complete",
    content: (
      <p>
        The internals of the engine were officially complete. You can see the clutch was added here
        as well, which was an entire separate process. There are steel discs and friction discs that
        need to be assembled in alternating order, and each disc needs a coat of oil.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/wheels.webp"),
      alt: "Front and rear spoked wheels with new tires",
    },
    title: "Wheels",
    content: (
      <p>
        I had to source several parts, wheels being one of the things I was missing. In hindsight, I
        probably should have relaced these. The tires were replaced, along with the brakes.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/brakes.webp"),
      alt: "Two drum brake assemblies with new brake shoes",
      portrait: true,
    },
    title: "Brakes",
    content: (
      <p>
        Working on this part made me the most nervous. The brakes in this picture are brand new that
        use modern materials. Vintage brakes used asbestos due to its heat resistant properties, so
        during this part I used a respirator for a thorough cleaning.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/forks.webp"),
      alt: "Fork tubes and springs cleaned of rust",
      portrait: true,
    },
    title: "Forks",
    content: (
      <p>
        The forks needed some rust removal. Unfortunately, the rust caused some pitting on one of
        the forks. It wasn&apos;t so severe that they were unusable, just not ideal. I did spend
        some time looking for replacements, but at the time I couldn&apos;t find any. Made the
        decision to use what I had and progress.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/halfway.webp"),
      alt: "Refinished black frame with the engine and wheels installed",
    },
    title: "Halfway Done",
    content: (
      <p>
        Finally starting to see it come alive. I hired a company to refinish the frame since I
        didn&apos;t have the required tools or space to do so. The original paint was quite dull and
        several areas had some light rust. They sand blasted it clean, including some other parts,
        and repainted.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pipes.webp"),
      alt: "Pair of chrome scrambler exhaust pipes on a workbench",
    },
    title: "Scrambler Exhaust Pipes",
    content: (
      <p>
        This was by far my favorite part to receive. The exhaust pipes for this model were difficult
        to find in decent original condition. It was (still is?) popular to convert this type of
        bike into a &apos;cafe racer,&apos; which sometimes means the pipes would be cut right
        before the muffler. If they haven&apos;t been cut then you&apos;re hoping they aren&apos;t
        heavily rusted or dented from falls. I was lucky to find a nice pair with very minimal
        damage or rust, and with the chrome in great condition.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/electrical.webp"),
      alt: "Headlight and front forks with the new wiring harness",
      portrait: true,
    },
    title: "Wiring Harness",
    content: (
      <p>
        I ordered a brand new wiring harness that matched the original. If I had the chance to redo
        this part I might go a more custom route. The harness works fine, but the connectors
        aren&apos;t the best. The reason I avoided the custom route was mostly due to how much time
        it would take, plus the cost for good connectors added up quick. The wiring gets pretty
        congested near the handlebars, and you have to arrange the free hanging wires into the
        hollow cavity of the headlight. Part of the wires need to be threaded through the handlebars
        and it&apos;s a pretty tight fit.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/almost-done.webp"),
      alt: "The red CL350 nearly complete on a motorcycle lift",
    },
    title: "Almost Done",
    content: (
      <p>
        There are a lot more things I could talk about up to this point, but I will summarize. I
        sourced fenders, tail light, turn signals, gas tank, mirrors, air filters and covers, intake
        manifolds, drive chain, bolts/nuts/screws, a brand new seat, and many more parts.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/complete.webp"),
      alt: "The finished CL350 outside in daylight",
    },
    title: "Last Day",
    content: (
      <p>
        Finally out of the garage seeing daylight again. I honestly really haven&apos;t spent much
        time riding motorcycles, but I did get it up to 60 MPH for a brief moment. That was fast
        enough for me and confirmation that the project was a success. I&apos;ve since retired from
        riding motorcycles altogether.
      </p>
    ),
  },
];

export default function MotorcyclePage() {
  return (
    <>
      <h1 className="sr-only">Motorcycle</h1>

      <Hero {...HERO} aspect="aspect-[4/3]" />

      <Intro specs={SPECS}>{INTRO}</Intro>

      <Sections sections={SECTIONS} />
    </>
  );
}
