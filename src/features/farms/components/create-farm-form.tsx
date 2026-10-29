"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createFarm } from "../actions";
import { createFarmSchema } from "../schema";

// Defaults (currency/timezone) and the optional location make the parsed type
// differ from the raw form values, so the form is typed with both.
type CreateFarmValues = z.input<typeof createFarmSchema>;
type CreateFarmParsed = z.output<typeof createFarmSchema>;

export function CreateFarmForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFarmValues, unknown, CreateFarmParsed>({
    resolver: zodResolver(createFarmSchema),
    defaultValues: {
      name: "",
      location: "",
      currency: "KES",
      timezone: "Africa/Nairobi",
    },
  });

  async function onSubmit(values: CreateFarmParsed) {
    setFormError(null);
    const result = await createFarm(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as keyof CreateFarmValues, { message });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError ? (
        <p
          role="alert"
          className="bg-muted text-critical rounded-md px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}

      <Field label="Farm name" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="organization"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
      </Field>

      <Field
        label="Location"
        htmlFor="location"
        error={errors.location?.message}
        hint="Optional"
      >
        <Input
          id="location"
          aria-invalid={!!errors.location}
          {...register("location")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Currency"
          htmlFor="currency"
          error={errors.currency?.message}
        >
          <Input
            id="currency"
            maxLength={3}
            aria-invalid={!!errors.currency}
            {...register("currency")}
          />
        </Field>
        <Field
          label="Timezone"
          htmlFor="timezone"
          error={errors.timezone?.message}
        >
          <Input
            id="timezone"
            aria-invalid={!!errors.timezone}
            {...register("timezone")}
          />
        </Field>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create farm"}
      </Button>
    </form>
  );
}
