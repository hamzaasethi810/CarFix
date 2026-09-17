import { mailConfigured } from "@/lib/providers/email";
import { googleConfigured } from "@/lib/providers/google";
import { appleConfigured } from "@/lib/providers/apple";
import { AuthPanel } from "@/components/auth-panel";
import { LoginForm } from "./login-form";

/*
  Sign in.

  A split screen: the form on the left, a car on the right. It was a form on an
  empty page, which is correct and completely characterless — the wrong thing
  to be on the two screens where somebody decides whether to bother at all.

  Google is offered first because it is the shortest path, and the email form
  sits right below it rather than behind a toggle.
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

/*
  Shown after registration, and worded to fit both cases the registration
  endpoint deliberately cannot tell apart: a brand-new account, and an attempt
  to re-register an address that already had one. "You can now sign in" is true
  of both, so the notice reveals nothing that the form itself withholds. New
  accounts also get a confirmation email; existing ones get a "you already have
  an account" email — but that goes to the inbox, not onto this page.
*/
const REGISTERED_NOTICE = "Your account is ready. Sign in to continue.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const changed = typeof params.changed === "string" ? params.changed : undefined;
  const notice = params.registered === "1"
    ? REGISTERED_NOTICE
    : changed
      ? NOTICES[changed]
      : undefined;

  return (
    <AuthPanel
      title="Welcome back"
      subtitle="Sign in to your garage."
      /*
        No footer link here on purpose. LoginForm already ends with "No account?
        Create one", and two links to the same place with different wording is
        not emphasis — it is a reader wondering whether they go somewhere
        different.
      */
    >
      {notice && (
        /*
          role="status" rather than role="alert": this is a confirmation, not a
          problem, and alert interrupts a screen reader mid-sentence.
        */
        <p
          role="status"
          className="mb-6 border-l-2 border-accent bg-grouped px-3 py-2.5 text-subhead text-label"
        >
          {notice}
        </p>
      )}
      <LoginForm
        canResetPassword={mailConfigured()}
        googleEnabled={googleConfigured()}
        appleEnabled={appleConfigured()}
      />
    </AuthPanel>
  );
}
