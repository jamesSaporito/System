import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MediaImage } from "@/components/media-image";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Freeform" };

// Page content lives here in code; copy comes from the project's README. Photos are in
// media/freeform/; 00-01.webp is the README's GIF converted to an animated WebP.
const REPO_URL = "https://github.com/jamesSaporito/FreeformClock";

const HERO = {
  src: mediaUrl("freeform/sculpture.webp"),
  alt: "The freeform clock: brass rods soldered into an open frame holding the STM32, a red LED and a DC jack",
};

const SPECS = [
  { label: "Microcontroller", value: "STM32" },
  { label: "Display", value: "One red LED, morse code" },
  { label: "Regulator", value: "3.3V voltage regulator" },
  { label: "Power", value: "5V DC power supply (center positive)" },
  { label: "Structure", value: "K & S Precision Metals brass rods" },
  { label: "Programming", value: "SWD" },
];

/** Inline link styled with the page's accent. */
function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-amber-700 underline decoration-amber-700/30 underline-offset-2 transition-colors hover:decoration-amber-700 dark:text-amber-400 dark:decoration-amber-400/30 dark:hover:decoration-amber-400"
    >
      {children}
    </a>
  );
}

type Section = {
  id: string;
  title: string;
  content: ReactNode;
  /** Optional photo shown under the section's text; 4:3 unless `portrait` (3:4). */
  image?: { src: string; alt: string; portrait?: boolean };
};

const SECTIONS: Section[] = [
  {
    id: "setting-time",
    title: "Setting Time",
    content: (
      <p>
        The only method to set the time is to plug the clock in at midnight. When powered on, the
        RTC starts at <code>00:00</code> in 24 hour time format. There is no way to set the time
        once plugged in.
      </p>
    ),
  },
  {
    id: "programming",
    title: "Programming",
    image: {
      src: mediaUrl("freeform/programming.webp"),
      alt: "Alligator clips attached to the clock's brass rods to program the STM32, the frame held in place with putty",
      portrait: true,
    },
    content: (
      <p>
        It is programmable via SWD and some alligator clips. I positioned several rods far out
        enough to be able to carefully connect to and program the STM32. While this does work,
        it&apos;s quite delicate and very easy to accidentally bend a rod out of place. Best not to
        do this often.
      </p>
    ),
  },
  {
    id: "core-components",
    title: "Core Components",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5 marker:text-amber-600 dark:marker:text-amber-400">
          <li>
            <A href="https://www.st.com/resource/en/datasheet/stm32l010f4.pdf">STM32</A>
          </li>
          <li>
            <A href="https://www.ti.com/lit/ds/symlink/tps7a05.pdf">3.3V voltage regulator</A>
          </li>
          <li>DC Jack</li>
          <li>All necessary decoupling capacitors/etc that would be used in a practical PCB.</li>
          <li>Red LED</li>
          <li>5V DC power supply (center positive)</li>
        </ul>
        <p>
          Everything is soldered together using K &amp; S Precision Metals brass rods. A few
          different sizes were used. The smallest size used was{" "}
          <A href="https://ksmetals.com/products/brrmet-h">0.51mm</A>, which was for soldering
          directly to the pins of the STM32, as well as other small components.{" "}
          <A href="https://ksmetals.com/products/brr-1-32">0.81mm</A> and{" "}
          <A href="https://ksmetals.com/products/br225mm-1h">1.5mm</A> were used for power and
          ground rails, as well as a rigid structure.
        </p>
      </>
    ),
  },
];

export default function FreeformPage() {
  return (
    <>
      <h1 className="sr-only">Freeform Clock</h1>

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
          <p>
            This project was both an experiment and exercise in making something with parts I
            already had. It uses an STM32 and one red LED that tells the time in morse code.
          </p>
          <p>
            Even though it works as intended, it&apos;s not at all reliable as a clock. Due to the
            time consumption of soldering everything in awkward positions, I skipped adding an
            external 32.768kHz crystal that would ensure the RTC is accurate. During testing, I
            observed the duration of &ldquo;one minute&rdquo; is roughly 50 seconds.
          </p>
          <p>
            The inspiration for this came from examples of freeform circuits that intrigued me,
            specifically the works of <A href="https://eirikbrandal.com/">Eirik Brandal</A> and{" "}
            <A href="https://bhoite.com/">Mohit Bhoite</A>.
          </p>
          <p>This is the first one I&apos;ve made, so it&apos;s a bit rough.</p>
        </div>
        <div className="lg:col-span-5">
          <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {SPECS.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-5 gap-4 px-5 py-3">
                <dt className="col-span-2 text-neutral-500 dark:text-neutral-400">{label}</dt>
                <dd className="col-span-3">{value}</dd>
              </div>
            ))}
          </dl>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Schematics and firmware on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* Columns are sized by each photo's width-to-height ratio so both render the same height. */}
      <div className="mt-16 grid items-start gap-6 sm:grid-cols-[7255fr_5627fr]">
        <MediaImage
          src={mediaUrl("freeform/led-on.webp")}
          alt="The clock from above with the red LED lit"
          aspect="aspect-[1596/2200]"
          sizes="(min-width: 640px) 55vw, 100vw"
        />
        <figure>
          <MediaImage
            src={mediaUrl("freeform/00-01.webp")}
            alt="Animation of the LED blinking out 00:01 in morse code"
            aspect="aspect-[480/853]"
            sizes="(min-width: 640px) 45vw, 100vw"
          />
          <figcaption className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            The very first thing you&apos;ll see ~1 minute after powering the clock, which
            translates to 12:01 a.m.
          </figcaption>
        </figure>
      </div>

      {/* Write-up with a table of contents that stays in view on large screens. */}
      <div className="mt-20 grid gap-12 lg:grid-cols-12">
        <nav aria-label="Sections" className="hidden lg:col-span-3 lg:block">
          <ol className="sticky top-8 space-y-1 text-sm">
            {SECTIONS.map(({ id, title }, index) => (
              <li key={id}>
                <a
                  href={`#${id}`}
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
          {SECTIONS.map(({ id, title, content, image }, index) => (
            <section key={id} id={id} className="max-w-3xl scroll-mt-8">
              <p className="text-sm font-medium tracking-widest text-amber-700 tabular-nums dark:text-amber-400">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-neutral-600 dark:text-neutral-400 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-neutral-800">
                {content}
              </div>
              {/* Tall photos are narrowed so they don't run several screens tall. */}
              {image ? (
                <MediaImage
                  src={image.src}
                  alt={image.alt}
                  aspect={image.portrait ? "aspect-[3/4]" : "aspect-[4/3]"}
                  sizes={
                    image.portrait
                      ? "(min-width: 640px) 448px, 100vw"
                      : "(min-width: 1024px) 768px, 100vw"
                  }
                  className={`mt-8 ${image.portrait ? "max-w-md" : ""}`}
                />
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
