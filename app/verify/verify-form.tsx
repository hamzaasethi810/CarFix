"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonStyles } from "@/components/ui";

type State = "idle" | "working" | "done" | "failed";

export function VerifyForm({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <>
        <h1 className="text-title1">That link is incomplete.</h1>
        <p className="text-body text-secondary mt-3">
          Open the link from your email again, or request a new one from your
          account settings.
        </p>
      </>
    );
  }

  if (state === "done") {
    return (
      <>
        <h1 className="text-title1">Email confirmed.</h1>
        <p className="text-body text-secondary mt-3">
          You can post experiences and replies now.
        </p>
        <div className="mt-8">
          <Link href="/search" className={buttonStyles.primary}>
            Find shops near me
          </Link>
        </div>
      </>
    );
  }

  const submit = async () => {
    setState("working");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setMessage(body?.error?.message ?? "That link is no longer valid.");
        setState("failed");
        return;
      }
      setState("done");
    } catch {
      setMessage("Could not reach the server. Try again.");
      setState("failed");
    }
  };

  return (
    <>
      <h1 className="text-title1">Confirm your email</h1>
      <p className="text-body text-secondary mt-3">
        One tap and you are done.
      </p>
      {message && (
        <p role="alert" className="text-subhead text-destructive mt-4">
          {message}
        </p>
      )}
      <div className="mt-8">
        <button
          type="button"
          onClick={submit}
          disabled={state === "working"}
          className={buttonStyles.primary}
        >
          {state === "working" ? "Confirming…" : "Confirm my email"}
        </button>
      </div>
    </>
  );
}
