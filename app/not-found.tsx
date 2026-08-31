import Link from "next/link";
import { buttonStyles } from "@/components/ui";

/*
  The 404.

  Next's built-in one renders outside the app's layout entirely — black
  background, white Helvetica, no header, no footer, no way onward. On a light
  site it does not just look unbranded, it looks broken.

  The number sits on a plate because that is the one piece of the identity
  that carries meaning here: the wordmark is a plate, every vehicle badge on a
  job card is a plate, and a plate is where a number belongs. It is the joke
  the brand was already making, not a new one bolted on.

  Deliberately not cute about it. Somebody following a dead link wants to know
  what happened and where to go, so the copy says both in two lines and the
  routes out are the two things anyone is ever here to do.
*/
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <span
        /*
          The same plate as the vehicle badge on a job card, at display size.
          Not the VehiclePlate component: that one is sized for a card and
          this needs to read as the headline.
        */
        className="inline-flex items-center rounded-[6px] px-6 py-3 font-condensed text-[2.75rem] font-bold uppercase leading-none tracking-[0.12em] text-[#EFE7C8] bg-[linear-gradient(180deg,#20301f,#16210f)] shadow-[inset_0_0_0_2px_rgba(239,231,200,0.45),0_2px_4px_rgba(0,0,0,0.28)]"
      >
        404
      </span>

      <h1 className="text-title1 mt-8">This page does not exist.</h1>
      <p className="text-body text-secondary mt-3 text-balance">
        The link may be old, or the page may have moved. Nothing is wrong with
        your account.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/search" className={buttonStyles.primary}>
          Find shops near me
        </Link>
        <Link href="/" className={buttonStyles.secondary}>
          Back to the start
        </Link>
      </div>
    </main>
  );
}
