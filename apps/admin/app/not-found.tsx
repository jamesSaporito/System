import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-4">
        <Link href="/" className="text-accent underline-offset-4 hover:underline">
          Go to the dashboard
        </Link>
      </p>
    </main>
  );
}
