import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Card, PageTitle } from "@/components/ui";

export default function RegisterPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle title="Create your account" subtitle="Then add your car and start logging work." />
      <RegisterForm />

      {/*
        Shops sign up the same way — the account comes first, then they claim
        their listing with proof of trading. Keeping it one account type means
        an owner who also owns a car is not forced to hold two logins.
      */}
      <Card className="mt-8">
        <h2 className="text-headline font-semibold">Run a shop?</h2>
        <p className="text-subhead text-secondary mt-1">
          Create your account above, then claim your listing with a document
          showing you trade under that name. Once it is approved you can publish
          your prices and subscribe for the gold mark.
        </p>
        <Link
          href="/shops/claim"
          className="mt-4 inline-flex items-center justify-center min-h-11 px-5 rounded-control bg-fill text-accent text-subhead font-semibold"
        >
          Claim your shop
        </Link>
      </Card>
    </div>
  );
}
