import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-4">
        <Link href="/">Go home</Link>
      </p>
    </>
  );
}
