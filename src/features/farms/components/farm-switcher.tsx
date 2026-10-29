"use client";

import { useRouter } from "next/navigation";

import type { FarmSummary } from "../queries";

/** Dropdown to switch between the farms the user belongs to. */
export function FarmSwitcher({
  farms,
  currentSlug,
}: {
  farms: FarmSummary[];
  currentSlug: string;
}) {
  const router = useRouter();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (value === "__new") {
      router.push("/onboarding?new=1");
      return;
    }
    if (value !== currentSlug) router.push(`/${value}/dashboard`);
  }

  return (
    <select
      aria-label="Switch farm"
      value={currentSlug}
      onChange={onChange}
      className="border-border bg-card focus-visible:ring-primary h-9 max-w-[12rem] rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      {farms.map((farm) => (
        <option key={farm.id} value={farm.slug}>
          {farm.name}
        </option>
      ))}
      <option value="__new">+ New farm…</option>
    </select>
  );
}
