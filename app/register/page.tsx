import Link from "next/link";
import { RegisterForm } from "./register-form";
import { SheetHeader } from "@/components/ui";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto">
      <SheetHeader title="Create your account" meta="Then add your car and start logging work." />
      <div className="mt-8">
        <RegisterForm />
      </div>

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
