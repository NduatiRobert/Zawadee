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
      <p className="text-muted-foreground text-sm">
        Phase 0 foundation. Auth and the app shell arrive in Phase 1.
      </p>
    </main>
  );
}
