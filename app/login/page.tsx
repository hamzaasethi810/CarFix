import { mailConfigured } from "@/lib/providers/email";
import { LoginForm } from "./login-form";
import { PageTitle } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle title="Sign in" />
      <LoginForm canResetPassword={mailConfigured()} />
    </div>
  );
}
