import { Card, PageTitle } from "@/components/ui";
import { mailConfigured } from "@/lib/providers/email";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle
        title="Reset your password"
        subtitle="We will email you a link to choose a new one."
      />
      {mailConfigured() ? (
        <ForgotForm />
      ) : (
        <Card className="space-y-2">
          <h2 className="text-headline font-semibold">Not available yet</h2>
          <p className="text-subhead text-secondary text-pretty">
            This deployment cannot send email, so a reset link would never
            arrive. Ask an administrator to set a new password for you.
          </p>
        </Card>
      )}
    </div>
  );
}
