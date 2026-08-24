import { RegisterForm } from "./register-form";
import { PageTitle } from "@/components/ui";

export default function RegisterPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle title="Create your account" subtitle="Then add your car and start logging work." />
      <RegisterForm />
    </div>
  );
}
