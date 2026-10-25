import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Intro } from "@/components/project-page";
import { published } from "@/lib/drafts";
import { WATCHES, watchHref } from "@/lib/watches";

export const metadata: Metadata = { title: "Time" };

// Landing page for the Time section: every published watch from lib/watches.ts, then the tools.
// Drafts are filtered here on the server, so they never reach the HTML in production.
const INTRO = <p>Placeholder introduction to the Time section.</p>;

type Card = {
  href: string;
  eyebrow: string;
  title: string;
  detail: string;
  photo: { src: string; alt: string } | null;
};

const TOOLS_CARD: Card = {
  href: "/time/tools/",
  eyebrow: "Workshop",
  title: "Tools",
  detail: "Watchmaking tools",
  photo: null,
};

function CardLink({ card, eager }: { card: Card; eager: boolean }) {
  return (
    <Link
      href={card.href}
      className="group block border border-neutral-200 transition-colors hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800/60">
        {card.photo ? (
          <Image
            {...card.photo}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400 dark:text-neutral-500">
            Image coming soon
          </div>
        )}
      </div>
      <div className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <p className="text-xs tracking-widest text-neutral-500 uppercase dark:text-neutral-400">
          {card.eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-light">{card.title}</h2>
        <p className="mt-0.5 text-sm font-light text-neutral-500 dark:text-neutral-400">
          {card.detail}
        </p>
      </div>
    </Link>
  );
}

export default function TimePage() {
  const cards: Card[] = [
    ...published(WATCHES).map((watch) => ({
      href: watchHref(watch),
      eyebrow: watch.maker,
      title: `Grade ${watch.grade}`,
      detail: watch.year,
      photo: watch.photo,
    })),
    TOOLS_CARD,
  ];

  return (
    <>
      <h1 className="sr-only">Time</h1>

      <Intro>{INTRO}</Intro>

      <ul className="mt-12 grid gap-6 motion-safe:animate-fade-in sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <li key={card.href}>
            <CardLink card={card} eager={index < 3} />
          </li>
        ))}
      </ul>
    </>
  );
}
