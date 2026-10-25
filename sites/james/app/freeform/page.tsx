import type { Metadata } from "next";
import { MediaImage } from "@/components/media-image";
import { A, Hero, Intro, Sections, type Section, type Spec } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Freeform" };

// Page content lives here in code; copy comes from the project's README. Photos are in
// media/freeform/; 00-01.webp is the README's GIF converted to an animated WebP.
const HERO = {
  src: mediaUrl("freeform/sculpture.webp"),
  alt: "The freeform clock: brass rods soldered into an open frame holding the STM32, a red LED and a DC jack",
};

const INTRO = (
  <>
    <p>
      This project was both an experiment and exercise in making something with parts I already had.
      It uses an STM32 and one red LED that tells the time in morse code.
    </p>
    <p>
      Even though it works as intended, it&apos;s not at all reliable as a clock. Due to the time
      consumption of soldering everything in awkward positions, I skipped adding an external
      32.768kHz crystal that would ensure the RTC is accurate. During testing, I observed the
      duration of &ldquo;one minute&rdquo; is roughly 50 seconds.
    </p>
    <p>
      The inspiration for this came from examples of freeform circuits that intrigued me,
      specifically the works of <A href="https://eirikbrandal.com/">Eirik Brandal</A> and{" "}
      <A href="https://bhoite.com/">Mohit Bhoite</A>.
    </p>
    <p>This is the first one I&apos;ve made, so it&apos;s a bit rough.</p>
  </>
);

const SPECS: Spec[] = [
  { label: "Microcontroller", value: "STM32" },
  { label: "Display", value: "One red LED, morse code" },
  { label: "Regulator", value: "3.3V voltage regulator" },
  { label: "Power", value: "5V DC power supply (center positive)" },
  { label: "Structure", value: "K & S Precision Metals brass rods" },
  { label: "Programming", value: "SWD" },
];

const REPO = {
  href: "https://github.com/jamesSaporito/FreeformClock",
  label: "Schematics and firmware on GitHub",
};

const SECTIONS: Section[] = [
  {
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

      <Hero {...HERO} aspect="aspect-[4/3]" />

      <Intro specs={SPECS} repo={REPO}>
        {INTRO}
      </Intro>

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

      <Sections sections={SECTIONS} />
    </>
  );
}
