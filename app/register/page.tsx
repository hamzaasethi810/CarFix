import Link from "next/link";
import { RegisterForm } from "./register-form";
import { AuthPanel } from "@/components/auth-panel";
import { googleConfigured } from "@/lib/providers/google";

/*
  Create an account.

  Same split screen as sign-in, so the two screens feel like one product rather
  than two pages that happen to both have a form on them.
*/
export default function RegisterPage() {
  return (
    <AuthPanel
      title="Create your account"
      /*
        It read "Then add your car and start logging work." — which dangles.
        "Then" is the second half of a sequence whose first half was never
        written, so under a heading that says "Create your account" it lands as
        a fragment. It was also off the site's voice: everywhere else you file a
        price against a receipt, you do not log work.
      */
      subtitle="Add your car, then file what you paid."
      footer={
        <>
          <span className="block">
            Already have one?{" "}
            <Link href="/login" className="text-accent underline underline-offset-4">
              Sign in
            </Link>
          </span>
          {/* Shops have their own route so neither audience wades through the other's copy. */}
          <span className="block mt-2">
            Run a shop?{" "}
            <Link href="/join/shop" className="text-accent underline underline-offset-4">
              List your business
            </Link>
          </span>
        </>
      }
    >
      <RegisterForm googleEnabled={googleConfigured()} />
    </AuthPanel>
  );
}
