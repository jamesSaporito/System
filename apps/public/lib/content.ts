import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getFrontmatter } from "next-mdx-remote-client/utils";

// Resolved from apps/public, which is the cwd for `next build` and `next dev`.
const CONTENT_DIR = path.resolve(process.cwd(), "../../content");
const PROJECTS_DIR = path.join(CONTENT_DIR, "projects");

export type ProjectFrontmatter = {
  title: string;
  summary: string;
  date: string;
  tags?: string[];
};

export type Project = {
  slug: string;
  frontmatter: ProjectFrontmatter;
  source: string;
};

function assertFrontmatter(
  fm: Record<string, unknown>,
  file: string,
): asserts fm is ProjectFrontmatter {
  const valid =
    typeof fm.title === "string" &&
    typeof fm.summary === "string" &&
    typeof fm.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fm.date) &&
    (fm.tags === undefined ||
      (Array.isArray(fm.tags) && fm.tags.every((t) => typeof t === "string")));
  if (!valid) {
    throw new Error(`Invalid frontmatter in ${file}. See content/README.md for the schema.`);
  }
}

export async function getProjectSlugs(): Promise<string[]> {
  const files = await readdir(PROJECTS_DIR);
  return files.filter((f) => f.endsWith(".mdx")).map((f) => f.slice(0, -".mdx".length));
}

export async function getProject(slug: string): Promise<Project> {
  const file = path.join(PROJECTS_DIR, `${slug}.mdx`);
  const source = await readFile(file, "utf8");
  const { frontmatter, strippedSource } = getFrontmatter<Record<string, unknown>>(source);
  assertFrontmatter(frontmatter, file);
  return { slug, frontmatter, source: strippedSource };
}

export async function getProjects(): Promise<Project[]> {
  const slugs = await getProjectSlugs();
  const projects = await Promise.all(slugs.map(getProject));
  return projects.toSorted((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
}
