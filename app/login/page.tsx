import { mailConfigured } from "@/lib/providers/email";
import { googleConfigured } from "@/lib/providers/google";
import { SheetHeader } from "@/components/ui";
import { LoginForm } from "./login-form";

/*
  Sign in.

  No card, no box: the form sits on the ground with its own rhythm, which is
  what stops an auth screen reading as a settings pane. Google is offered
  first because it is the shortest path, and the email form is right below it
  rather than behind a toggle.
*/

/*
  Why the account screens looked broken.

  Changing a password succeeds, then deliberately signs you out everywhere —
  the settings panel says so, and it redirects here with ?changed=1. This page
  ignored that parameter completely, so the whole flow was: fill in the form,
  press the button, get thrown to a bare sign-in screen with no explanation.
  Every reasonable person reads that as "the password change did not work",
  and then finds two-factor and delete-account dead too, because they are now
  signed out. One missing sentence made three features look broken.
*/
const NOTICES: Record<string, string> = {
  "1": "Password changed. Sign in again with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const changed = typeof params.changed === "string" ? params.changed : undefined;
  const notice = changed ? NOTICES[changed] : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-12 sm:pt-20 pb-24">
      <SheetHeader title="Welcome back" meta="Sign in to your garage." />

      {notice && (
        /*
          role="status" rather than role="alert": this is a confirmation, not a
          problem, and alert interrupts a screen reader mid-sentence.
        */
        <p
          role="status"
          className="mt-6 border-l-2 border-accent bg-grouped px-3 py-2.5 text-subhead text-label"
        >
          {notice}
        </p>
      )}

      <div className="mt-8">
        <LoginForm canResetPassword={mailConfigured()} googleEnabled={googleConfigured()} />
      </div>
    </div>
  );
}
