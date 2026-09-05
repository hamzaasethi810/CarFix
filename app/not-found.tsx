import Link from "next/link";
import { BlankForm, Stamp, buttonStyles } from "@/components/ui";

/*
  The 404.

  Next's built-in one renders outside the app's layout entirely — black
  background, white Helvetica, no header, no footer, no way onward. On a light
  site it does not just look unbranded, it looks broken.

  It was a plate stamped "404" in the retired forest palette — the one piece
  of hardcoded color left in the system, outside every token. The joke was
  already right, just aimed at the wrong prop: a document with nothing on
  file gets a blank form and a stamp across it, not a badge. That is what
  this is now, in the same reserved stamp ink as every other attestation on
  the site.

  Deliberately not cute about it. Somebody following a dead link wants to know
  what happened and where to go, so the copy says both in two lines and the
  routes out are the two things anyone is ever here to do.
*/
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20">
      <Stamp state="void">No such record</Stamp>

      <div className="mt-8 w-full">
        <BlankForm
          heads={["Record"]}
          title="This page does not exist."
          hint="The link may be old, or the page may have moved. Nothing is wrong with your account."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/search" className={buttonStyles.primary}>
                Find shops near me
              </Link>
              <Link href="/" className={buttonStyles.secondary}>
                Back to the start
              </Link>
            </div>
          }
        />
      </div>
    </main>
  );
}
