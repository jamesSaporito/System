import type { ReactNode } from "react";

type CardProps = {
  title: string;
  href?: string;
  children?: ReactNode;
};

export function Card({ title, href, children }: CardProps) {
  const heading = href ? (
    <a href={href} className="underline-offset-4 hover:underline">
      {title}
    </a>
  ) : (
    title
  );

  return (
    <article className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-lg font-semibold">{heading}</h3>
      {children ? (
        <div className="mt-2 text-neutral-600 dark:text-neutral-400">{children}</div>
      ) : null}
    </article>
  );
}
