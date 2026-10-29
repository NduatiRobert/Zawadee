import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateFarmForm } from "@/features/farms/components/create-farm-form";
import { listMyFarms } from "@/features/farms/queries";

export const metadata: Metadata = { title: "Set up your farm" };
export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: createNew } = await searchParams;
  // If the user already belongs to a farm, go straight to it — unless they
  // explicitly asked to add another (?new=1 from the farm switcher).
  const farms = await listMyFarms();
  const [firstFarm] = farms;
  if (firstFarm && createNew !== "1") {
    redirect(`/${firstFarm.slug}/dashboard`);
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create your farm</CardTitle>
            <CardDescription>
              This is your workspace. You can invite your team once it&apos;s
              set up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateFarmForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
