import { ADVISORIES_URL, type FetchLike, KEV_URL } from "./feeds";

// Feed responses as read on 2026-10-31, cut down from the real formats: CISA's KEV JSON, GitHub's
// global advisories, an RSS 2.0 feed and an Atom feed.

export const KEV_JSON = {
  catalogVersion: "2026.10.30",
  vulnerabilities: [
    {
      cveID: "CVE-2026-109618",
      vendorProject: "PHP Group",
      product: "PHP",
      vulnerabilityName: "PHP Memory Corruption Vulnerability",
      dateAdded: "2026-10-26",
      shortDescription: "PHP contains a memory corruption vulnerability.",
      requiredAction: "Apply mitigations per vendor instructions.",
      dueDate: "2026-10-29",
      knownRansomwareCampaignUse: "Unknown",
      notes:
        "https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w ; https://nvd.nist.gov/vuln/detail/CVE-2026-109618",
      cwes: ["CWE-787"],
    },
    {
      cveID: "CVE-2025-1",
      vendorProject: "Old",
      product: "Thing",
      vulnerabilityName: "Old Thing Vulnerability",
      dateAdded: "2026-09-01",
      shortDescription: "Before the window.",
      requiredAction: "Patch.",
      dueDate: "2026-09-22",
      knownRansomwareCampaignUse: "Known",
      notes: "",
      cwes: [],
    },
  ],
};

const advisory = (overrides: Record<string, unknown>) => ({
  ghsa_id: "GHSA-4xm8-rg9h-jhq2",
  cve_id: null,
  html_url: "https://github.com/advisories/GHSA-4xm8-rg9h-jhq2",
  summary: "Signal K path traversal can disclose the JWT signing secret",
  severity: "critical",
  published_at: "2026-10-30T22:57:22Z",
  withdrawn_at: null,
  cvss_severities: {
    cvss_v3: { vector_string: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", score: 9.8 },
    cvss_v4: { vector_string: null, score: 0 },
  },
  vulnerabilities: [
    {
      package: { ecosystem: "npm", name: "signalk-server" },
      vulnerable_version_range: ">= 2.0.0, < 2.34.0",
      first_patched_version: "2.34.0",
      vulnerable_functions: [],
    },
  ],
  ...overrides,
});

export const CRITICAL_JSON = [
  advisory({}),
  advisory({ ghsa_id: "GHSA-wwww-wwww-wwww", withdrawn_at: "2026-10-30T00:00:00Z" }),
];

export const HIGH_JSON = [
  advisory({
    ghsa_id: "GHSA-hhhh-hhhh-hhhh",
    cve_id: "CVE-2026-20000",
    html_url: "https://github.com/advisories/GHSA-hhhh-hhhh-hhhh",
    severity: "high",
    summary: "Next.js middleware bypass",
    cvss_severities: {
      cvss_v3: { vector_string: null, score: 0 },
      cvss_v4: { vector_string: "CVSS:4.0/AV:N/AC:L", score: 8.7 },
    },
    vulnerabilities: [
      {
        package: { ecosystem: "npm", name: "next" },
        vulnerable_version_range: "< 16.4.3",
        first_patched_version: null,
      },
    ],
  }),
];

export const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Example Security</title>
  <link>https://news.example.com/</link>
  <item>
    <title><![CDATA[PHP2Shell flaws now exploited &amp; added to KEV]]></title>
    <link>https://news.example.com/php2shell-exploited/</link>
    <pubDate>Mon, 27 Oct 2026 14:00:00 +0000</pubDate>
    <description>&lt;p&gt;CISA says CVE-2026-109618 and cve-2026-109619 are under attack.&lt;/p&gt;</description>
  </item>
  <item>
    <title>Ten gadgets for the holidays</title>
    <link>https://news.example.com/gadgets/</link>
    <pubDate>Tue, 28 Oct 2026 09:00:00 +0000</pubDate>
    <description>Shopping.</description>
  </item>
  <item>
    <title>Old zero-day story</title>
    <link>https://news.example.com/old/</link>
    <pubDate>Mon, 01 Sep 2026 09:00:00 +0000</pubDate>
    <description>Before the window.</description>
  </item>
</channel>
</rss>`;

export const ATOM_XML = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Security</title>
  <entry>
    <title type="html">Chrome patches actively exploited zero-day</title>
    <link rel="alternate" type="text/html" href="https://atom.example.org/chrome-zero-day?a=1&amp;b=2"/>
    <link rel="replies" href="https://atom.example.org/comments"/>
    <updated>2026-10-30T08:00:00Z</updated>
    <summary type="html">Google fixed CVE-2026-30000 in Chrome 150.</summary>
  </entry>
</feed>`;

export const RSS_FEED = "https://news.example.com/feed/";
export const ATOM_FEED = "https://atom.example.org/security.atom";

/** The second page of high advisories, which the first page's `Link` header points to. */
export const HIGH_PAGE_2_JSON = [
  advisory({
    ghsa_id: "GHSA-pppp-pppp-pppp",
    html_url: "https://github.com/advisories/GHSA-pppp-pppp-pppp",
    severity: "high",
    summary: "MONAI arbitrary code execution when loading a model",
    published_at: "2026-10-30T10:00:00Z",
    cvss_severities: null,
    vulnerabilities: [
      {
        package: { ecosystem: "pip", name: "monai" },
        vulnerable_version_range: "< 1.6.0",
        first_patched_version: "1.6.0",
      },
    ],
  }),
];

const PAGE_2 = `${ADVISORIES_URL}?severity=high&page=2`;

/** A fetch that serves the fixtures; `fail` lists URL prefixes that answer 503. */
export function fakeFetch(fail: string[] = []): { fetch: FetchLike; requested: string[] } {
  const requested: string[] = [];
  const fetch: FetchLike = (url) => {
    requested.push(url);
    if (fail.some((prefix) => url.startsWith(prefix))) {
      return Promise.resolve(new Response("unavailable", { status: 503 }));
    }
    let body: string | null = null;
    const headers = new Headers();
    if (url === KEV_URL) body = JSON.stringify(KEV_JSON);
    else if (url === PAGE_2) body = JSON.stringify(HIGH_PAGE_2_JSON);
    else if (url.startsWith(ADVISORIES_URL)) {
      const severity = new URL(url).searchParams.get("severity");
      body = JSON.stringify(severity === "critical" ? CRITICAL_JSON : HIGH_JSON);
      if (severity === "high")
        headers.set("link", `<${PAGE_2}>; rel="next", <${PAGE_2}>; rel="last"`);
    } else if (url === RSS_FEED) body = RSS_XML;
    else if (url === ATOM_FEED) body = ATOM_XML;
    return Promise.resolve(
      body === null ? new Response("not found", { status: 404 }) : new Response(body, { headers }),
    );
  };
  return { fetch, requested };
}
