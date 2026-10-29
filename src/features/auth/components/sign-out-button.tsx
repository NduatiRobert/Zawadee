import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

/** Sign-out control — a form posting to the signOut Server Action. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
