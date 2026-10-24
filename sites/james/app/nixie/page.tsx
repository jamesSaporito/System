import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MediaImage } from "@/components/media-image";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Nixie" };

const REPO_URL = "https://github.com/jamesSaporito/NixieClock";

const HERO = {
  src: mediaUrl("nixie/front.webp"),
  alt: "The nixie clock from the front, its four orange tubes reading 03:00",
};

const GALLERY = [
  {
    src: mediaUrl("nixie/angle.webp"),
    alt: "The clock from the right, showing the angled face of the black enclosure",
  },
  {
    src: mediaUrl("nixie/above.webp"),
    alt: "The clock from the left, glowing tubes set into the sloped front",
  },
];

const SPECS = [
  { label: "Display", value: "Four IN-12A nixie tubes" },
  { label: "Tube voltage", value: "~170 V DC from an NCH8200HV module" },
  { label: "Board voltage", value: "9V DC" },
  { label: "Tube drivers", value: "Four K155ID1 ICs, one per tube" },
  { label: "Microcontroller", value: "STM32L010K4T6" },
  { label: "Timekeeping", value: "RTC with a 32.768 kHz crystal" },
  { label: "Controls", value: "Hour and minute buttons, power switch" },
];

/** Inline link styled with the page's nixie-orange accent. */
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
  /** Optional photo shown under the section's text. */
  image?: { src: string; alt: string };
};

const SECTIONS: Section[] = [
  {
    id: "core-components",
    title: "Core Components",
    content: (
      <>
        <p>
          Four IN-12A nixie tubes are used, which require ~170V DC to illuminate. The{" "}
          <A href="https://omnixie.com/products/nch8200hv-nixie-hv-power-module">NCH8200HV</A> is
          used to generate this voltage. The mechanical switch cuts power from this module, which
          allows the tubes to be turned off.
        </p>
        <p>
          The nixie tubes are driven from four{" "}
          <A href="https://tubehobby.com/datasheets/k155id1.pdf">K155ID1</A> ICs, one IC per tube.
          These are very obsolete, but were made specifically to drive nixie tubes.
        </p>
        <p>
          The microcontroller used for this project is the{" "}
          <A href="https://www.st.com/en/microcontrollers-microprocessors/stm32l010k4.html">
            STM32L010K4T6
          </A>
          , an Arm Cortex-M0+ MCU. The RTC is used along with an external 32.768 kHz crystal to keep
          accurate time. Based on the one I&apos;ve built, it consistently gains around two seconds
          per day.
        </p>
      </>
    ),
  },
  {
    id: "pcb",
    title: "PCB",
    content: (
      <>
        <p>The PCBs were designed using KiCad in two separate projects.</p>
        <p>
          There are two PCBs, the main board and the tube board. The main board is where all the
          main components live (MCU, ICs, capacitors, etc.). The tube board is specifically for the
          tube sockets to be soldered to, and then the tubes to plug into those. The main board and
          tube board plug into each other via header pins. The male header pins are soldered to one
          board, and the female to the other. This is how the current flows from the main board to
          the tube board. It also allows the PCBs to be disassembled if necessary.
        </p>
        <p>
          The tubes should not be directly soldered to the PCB. Instead, solder tube sockets to the
          PCB, then plug the tubes into those. This will allow replacement of a tube if one breaks.
        </p>
      </>
    ),
  },
  {
    id: "enclosure",
    title: "Enclosure",
    image: {
      src: mediaUrl("nixie/side.webp"),
      alt: "Side profile of the enclosure, a low wedge that rises to the angled tube face",
    },
    content: (
      <>
        <p>
          The enclosure is 3D printed, and the parts require threaded brass inserts for the screws
          to secure everything. There are currently two versions of the enclosure.
        </p>
        <p>
          <strong className="font-medium text-neutral-900 dark:text-neutral-100">V1</strong>{" "}
          Original design. PCB spacers are used for additional support between the boards to
          minimize stress on the header pins that connect the tube board to the main board.
        </p>
        <p>
          <strong className="font-medium text-neutral-900 dark:text-neutral-100">V2</strong>{" "}
          Inspired from Dieter Rams&apos;s design of the Braun DN40. Four screws (top two alone are
          enough) can be used to secure the tube board to the PCB mount. Easy to tap/screw directly
          into the plastic.
        </p>
      </>
    ),
  },
  {
    id: "firmware",
    title: "Firmware",
    content: (
      <>
        <p>
          The firmware is a standard STM32 project set up using CLion and its integration with
          STM32CubeMX.
        </p>
        <p>
          The only important thing to keep some form of is the <code>cycle()</code> function. All
          this does is cycle through each number on every tube, which is supposed to prevent cathode
          poisoning. Unsure how effective this is at the current frequency and duration.
        </p>
        <p>
          In order to avoid additional hardware, a{" "}
          <A href="https://www.tag-connect.com/product/tc2030-idc-6-pin-tag-connect-plug-of-nails-spring-pin-cable-with-legs">
            Tag-Connect
          </A>{" "}
          footprint is used on the main board. This is used with an{" "}
          <A href="https://www.st.com/en/development-tools/st-link-v2.html">ST-LINK</A> device
          (clones should work just fine) to program the MCU.
        </p>
        <p>
          Unfortunately, using <A href="https://github.com/stlink-org/stlink">stlink</A>{" "}
          doesn&apos;t seem to work with{" "}
          <A href="https://github.com/stlink-org/stlink/issues/1203">several STM32L0xxx MCUs</A>. To
          get around this, the project can be opened up in STM32CubeIDE and flashed using the built
          in debugging functionality. Not ideal, but it works. Update: It looks like this issue was
          fixed, I have not had time to test it out.
        </p>
      </>
    ),
  },
  {
    id: "design-flaws",
    title: "Design Flaws",
    content: (
      <ul className="list-disc space-y-3 pl-5 marker:text-amber-600 dark:marker:text-amber-400">
        <li>
          Due to the PCB using a Tag-Connect footprint for programming, the enclosure design pretty
          much requires the MCU to be programmed prior to assembling everything. If there is a
          desire to upload different firmware, then it will mostly have to be taken apart.
        </li>
        <li>
          The DC jack that was used for this design requires to be mounted prior to soldering the
          wires to it. This restricts the enclosure from being completely removed without cutting
          the wires to this jack.
        </li>
      </ul>
    ),
  },
];

export default function NixiePage() {
  return (
    <>
      <h1 className="sr-only">Nixie Tube Clock</h1>

      <MediaImage
        {...HERO}
        eager
        aspect="aspect-[3/2]"
        sizes="(min-width: 1280px) 1184px, 100vw"
        className="mt-6 motion-safe:animate-fade-in"
      />

      {/* Intro beside a spec sheet; stacked on phones. */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-4 text-lg leading-relaxed lg:col-span-7">
          <p>
            This is a nixie tube clock that tells basic time. Two push buttons are used to set the
            time, one for the hour and the other for the minute, and a mechanical switch turns the
            tubes on and off.
          </p>
          <p>
            More info about <A href="https://en.wikipedia.org/wiki/Nixie_tube">Nixie Tubes</A>.
          </p>
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
            Schematics, 3D files and firmware on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {GALLERY.map((image) => (
          <MediaImage
            key={image.src}
            {...image}
            aspect="aspect-[3/2]"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
        ))}
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
              {image ? (
                <MediaImage
                  {...image}
                  aspect="aspect-[3/2]"
                  sizes="(min-width: 1024px) 768px, 100vw"
                  className="mt-8"
                />
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
