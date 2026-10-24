import type { Metadata } from "next";
import { MediaImage } from "@/components/media-image";
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

const DESCRIPTION = [
  "One of the most ambitious projects I've taken on is restoring a 1971 Honda CL350. This took roughly a year from start to finish, " +
    "and this image was taken the very last day when I called it officially complete. I became very familiar with the entire vehicle, " +
    "and assembled every single bolt down to the smallest screws. My goal with this project was to restore the motorcycle to its original state.",
];

const SECTIONS = [
  {
    image: {
      src: mediaUrl("motorcycle/day-one.webp"),
      alt: "Workbench covered in bagged, oil-soaked parts from the disassembled bike",
      portrait: true,
    },
    title: "Day One",
    body:
      "This was moments after purchasing the bike in the exact state I bought it in. The person I bought it from owned the community " +
      "garage and had it disassembled and stored away. The frame was hanging on the wall at this point, and I wouldn't need it for several months. " +
      "All the parts were wrapped in newspaper inside of labeled plastic bags. Almost all these parts were soaked in old oil.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-dirty.webp"),
      alt: "Two pistons caked in decades of carbon buildup",
      portrait: true,
    },
    title: "Pistons",
    body:
      "The garage I worked in had a vapor blaster, which is what initially attracted me to this place. A vapor blaster " +
      "is like a sand blaster, but instead of sand it uses fine glass beads in water. This is less abrasive than sand and won't remove the metal, only the grime. " +
      "I chose to start by cleaning the pistons considering they had almost 50 years of carbon build up.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-clean.webp"),
      alt: "The same two pistons after vapor blasting, clean bare aluminum",
      portrait: true,
    },
    title: "Results",
    body:
      "This is what the same pistons looked like after vapor blasting. I was surprised that it took quite a bit longer than I thought to get rid of that carbon build up. " +
      "But the results were worth the effort.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/cleaning-process.webp"),
      alt: "Cleaned engine parts and case halves laid out on a workbench",
    },
    title: "Cleaning Engine Parts",
    body:
      "The cleaning process for the engine took about a month. Some parts are required to be replaced like the gaskets and piston rings, so those were ordered during " +
      "that time as well. Most of these parts were cleaned with a brush and solvent to remove all the old oil, followed by a light coating of a new oil to prevent flash rusting.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/carbs-rebuilt.webp"),
      alt: "The pair of rebuilt carburetors with their original brass floats",
      portrait: true,
    },
    title: "Carburetors",
    body:
      "When a motorcycle sits for a long period of time, the leftover gas sitting in the carburetors gets extremely thick and sticky. The small holes in the brass tubes need to be pristine for " +
      "the correct mix of oxygen and gas. Fortunately, they were designed to be able to replace these parts. However, the circular brass floats are original. It was common for them to " +
      "have small holes that prevented them from actually floating, but these ones were in great condition.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/first-assembly.webp"),
      alt: "Open engine case with the kick start shaft installed",
    },
    title: "Kick Starter",
    body:
      "This was the very first step for reassembling the engine. This shaft connects to the kick start lever, which manually turns over the crank shaft and starts the bike. " +
      "A backup in case the electric starter fails.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/transmission-assembly.webp"),
      alt: "Engine case with the transmission gears and bolts laid out beside it",
      portrait: true,
    },
    title: "Engine Assembly",
    body:
      "The next step was adding the transmission, crank shaft, and sealing up the case. I laid everything out to move fairly quickly while doing this part. " +
      "When closing the case you use a special sealant that glues it shut. This sealant dries somewhat fast, so you have to get the case closed, put all " +
      "the bolts in the correct location and tighten them to the proper torque.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/pre-case-seal.webp"),
      alt: "Crank shaft and transmission seated in the lower engine case",
      portrait: true,
    },
    title: "Sealing the Case",
    body:
      "With the transmission and crank shaft in place, it was time to close up the case. There's no going back after this without a lot of extra work, so triple-" +
      "checking everything looks good beforehand was a good idea.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/engine-sealed.webp"),
      alt: "Closed engine case with the cam chain resting on top",
      portrait: true,
    },
    title: "Sealed Case",
    body:
      "About half of the engine reassembly was complete at this point. The chain seen resting on top of the engine case had to avoid slipping in where it was looped through. It's possible " +
      "to fish it out, but the more parts that go on the harder it gets to do so.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/pistons-assembled.webp"),
      alt: "Pistons with new rings fitted to the engine, cam chain alongside",
      portrait: true,
    },
    title: "Pistons Assembled",
    body: "Both pistons are added with brand new piston rings and a fresh gasket. The cam chain tensioner is in place as well.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-test.webp"),
      alt: "Combustion chamber filled with oil to test the valve seal",
      portrait: true,
    },
    title: "Valve Test",
    body:
      "In order for the engine to run well, I needed to lap the valves and ensure they made perfect contact to the inside of the combustion chamber. " +
      "The lapping was done by hand. This process involves an abrasive compound, and a small plunger that sticks to the inside of the valve while it rests in place " +
      "in its slot. The plunger is held between the palms and you twist back and forth to grind away material to create a perfect plane. To test that it is sealed properly, " +
      "the valves are put in place, turned upside down, and oil is poured in. This is left to sit for around 24 hours. If any oil leaks through, more lapping is required or even a replacement.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/valve-springs.webp"),
      alt: "Cylinder head with the valve springs installed",
    },
    title: "Valve Springs",
    body: "Last step is to assemble the valve springs and gasket. The top of the case is then put on top, and acorn nuts are tightened to specific torque in a specific order.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/engine-complete.webp"),
      alt: "Fully assembled engine with the clutch installed",
      portrait: true,
    },
    title: "Engine Complete",
    body:
      "The internals of the engine were officially complete. You can see the clutch was added here as well, which was an entire separate process. " +
      "There are steel discs and friction discs that need to be assembled in alternating order, and each disc needs a coat of oil.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/wheels.webp"),
      alt: "Front and rear spoked wheels with new tires",
    },
    title: "Wheels",
    body:
      "I had to source several parts, wheels being one of the things I was missing. In hindsight, I probably should have relaced these. The tires were " +
      "replaced, along with the brakes.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/brakes.webp"),
      alt: "Two drum brake assemblies with new brake shoes",
      portrait: true,
    },
    title: "Brakes",
    body:
      "Working on this part made me the most nervous. The brakes in this picture are brand new that use modern materials. Vintage brakes used " +
      "asbestos due to its heat resistant properties, so during this part I used a respirator for a thorough cleaning.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/forks.webp"),
      alt: "Fork tubes and springs cleaned of rust",
      portrait: true,
    },
    title: "Forks",
    body:
      "The forks needed some rust removal. Unfortunately, the rust caused some pitting on one of the forks. " +
      "It wasn't so severe that they were unusable, just not ideal. I did spend some time looking for replacements, but at the time " +
      "I couldn't find any. Made the decision to use what I had and progress.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/halfway.webp"),
      alt: "Refinished black frame with the engine and wheels installed",
    },
    title: "Halfway Done",
    body:
      "Finally starting to see it come alive. I hired a company to refinish the frame since I didn't have the required tools or space to do so. " +
      "The original paint was quite dull and several areas had some light rust. They sand blasted it clean, including some other parts, and repainted.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/pipes.webp"),
      alt: "Pair of chrome scrambler exhaust pipes on a workbench",
    },
    title: "Scrambler Exhaust Pipes",
    body:
      "This was by far my favorite part to receive. The exhaust pipes for this model were difficult to find in decent original condition. " +
      "It was (still is?) popular to convert this type of bike into a 'cafe racer,' which sometimes means the pipes would be cut right before the " +
      "muffler. If they haven't been cut then you're hoping they aren't heavily rusted or dented from falls. I was lucky to find a nice pair with very minimal damage or rust, " +
      "and with the chrome in great condition.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/electrical.webp"),
      alt: "Headlight and front forks with the new wiring harness",
      portrait: true,
    },
    title: "Wiring Harness",
    body:
      "I ordered a brand new wiring harness that matched the original. If I had the chance to redo this part I might go a more custom route. " +
      "The harness works fine, but the connectors aren't the best. The reason I avoided the custom route was mostly due to how much time it would take, plus the cost for " +
      "good connectors added up quick. The wiring gets pretty congested near the handlebars, and you have to arrange the free hanging wires " +
      "into the hollow cavity of the headlight. Part of the wires need to be threaded through the handlebars and it's a pretty tight fit.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/almost-done.webp"),
      alt: "The red CL350 nearly complete on a motorcycle lift",
    },
    title: "Almost Done",
    body:
      "There are a lot more things I could talk about up to this point, but I will summarize. I sourced fenders, tail light, turn signals, " +
      "gas tank, mirrors, air filters and covers, intake manifolds, drive chain, bolts/nuts/screws, a brand new seat, and many more parts.",
  },
  {
    image: {
      src: mediaUrl("motorcycle/complete.webp"),
      alt: "The finished CL350 outside in daylight",
    },
    title: "Last Day",
    body:
      "Finally out of the garage seeing daylight again. I honestly really haven't spent much time riding motorcycles, but I did get it up to 60 MPH for a brief moment. " +
      "That was fast enough for me and confirmation that the project was a success. I've since retired from riding motorcycles altogether.",
  },
];

// Dates are from the first (day-one) and last (complete) photos.
const SPECS = [
  { label: "Model", value: "Honda CL350" },
  { label: "Year", value: "1971" },
  { label: "Start date", value: "September 15, 2018" },
  { label: "End date", value: "July 3, 2019" },
];

// // The two photos not used in any section; both are tall (3:4).
// const GALLERY = [
//   {
//     src: mediaUrl("motorcycle/shifting.webp"),
//     alt: "Shift forks and drum seated inside the open engine case",
//   },
//   {
//     src: mediaUrl("motorcycle/steering.webp"),
//     alt: "Steering stem, top bridge and handlebar clamps laid out on a shop towel",
//   },
// ];

/** "Sealing the Case" → "sealing-the-case", for the table of contents anchors. */
function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function MotorcyclePage() {
  return (
    <>
      <h1 className="sr-only">Motorcycle</h1>

      <MediaImage
        {...HERO}
        eager
        aspect="aspect-[4/3]"
        sizes="(min-width: 1280px) 1184px, 100vw"
        className="mt-6 motion-safe:animate-fade-in"
      />

      {/* Intro beside a spec sheet; stacked on phones. */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-4 text-lg leading-relaxed lg:col-span-7">
          {DESCRIPTION.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="self-start divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm lg:col-span-5 dark:divide-neutral-800 dark:border-neutral-800">
          {SPECS.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-5 gap-4 px-5 py-3">
              <dt className="col-span-2 text-neutral-500 dark:text-neutral-400">{label}</dt>
              <dd className="col-span-3">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {GALLERY.map((image) => (
          <MediaImage
            key={image.src}
            {...image}
            aspect="aspect-[3/4]"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
        ))}
      </div> */}

      {/* Write-up with a table of contents that stays in view on large screens. */}
      <div className="mt-20 grid gap-12 lg:grid-cols-12">
        <nav aria-label="Sections" className="hidden lg:col-span-3 lg:block">
          <ol className="sticky top-8 space-y-1 text-sm">
            {SECTIONS.map(({ title }, index) => (
              <li key={title}>
                <a
                  href={`#${slug(title)}`}
                  className="flex gap-3 rounded-md px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                >
                  <span className="text-amber-700 tabular-nums dark:text-amber-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-16 lg:col-span-9">
          {SECTIONS.map(({ title, body, image }, index) => {
            const portrait = "portrait" in image && image.portrait;
            return (
              <section key={title} id={slug(title)} className="max-w-3xl scroll-mt-8">
                <p className="text-sm font-medium tracking-widest text-amber-700 tabular-nums dark:text-amber-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
                <div className="mt-4 space-y-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
                  <p>{body}</p>
                </div>
                {/* Tall photos are narrowed so they don't run several screens tall. */}
                <MediaImage
                  src={image.src}
                  alt={image.alt}
                  aspect={portrait ? "aspect-[3/4]" : "aspect-[4/3]"}
                  sizes={
                    portrait
                      ? "(min-width: 640px) 448px, 100vw"
                      : "(min-width: 1024px) 768px, 100vw"
                  }
                  className={`mt-8 ${portrait ? "max-w-md" : ""}`}
                />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
