/**
 * The typed result every Server Action returns. Actions never throw raw errors
 * to the client; they return `{ ok: false, error, fieldErrors? }` instead so
 * forms can show a general message and per-field messages. See CLAUDE.md.
 */
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export type ActionResult<TData = undefined, TField extends string = string> =
  | { ok: true; data: TData }
  | { ok: false; error: string; fieldErrors?: FieldErrors<TField> };

/** Narrow a ZodError's `flatten().fieldErrors` to our one-message-per-field shape. */
export function firstFieldErrors<T extends string>(
  flat: Partial<Record<string, string[] | undefined>>,
): FieldErrors<T> {
  const out: FieldErrors<T> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) {
      out[key as T] = messages[0];
    }
  }
  return out;
}
