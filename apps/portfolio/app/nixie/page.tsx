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
      This is a nixie tube clock that tells basic time. Two push buttons set the time, one for the
      hour and one for the minute, and a mechanical switch turns the tubes on and off.
    </p>
    <p>
      More info about <A href="https://en.wikipedia.org/wiki/Nixie_tube">nixie tubes</A>.
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
    title: "Components",
    content: (
      <>
        <p>
          It uses four IN-12A nixie tubes, which need ~170V DC to light up. The{" "}
          <A href="https://omnixie.com/products/nch8200hv-nixie-hv-power-module">NCH8200HV</A>{" "}
          generates this voltage, and the mechanical switch cuts power to the module, which is how
          the tubes are turned off.
        </p>
        <p>
          The tubes are driven by four{" "}
          <A href="https://tubehobby.com/datasheets/k155id1.pdf">K155ID1</A> ICs, one per tube.
          They&apos;re very obsolete, but they were made specifically to drive nixie tubes.
        </p>
        <p>
          The microcontroller is the{" "}
          <A href="https://www.st.com/en/microcontrollers-microprocessors/stm32l010k4.html">
            STM32L010K4T6
          </A>
          , an Arm Cortex-M0+ MCU. Its RTC uses an external 32.768 kHz crystal to keep accurate
          time. The one I built consistently gains around two seconds a day.
        </p>
      </>
    ),
  },
  {
    title: "PCB",
    content: (
      <>
        <p>The PCBs were designed in KiCad, as two separate projects.</p>
        <p>
          There are two boards: the main board and the tube board. The main board holds all the main
          components (MCU, ICs, capacitors, etc.), while the tube board is only for the tube
          sockets, which the tubes plug into. The two boards connect through header pins, male on
          one and female on the other. That&apos;s how current flows from the main board to the tube
          board, and it also means the boards can be taken apart if needed. The tubes should not be
          soldered directly to the PCB. Tube sockets are used instead and the tubes are plugged into
          those, so a tube can be replaced if one breaks.
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
          The enclosure is 3D printed, with threaded brass inserts for the screws that hold
          everything together. There are currently two versions.
        </p>
        <p>
          <strong className="font-medium text-neutral-900 dark:text-neutral-100">V1</strong> The
          original design. PCB spacers add support between the boards, taking stress off the header
          pins that connect the tube board to the main board.
        </p>
        <p>
          <strong className="font-medium text-neutral-900 dark:text-neutral-100">V2</strong>{" "}
          Inspired by Dieter Rams&apos;s design for the Braun DN40. Four screws secure the tube
          board to the PCB mount (the top two alone are enough), and they tap straight into the
          plastic.
        </p>
      </>
    ),
  },
  {
    title: "Firmware",
    content: (
      <>
        <p>
          The firmware is a standard STM32 project.
        </p>
        <p>
          Every ten minutes the tubes quickly cycle through each number. This is meant to prevent <A href="https://en.wikipedia.org/wiki/Hot_cathode#Failure_modes">cathode poisoning</A>.
          I&apos;m not sure how effective it is at the current frequency and duration.
        </p>
        <p>
          To avoid extra hardware, the main board has a{" "}
          <A href="https://www.tag-connect.com/product/tc2030-idc-6-pin-tag-connect-plug-of-nails-spring-pin-cable-with-legs">
            Tag-Connect
          </A>{" "}
          footprint, which is used with an{" "}
          <A href="https://www.st.com/en/development-tools/st-link-v2.html">ST-LINK</A> (clones
          should work just fine) to program the MCU.
        </p>
      </>
    ),
  },
  {
    title: "Improvements",
    content: (
      <>
        <p>
          Because the PCB is programmed through a Tag-Connect footprint, the enclosure design pretty
          much requires the MCU to be programmed before everything is assembled. Uploading different
          firmware later means mostly taking it apart.
        </p>
        <p>
          The DC jack used in this design has to be mounted before the wires are soldered to it, so
          the enclosure can&apos;t be completely removed without cutting those wires.
        </p>
      </>
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
