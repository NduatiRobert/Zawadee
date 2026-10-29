import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10">
      <Link
        href="/"
        className="text-foreground text-lg font-semibold tracking-tight"
      >
        HerdBook
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
