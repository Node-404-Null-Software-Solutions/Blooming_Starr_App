import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-600">The page you’re looking for doesn’t exist.</p>
      <Link
        href="/app"
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Go to app
      </Link>
    </div>
  );
}
