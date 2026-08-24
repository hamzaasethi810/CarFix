import { PageTitle } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle
        title="Reset your password"
        subtitle="We will email you a link to choose a new one."
      />
      <ForgotForm />
    </div>
  );
}
