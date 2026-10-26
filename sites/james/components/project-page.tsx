import type { ReactNode } from "react";
import { MediaImage } from "@/components/media-image";

// Shared layout for project pages. Each page declares its content as data at the top of its file
// (HERO, INTRO, SPECS, REPO, SECTIONS) and composes these components:
//   <Hero /> → <Intro /> → page-specific extras (e.g. a gallery) → <Sections />

/** Inline link styled with the site's amber accent. */
export function A({ href, children }: { href: string; children: ReactNode }) {
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

/** A spec sheet row; the value can include links (e.g. to a part's datasheet). */
export type Spec = { label: string; value: ReactNode };

export type SectionImage = { src: string | null; alt: string; portrait?: boolean; aspect?: string };

export type Section = {
  title: string;
  /** The section's text; leave it out for a photo with just its title. */
  content?: ReactNode;
  /**
   * Optional photo shown under the section's text. Frames are 4:3, or 3:4 (and narrowed) with
   * `portrait`; `aspect` overrides the frame, e.g. "aspect-[3/2]". A null src shows a placeholder.
   */
  image?: SectionImage;
  /**
   * Several photos under the text instead, two per row (stacked on phones). Each row's columns are
   * sized by the photos' shapes, so a portrait and a landscape photo come out the same height.
   */
  images?: SectionImage[];
  /** Sub-sections under this one, numbered 02.1, 02.2, … and indented in the table of contents. */
  subsections?: Omit<Section, "subsections">[];
};

/** The frame for a section photo: 4:3, 3:4 with `portrait`, or its own `aspect`. */
function frame(image: SectionImage): string {
  return image.aspect ?? (image.portrait ? "aspect-[3/4]" : "aspect-[4/3]");
}

/** Width over height, read from the frame ("aspect-[3/4]" → 0.75). */
function ratio(image: SectionImage): number {
  const match = /aspect-\[(\d+)\/(\d+)\]/.exec(frame(image));
  return match ? Number(match[1]) / Number(match[2]) : 1;
}

/** A section's text and photos; shared by sections and sub-sections. */
function SectionBody({ content, image, images }: Omit<Section, "title" | "subsections">) {
  const rows: SectionImage[][] = [];
  images?.forEach((photo, index) => {
    if (index % 2 === 0) rows.push([photo]);
    else rows.at(-1)?.push(photo);
  });

  return (
    <>
      {content ? (
        <div className="mt-4 space-y-4 leading-relaxed text-neutral-600 dark:text-neutral-400 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-neutral-800">
          {content}
        </div>
      ) : null}
      {/* Tall photos are narrowed so they don't run several screens tall. */}
      {image ? (
        <MediaImage
          src={image.src}
          alt={image.alt}
          aspect={frame(image)}
          sizes={
            image.portrait ? "(min-width: 640px) 448px, 100vw" : "(min-width: 1024px) 768px, 100vw"
          }
          className={image.portrait ? "mt-8 max-w-md" : "mt-8"}
        />
      ) : null}
      {rows.map((row, index) => (
        <div
          key={row.map((photo) => photo.src ?? photo.alt).join()}
          className={`flex flex-col gap-4 sm:flex-row sm:items-start ${index === 0 ? "mt-8" : "mt-4"}`}
        >
          {/* Each photo's share of the row is its width-to-height ratio. */}
          {row.map((photo) => (
            <div key={photo.src ?? photo.alt} style={{ flex: `${ratio(photo)} 1 0%` }}>
              <MediaImage
                src={photo.src}
                alt={photo.alt}
                aspect={frame(photo)}
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/** "Sealing the Case" → "sealing-the-case", for the table of contents anchors. */
function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Full-width photo at the top of the page. */
export function Hero({ src, alt, aspect }: { src: string | null; alt: string; aspect: string }) {
  return (
    <MediaImage
      src={src}
      alt={alt}
      eager
      aspect={aspect}
      sizes="(min-width: 1280px) 1184px, 100vw"
      className="mt-6 motion-safe:animate-fade-in"
    />
  );
}

/** Intro paragraphs beside an optional spec sheet and GitHub button; stacked on phones. */
export function Intro({
  children,
  specs,
  repo,
}: {
  children: ReactNode;
  specs?: Spec[];
  repo?: { href: string; label: string };
}) {
  if (!specs && !repo) {
    return <div className="mt-12 max-w-3xl space-y-4 text-lg leading-relaxed">{children}</div>;
  }

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="space-y-4 text-lg leading-relaxed lg:col-span-7">{children}</div>
      <div className="lg:col-span-5">
        {specs ? (
          <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {specs.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-5 gap-4 px-5 py-3">
                <dt className="col-span-2 text-neutral-500 dark:text-neutral-400">{label}</dt>
                <dd className="col-span-3">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {repo ? (
          <a
            href={repo.href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            {repo.label} <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

const TOC_LINK =
  "flex gap-3 rounded-md px-3 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100";

/** Numbered write-up with a table of contents that stays in view on large screens. */
export function Sections({
  sections,
  first = false,
}: {
  sections: Section[];
  /** Set when nothing comes before the sections, so they start near the top of the page. */
  first?: boolean;
}) {
  return (
    // grid-cols-1 lets wide content (e.g. a timing table) scroll inside its column on phones
    // instead of stretching the page.
    <div className={`grid grid-cols-1 gap-12 lg:grid-cols-12 ${first ? "mt-6" : "mt-20"}`}>
      <nav aria-label="Sections" className="hidden lg:col-span-3 lg:block">
        <ol className="sticky top-8 space-y-1 text-sm">
          {sections.map(({ title, subsections }, index) => (
            <li key={title}>
              <a href={`#${slug(title)}`} className={`${TOC_LINK} py-2`}>
                <span className="text-amber-700 tabular-nums dark:text-amber-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {title}
              </a>
              {subsections ? (
                <ol className="space-y-1 pl-9">
                  {subsections.map((sub) => (
                    <li key={sub.title}>
                      <a href={`#${slug(sub.title)}`} className={`${TOC_LINK} py-1.5 text-xs`}>
                        {sub.title}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-16 lg:col-span-9">
        {sections.map(({ title, subsections, ...body }, index) => {
          const number = String(index + 1).padStart(2, "0");
          return (
            <section key={title} id={slug(title)} className="max-w-3xl scroll-mt-8">
              <p className="text-sm font-medium tracking-widest text-amber-700 tabular-nums dark:text-amber-400">
                {number}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
              <SectionBody {...body} />
              {subsections?.map(({ title: subTitle, ...subBody }, subIndex) => (
                <section key={subTitle} id={slug(subTitle)} className="mt-12 scroll-mt-8">
                  <p className="text-xs font-medium tracking-widest text-amber-700 tabular-nums dark:text-amber-400">
                    {number}.{subIndex + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{subTitle}</h3>
                  <SectionBody {...subBody} />
                </section>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
