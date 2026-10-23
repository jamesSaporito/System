import type { Metadata } from "next";
import { Card } from "@portfolio/ui/card";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Projects</h1>
      <div className="grid gap-4">
        {projects.map(({ slug, frontmatter }) => (
          <Card key={slug} title={frontmatter.title} href={`/projects/${slug}/`}>
            {frontmatter.summary}
          </Card>
        ))}
      </div>
    </>
  );
}
