import Link from "next/link";
import { RegisterForm } from "./register-form";
import { AuthPanel } from "@/components/auth-panel";

/*
  Create an account.

  Same split screen as sign-in, so the two screens feel like one product rather
  than two pages that happen to both have a form on them.
*/
export default function RegisterPage() {
  return (
    <AuthPanel
      title="Create your account"
      subtitle="Then add your car and start logging work."
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
      <RegisterForm />
    </AuthPanel>
  );
}
