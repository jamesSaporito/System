import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { getProject, getProjectSlugs } from "@/lib/content";

// Only slugs returned by generateStaticParams exist; anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { frontmatter } = await getProject(slug);
  return { title: frontmatter.title, description: frontmatter.summary };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const { frontmatter, source } = await getProject(slug);

  return (
    <article>
      <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
      <time dateTime={frontmatter.date} className="text-sm text-neutral-500">
        {frontmatter.date}
      </time>
      <div className="mt-6 space-y-4">
        <MDXRemote source={source} />
      </div>
    </article>
  );
}
