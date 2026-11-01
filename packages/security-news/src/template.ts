/** The brief's layout, from the security-news skill's assets/template.md. */
export const BRIEF_TEMPLATE = `# Security News

| Date | Covers | Most urgent |
|---|---|---|
| <YYYY-MM-DD, the day it ran> | <start date> to <end date> | <Subject> <CVE-ID>: <one line on why, or "Nothing critical"> |

## Actively Exploited

### <Subject>: <what the flaw lets an attacker do> (<CVE-ID>)
- **Severity:** <Critical/High>, CVSS <score>. <Exploitation status>; in CISA KEV since <date>.
- **Affected:** <products and versions>
- **Fix:** upgrade to <version>, or <mitigation if no fix yet>
- **Published:** <date of the first report or advisory>
- **Impact:** <one or two sentences: who runs this, how exposed it is>
- **Sources:** [Vendor advisory](url), [News site](url)

## Critical and High

### <Subject>: <what the flaw lets an attacker do> (<CVE-ID>)
- **Severity:** ...
- **Affected:** ...
- **Fix:** ...
- **Published:** ...
- **Impact:** ...
- **Sources:** ...

## Worth Knowing

- <Subject>: <one line> ([source](url))
`;
