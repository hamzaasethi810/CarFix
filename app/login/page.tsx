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
export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-12 sm:pt-20 pb-24">
      <SheetHeader title="Welcome back" meta="Sign in to your garage." />
      <div className="mt-8">
        <LoginForm canResetPassword={mailConfigured()} googleEnabled={googleConfigured()} />
      </div>
    </div>
  );
}
