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
    One of the most ambitious projects I&apos;ve taken on was restoring a 1971 Honda CL350. It took
    roughly a year from start to finish, and this photo was taken on the very last day, when I
    called it officially complete. I got to know the entire bike and reassembled every part of it,
    down to the smallest screws. My goal was to restore the motorcycle to its original state.
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
    title: "Start",
    content: (
      <p>
        This was moments after I bought the bike, in the exact state I got it. The person I bought
        it from owned the community garage, and had taken it apart and stored it away. The frame was
        hanging on the wall at this point, and I wouldn&apos;t need it for several months. All the
        parts were wrapped in newspaper inside labeled plastic bags, and almost all of them were
        soaked in old oil.
      </p>
    ),
  },
  {
    images: [
      {
        src: mediaUrl("motorcycle/pistons-dirty.webp"),
        alt: "Two pistons caked in decades of carbon buildup",
        portrait: true,
      },
      {
        src: mediaUrl("motorcycle/pistons-clean.webp"),
        alt: "The same two pistons after vapor blasting, clean bare aluminum",
        portrait: true,
      },
    ],
    title: "Pistons",
    content: (
      <>
        <p>
          The garage I worked in had a vapor blaster, which is is like a sandblaster, but instead of
          sand it uses fine glass beads in water. It&apos;s less abrasive than sand and won&apos;t
          remove metal, only the grime. I started with the pistons, since they had almost 50 years
          of carbon buildup. You can see the results after vapor blasting.
        </p>
      </>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/cleaning-process.webp"),
      alt: "Cleaned engine parts and case halves laid out on a workbench",
    },
    title: "Cleaning",
    content: (
      <p>
        Cleaning the engine took about a month. Some parts, like the gaskets and piston rings, have
        to be replaced, so I ordered those in the meantime. Most parts were cleaned with a brush and
        solvent to remove all the old oil, then given a light coat of fresh oil to prevent flash
        rust.
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
        The gas left in the carburetors can turn thick and
        sticky over a long period of time. The tiny holes in the brass jets need to be spotless to get the right mix of air and
        fuel. Fortunately, those parts were designed to be replaceable. The round brass floats,
        however, are original. It was common for them to develop small holes that kept them from
        actually floating, but these were in great condition.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/first-assembly.webp"),
      alt: "Open engine case with the kick start shaft installed",
    },
    title: "Kick",
    content: (
      <p>
        This was the very first step in reassembling the engine. This shaft connects to the kick
        start lever, which turns the crankshaft over by hand to start the bike: a backup in case the
        electric starter fails.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/transmission-assembly.webp"),
      alt: "Engine case with the transmission gears and bolts laid out beside it",
      portrait: true,
    },
    title: "Transmission",
    content: (
      <p>
        Next came the transmission and crankshaft, and then sealing up the case. I laid everything
        out beforehand so I could move fairly quickly. The case is closed with a special sealant
        that glues it shut, and it dries fairly fast, so you have to get the case closed, put every
        bolt in the right place, and tighten them all to the proper torque before it sets.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pre-case-seal.webp"),
      alt: "Crank shaft and transmission seated in the lower engine case",
      portrait: true,
    },
    title: "Sealing",
    content: (
      <p>
        With the transmission and crankshaft in place, it was time to close up the case.
        There&apos;s no going back after this without a lot of extra work, so triple-checking
        everything beforehand was a good idea.
      </p>
    ),
  },
  {
    images: [
      {
        src: mediaUrl("motorcycle/engine-sealed.webp"),
        alt: "Closed engine case with the cam chain resting on top",
        portrait: true,
      },
      {
        src: mediaUrl("motorcycle/pistons-assembled.webp"),
        alt: "Pistons with new rings fitted to the engine, cam chain alongside",
        portrait: true,
      },
    ],
    title: "Sealed",
    content: (
      <>
        <p>
          About half of the engine reassembly was done at this point. The chain resting on top of
          the case had to be kept from slipping back down where it loops through. It&apos;s possible
          to fish it out, but the more parts that go on, the harder that gets.
        </p>
        <p>
          Next, both pistons went on with brand new rings and a fresh gasket, along with the cam
          chain tensioner.
        </p>
      </>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-test.webp"),
      alt: "Combustion chamber filled with oil to test the valve seal",
      portrait: true,
    },
    title: "Valves",
    content: (
      <p>
        For the engine to run well, the valves had to be lapped so they make perfect contact with
        their seats in the combustion chamber. I lapped them by hand, using an abrasive compound and
        a small suction-cup tool that sticks to the face of the valve while it sits in place. You
        hold the tool between your palms and twist back and forth, grinding away material until the
        valve and seat match perfectly. To test the seal, the head is turned upside down with the
        valves in place and filled with oil, then left for around 24 hours. If any oil leaks
        through, the valve needs more lapping, or even replacing.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-springs.webp"),
      alt: "Cylinder head with the valve springs installed",
    },
    title: "Springs",
    content: (
      <p>
        The last step was installing the valve springs and gasket. The top of the case then goes on,
        and its acorn nuts are tightened to a specific torque in a specific order.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/engine-complete.webp"),
      alt: "Fully assembled engine with the clutch installed",
      portrait: true,
    },
    title: "Engine",
    content: (
      <p>
        The engine internals were officially complete. You can see the clutch went in here too,
        which was a whole separate process: steel discs and friction discs are stacked in
        alternating order, and each one needs a coat of oil.
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
        I had to source several parts, and the wheels were one of the things I was missing. In
        hindsight, I probably should have relaced them. The tires were replaced, along with the
        brakes.
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
        This part made me the most nervous. The brakes in this picture are brand new and use modern
        materials, but vintage brakes used asbestos for its heat resistance. A respirator was worn
        while giving everything a thorough cleaning.
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
        The forks needed some rust removed, and unfortunately the rust had left some pitting on one of
        them. It wasn&apos;t bad enough to make them unusable, just not ideal. I spent some time
        looking for replacements but couldn&apos;t find any at the time.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/halfway.webp"),
      alt: "Refinished black frame with the engine and wheels installed",
    },
    title: "Halfway",
    content: (
      <p>
        Finally starting to see it come alive. I hired a company to refinish the frame, since I
        didn&apos;t have the tools or the space to do it myself. The original paint was quite dull,
        and several areas had some light rust. They sandblasted it clean, along with a few other
        parts, and repainted everything.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/pipes.webp"),
      alt: "Pair of chrome scrambler exhaust pipes on a workbench",
    },
    title: "Exhaust",
    content: (
      <p>
        This was by far my favorite part to receive. Exhaust pipes for this model were hard to find
        in decent original condition. It was (still is?) popular to convert this kind of bike into a
        &lsquo;cafe racer,&rsquo; which sometimes means cutting the pipes right at the muffler.
        Even if they haven&apos;t been cut, you&apos;re hoping they aren&apos;t badly rusted or
        dented from falls. I was lucky to find a nice pair with very little damage or rust, and the
        chrome in great condition.
      </p>
    ),
  },
  {
    image: {
      src: mediaUrl("motorcycle/electrical.webp"),
      alt: "Headlight and front forks with the new wiring harness",
      portrait: true,
    },
    title: "Wiring",
    content: (
      <p>
        I ordered a brand new wiring harness that matched the original. If I could redo this part, I
        might go a more custom route. The harness works fine, but the connectors aren&apos;t the
        best. I avoided going custom mostly because of how much time it would take, and the cost of
        good connectors adds up quickly. The wiring gets pretty congested near the handlebars, where
        the loose wires have to be tucked into the hollow of the headlight, and some of them are
        threaded through the handlebars themselves.
      </p>
    ),
  },
  {
    images: [
      {
        src: mediaUrl("motorcycle/almost-done.webp"),
        alt: "The red CL350 nearly complete on a motorcycle lift",
      },
      {
        src: mediaUrl("motorcycle/complete.webp"),
        alt: "The finished CL350 outside in daylight",
      },
    ],
    title: "Complete",
    content: (
      <>
        <p>
          There&apos;s a lot more I could talk about up to this point, but I&apos;ll summarize. I
          sourced the fenders, tail light, turn signals, gas tank, mirrors, air filters and covers,
          intake manifolds, drive chain, bolts, nuts and screws, a brand new seat, and many more
          parts.
        </p>
        <p>
          Finally out of the garage and seeing daylight again. Honestly, I haven&apos;t spent much
          time riding motorcycles, but I did get it up to 60 MPH for a brief moment. That was fast
          enough for me, and confirmation that the project was a success. I&apos;ve since retired
          from riding motorcycles altogether.
        </p>
      </>
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
