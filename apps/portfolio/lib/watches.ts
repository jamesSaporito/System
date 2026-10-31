import type { Spec } from "@/components/project-page";

// The facts about each watch, shared by the Time nav (lib/nav.ts), the /time/ landing grid and each
// watch's spec sheet. A watch's story (intro, sections, timing results) lives in its own page at
// app/time/<maker>/<grade>/. Drafts follow lib/drafts.ts: `draft: true` here and page.draft.tsx.
export type Watch = {
  maker: string;
  /** The maker's model number for the movement, e.g. "747". */
  grade: string;
  draft?: boolean;
  /** Used on the landing card and as the page's hero; null shows a placeholder. */
  photo: { src: string; alt: string } | null;
  size: string;
  jewels: string;
  serial: string;
  year: string;
  adjustments: string;
  case: string;
};

const TBD = "TBD";

export const WATCHES: Watch[] = [
  {
    maker: "Elgin",
    grade: "524",
    draft: true,
    photo: null,
    size: TBD,
    jewels: TBD,
    serial: TBD,
    year: TBD,
    adjustments: TBD,
    case: TBD,
  },
  {
    maker: "Hamilton",
    grade: "747",
    draft: true,
    photo: null,
    size: TBD,
    jewels: TBD,
    serial: TBD,
    year: TBD,
    adjustments: TBD,
    case: TBD,
  },
  {
    maker: "Hamilton",
    grade: "748",
    draft: true,
    photo: null,
    size: TBD,
    jewels: TBD,
    serial: TBD,
    year: TBD,
    adjustments: TBD,
    case: TBD,
  },
  {
    maker: "Waltham",
    grade: "115",
    draft: true,
    photo: null,
    size: TBD,
    jewels: TBD,
    serial: TBD,
    year: TBD,
    adjustments: TBD,
    case: TBD,
  },
];

/** "/time/hamilton/747/" */
export function watchHref({ maker, grade }: Watch): string {
  return `/time/${maker.toLowerCase()}/${grade}/`;
}

/** "Hamilton Grade 747" */
export function watchTitle({ maker, grade }: Watch): string {
  return `${maker} Grade ${grade}`;
}

/** The spec sheet shown beside a watch page's intro. */
export function watchSpecs(watch: Watch): Spec[] {
  return [
    { label: "Maker", value: watch.maker },
    { label: "Grade", value: watch.grade },
    { label: "Size", value: watch.size },
    { label: "Jewels", value: watch.jewels },
    { label: "Serial number", value: watch.serial },
    { label: "Year made", value: watch.year },
    { label: "Adjustments", value: watch.adjustments },
    { label: "Case", value: watch.case },
  ];
}

/** Looks up a watch for its page; throws at build time if the entry is missing. */
export function findWatch(maker: string, grade: string): Watch {
  const watch = WATCHES.find((w) => w.maker === maker && w.grade === grade);
  if (!watch) throw new Error(`No watch ${maker} ${grade} in lib/watches.ts`);
  return watch;
}
