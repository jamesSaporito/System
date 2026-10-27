import Image from "next/image";
import Link from "next/link";
import { published } from "@/lib/drafts";
import { mediaUrl } from "@/lib/media";

// A mosaic of each project's hero photo, linking to its page. A project without photos yet gets
// a "coming soon" tile instead; `draft` ones only appear in dev (lib/drafts.ts).
const PROJECTS: {
  title: string;
  href: string;
  image: { src: string; alt: string } | null;
  draft?: boolean;
}[] = [
  {
    title: "Motorcycle",
    href: "/motorcycle/",
    image: { src: mediaUrl("motorcycle/complete.webp"), alt: "1971 Honda CL350" },
  },
  {
    title: "Nixie",
    href: "/nixie/",
    image: {
      src: mediaUrl("nixie/front.webp"),
      alt: "A nixie clock from the front, its four orange tubes reading 03:00",
    },
  },
  {
    title: "Freeform",
    href: "/freeform/",
    image: {
      src: mediaUrl("freeform/sculpture.webp"),
      alt: "Brass rods soldered into an open frame holding an STM32, a red LED and a DC jack",
    },
  },
  {
    title: "Tools",
    href: "/time/tools/",
    image: {
      src: mediaUrl("time/tools/jacot-lathe.webp"),
      alt: "A Jacot lathe in its red-lined wooden case",
    },
  },
  {
    title: "Art",
    href: "/art/",
    image: {
      src: mediaUrl("art/house.webp"),
      alt: "A painting of a thatched stone cottage on a quiet lane",
    },
  },
  {
    title: "Woods",
    href: "/art/#woods",
    image: {
      src: mediaUrl("art/woods.webp"),
      alt: "A painting of a path through a bluebell wood",
    },
  },
];

// Wide, narrow / narrow, wide on a 5-column grid, repeating every four tiles, so each pair of
// tiles fills a row of the mosaic.
const SPANS = ["md:col-span-3", "md:col-span-2", "md:col-span-2", "md:col-span-3"];
const TILE = "relative aspect-[4/3] overflow-hidden rounded-lg md:aspect-auto md:h-80 lg:h-[26rem]";

export default function HomePage() {
  const projects = published(PROJECTS);

  return (
    <>
      <h1 className="sr-only">Home</h1>

      <ul className="mt-6 grid gap-4 motion-safe:animate-fade-in md:grid-cols-5">
        {projects.map((project, index) => (
          <li
            key={project.href}
            className={
              // An odd tile out at the end is centered at the wide-tile width; stretching it across
              // the row would crop the photo too far.
              projects.length % 2 === 1 && index === projects.length - 1
                ? "md:col-span-3 md:col-start-2"
                : SPANS[index % SPANS.length]
            }
          >
            {project.image ? (
              <Link
                href={project.href}
                className={`group block bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 dark:bg-neutral-800/60 ${TILE}`}
              >
                {/* Photos crop to fill their tile (unlike MediaImage, which shows them whole). */}
                <Image
                  {...project.image}
                  fill
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                />
                {/* Title is always shown on phones; on larger screens it fades in on hover/focus. */}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-5 pt-16 pb-4 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {project.title}
                  </h2>
                </div>
              </Link>
            ) : (
              <div
                className={`grid place-items-center border border-dashed border-neutral-300 text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500 ${TILE}`}
              >
                {project.title} · coming soon
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
