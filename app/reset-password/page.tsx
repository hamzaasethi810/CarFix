import { Suspense } from "react";
import { Sheet, SheetHeader } from "@/components/ui";
import { ResetForm } from "./reset-form";

/*
  The token arrives in the query string, and is read on the client rather than
  the server so it is never rendered into the HTML the page returns.
*/
export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto">
      <SheetHeader title="Choose a new password" />
      <div className="mt-8">
        {/* useSearchParams needs a boundary, or the whole route opts out of
            static rendering. */}
        <Suspense
          fallback={
            <Sheet className="p-5">
              <p className="text-subhead text-secondary">Checking your link…</p>
            </Sheet>
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
