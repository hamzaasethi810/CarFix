import { mailConfigured } from "@/lib/providers/email";
import { googleConfigured } from "@/lib/providers/google";
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
    <div className="mx-auto w-full max-w-sm px-4 pt-12 sm:pt-20 pb-24">
      <h1 className="text-title1 font-semibold">Welcome back</h1>
      <p className="text-subhead text-secondary mt-1.5 mb-8">
        Sign in to your garage.
      </p>
      <LoginForm canResetPassword={mailConfigured()} googleEnabled={googleConfigured()} />
    </div>
  );
}
