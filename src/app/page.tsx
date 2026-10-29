import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground inline-flex size-10 items-center justify-center rounded-xl text-xl"
        >
          🐄
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">HerdBook</h1>
      </div>
      <p className="text-muted-foreground text-lg">
        Multi-tenant livestock farm management. Track animals, feed, health,
        production, sales and finances — from a 500-bird poultry unit to a
        multi-shed dairy.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/signup"
          className="bg-primary text-primary-foreground focus-visible:ring-primary focus-visible:ring-offset-background inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="border-border hover:bg-muted inline-flex h-11 items-center justify-center rounded-md border px-5 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
