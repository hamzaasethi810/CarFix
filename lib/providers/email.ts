import "server-only";
import { env, isProd } from "../env";

/*
  Sending email.

  Resend is the sender when configured — its free tier covers 3,000 messages a
  month, which is far more than password resets will need. Without a key the
  message is written to the server log instead, so the whole flow is testable
  on a laptop with nothing to sign up for.

  That fallback is deliberately loud in production: silently not sending a
  reset email would look identical to a working system right up until somebody
  is locked out.
*/

export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: Email): Promise<{ delivered: boolean }> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (isProd) {
      console.error(
        "[email] No sender configured, so nothing was sent. Set RESEND_API_KEY and EMAIL_FROM.",
        { to: message.to, subject: message.subject },
      );
      return { delivered: false };
    }

    // Development: print it so the link is usable without a mail provider.
    console.log(
      `\n─── email (not sent, no provider configured) ───\n` +
        `To:      ${message.to}\n` +
        `Subject: ${message.subject}\n\n${message.text}\n` +
        `───────────────────────────────────────────────\n`,
    );
    return { delivered: false };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      console.error("[email] send failed", { to: message.to, error });
      return { delivered: false };
    }
    return { delivered: true };
  } catch (error) {
    // Never let a mail failure break the request that triggered it.
    console.error("[email] send threw", { to: message.to, error });
    return { delivered: false };
  }
}
