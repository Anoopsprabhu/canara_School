import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">This member or page doesn&apos;t exist, or it may have been removed.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">
          Go to dashboard
        </Link>
        <Link href="/members" className="btn-secondary">
          Search members
        </Link>
      </div>
    </div>
  );
}
