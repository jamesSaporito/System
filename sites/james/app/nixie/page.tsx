import type { Metadata } from "next";
import { MediaImage } from "@/components/media-image";
import { A, Hero, Intro, Sections, type Section, type Spec } from "@/components/project-page";
import { mediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Nixie" };

const HERO = {
  src: mediaUrl("nixie/front.webp"),
  alt: "The nixie clock from the front, its four orange tubes reading 03:00",
};

const INTRO = (
  <>
    <p>
      This is a nixie tube clock that tells basic time. Two push buttons are used to set the time,
      one for the hour and the other for the minute, and a mechanical switch turns the tubes on and
      off.
    </p>
    <p>
      More info about <A href="https://en.wikipedia.org/wiki/Nixie_tube">Nixie Tubes</A>.
    </p>
  </>
);

const SPECS: Spec[] = [
  { label: "Display", value: "Four IN-12A nixie tubes" },
  { label: "Tube voltage", value: "~170 V DC from an NCH8200HV module" },
  { label: "Board voltage", value: "9V DC" },
  { label: "Tube drivers", value: "Four K155ID1 ICs, one per tube" },
  { label: "Microcontroller", value: "STM32L010K4T6" },
  { label: "Timekeeping", value: "RTC with a 32.768 kHz crystal" },
  { label: "Controls", value: "Hour and minute buttons, power switch" },
];

const REPO = {
  href: "https://github.com/jamesSaporito/NixieClock",
  label: "Schematics, 3D files and firmware on GitHub",
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

const SECTIONS: Section[] = [
  {
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
    title: "Enclosure",
    image: {
      src: mediaUrl("nixie/side.webp"),
      alt: "Side profile of the enclosure, a low wedge that rises to the angled tube face",
      aspect: "aspect-[3/2]",
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

      <Hero {...HERO} aspect="aspect-[3/2]" />

      <Intro specs={SPECS} repo={REPO}>
        {INTRO}
      </Intro>

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

      <Sections sections={SECTIONS} />
    </>
  );
}
