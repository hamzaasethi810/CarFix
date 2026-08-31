import { VerifyForm } from "./verify-form";

/*
  The page a verification link lands on.

  It does not verify anything itself. The token arrives in the query string and
  the form posts it, because mail scanners follow links: a GET that consumed
  the token would have it spent by a security appliance before the person ever
  saw the message.
*/
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center">
      <VerifyForm token={token ?? ""} />
    </main>
  );
}
