// Timegrapher results before and after service, one row per position. Use it as the content of a
// "Timing" section so it's numbered and listed in the table of contents like the others.

/** A timegrapher reading; null shows "—" until it's measured. */
export type Reading = {
  /** Seconds gained (+) or lost (−) per day. */
  rate: number;
  /** Balance swing in degrees. */
  amplitude: number;
  /** In milliseconds. */
  beatError: number;
} | null;

const POSITIONS = ["DU", "DD", "CU", "CD", "CL", "CR"] as const;
export type Position = (typeof POSITIONS)[number];

export type TimingRow = { position: Position; before: Reading; after: Reading };

const POSITION_NAMES: Record<Position, string> = {
  DU: "Dial up",
  DD: "Dial down",
  CU: "Crown up",
  CD: "Crown down",
  CL: "Crown left",
  CR: "Crown right",
};

/** Every position with nothing measured yet, for pages still waiting on results. */
export const UNMEASURED: TimingRow[] = POSITIONS.map((position) => ({
  position,
  before: null,
  after: null,
}));

const COLUMNS = [
  { label: "Rate", unit: "s/d" },
  { label: "Amp.", unit: "°" },
  { label: "Beat err.", unit: "ms" },
];

/** "+4", "−2" (a true minus sign), "0". */
function signed(rate: number): string {
  if (rate > 0) return `+${rate}`;
  if (rate < 0) return `−${Math.abs(rate)}`;
  return "0";
}

function cells(reading: Reading): string[] {
  if (!reading) return ["—", "—", "—"];
  return [signed(reading.rate), `${reading.amplitude}°`, reading.beatError.toFixed(1)];
}

export function TimingTable({ rows }: { rows: TimingRow[] }) {
  return (
    // Scrolls on its own on narrow screens rather than widening the page.
    <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[34rem] text-sm text-neutral-900 tabular-nums dark:text-neutral-100">
        <thead className="font-light text-neutral-500 dark:text-neutral-400">
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th scope="col" rowSpan={2} className="px-4 py-2 text-left font-light">
              Position
            </th>
            <th
              scope="colgroup"
              colSpan={3}
              className="border-l border-neutral-200 px-4 pt-2 text-center font-light dark:border-neutral-800"
            >
              Before
            </th>
            <th
              scope="colgroup"
              colSpan={3}
              className="border-l border-neutral-200 px-4 pt-2 text-center font-light dark:border-neutral-800"
            >
              After
            </th>
          </tr>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {[0, 1].flatMap((group) =>
              COLUMNS.map(({ label, unit }, index) => (
                <th
                  key={`${group}-${label}`}
                  scope="col"
                  className={`px-4 py-2 text-right text-xs font-light ${
                    index === 0 ? "border-l border-neutral-200 dark:border-neutral-800" : ""
                  }`}
                >
                  {label} <span className="text-neutral-400 dark:text-neutral-500">{unit}</span>
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map(({ position, before, after }) => (
            <tr key={position}>
              <th
                scope="row"
                className="px-4 py-2.5 text-left font-light text-neutral-600 dark:text-neutral-400"
              >
                {POSITION_NAMES[position]}
              </th>
              {[before, after].flatMap((reading, group) =>
                cells(reading).map((value, index) => (
                  <td
                    key={`${group}-${index}`}
                    className={`px-4 py-2.5 text-right ${
                      index === 0 ? "border-l border-neutral-200 dark:border-neutral-800" : ""
                    }`}
                  >
                    {value}
                  </td>
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
