import { Suspense } from "react";
import { Card, PageTitle } from "@/components/ui";
import { ResetForm } from "./reset-form";

/*
  The token arrives in the query string, and is read on the client rather than
  the server so it is never rendered into the HTML the page returns.
*/
export default function ResetPasswordPage() {
  return (
    <div className="max-w-sm mx-auto">
      <PageTitle title="Choose a new password" />
      {/* useSearchParams needs a boundary, or the whole route opts out of
          static rendering. */}
      <Suspense fallback={<Card><p className="text-subhead text-secondary">Checking your link…</p></Card>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
