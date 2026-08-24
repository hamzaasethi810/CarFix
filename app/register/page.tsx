import Link from "next/link";
import { RegisterForm } from "./register-form";
import { PageTitle } from "@/components/ui";

export default function RegisterPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle title="Create your account" subtitle="Then add your car and start logging work." />
      <RegisterForm />

      {/* Shops have their own route so neither audience wades through the other's copy. */}
      <p className="text-subhead text-secondary text-center mt-6">
        Run a shop?{" "}
        <Link href="/join/shop" className="text-accent font-medium">
          List your business
        </Link>
      </p>
    </div>
  );
}
