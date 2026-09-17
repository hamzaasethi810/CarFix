"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { SIGNIN_ERROR } from "@/lib/auth/credentials";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Eye, EyeOff } from "lucide-react";
import { ErrorText } from "@/components/ui";
import { SocialSignIn } from "@/components/auth-social";

/*
  Remembers the email, and nothing else.

  A returning user finds their address filled in and the cursor already in the
  password box, so signing in is a password and Enter. The address is all that
  is stored: a password or a token in localStorage is readable by any script
  that ever reaches this origin, which turns a convenience into an account
  takeover. An address is already known to whoever is sitting at the machine.
*/
const REMEMBERED_EMAIL = "gaari.email";

export function LoginForm({
  canResetPassword,
  googleEnabled,
}: {
  canResetPassword: boolean;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [reveal, setReveal] = useState(false);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /*
      Deferred a frame. Setting state synchronously out of an effect cascades
      a second render, and the value comes from storage the server cannot see
      anyway, so there is nothing to gain by doing it sooner.
    */
    const id = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(REMEMBERED_EMAIL);
        if (!saved) return;
        setEmail(saved);
        setRemember(true);
        passwordRef.current?.focus();
      } catch {
        // Private mode, or storage disabled. Nothing to recover from.
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Held so the second-factor step does not make them retype them.
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function attempt(email: string, password: string, totp?: string) {
    const result = await signIn("credentials", {
      email,
      password,
      ...(totp ? { totp } : {}),
      redirect: false,
    });

    setPending(false);

    if (!result?.error) {
      router.push("/garage");
      router.refresh();
      return;
    }

    /*
      The provider distinguishes "this account needs a code" from "that code
      was wrong", but only ever after the password has already been accepted —
      so neither message tells an attacker anything about an account they
      cannot already open.
    */
    const reason = String(result.code ?? result.error);

    if (reason.includes(SIGNIN_ERROR.mfaRequired)) {
      setPendingCredentials({ email, password });
      setError(null);
      return;
    }

    if (reason.includes(SIGNIN_ERROR.rateLimited)) {
      setError(
        "Too many sign-in attempts. Wait about five minutes and try again — " +
          "your password and your codes are still fine.",
      );
      return;
    }

    if (reason.includes(SIGNIN_ERROR.mfaInvalid)) {
      setError("That code was not correct. Try the next one your app shows.");
      return;
    }

    setPendingCredentials(null);
    setError("That email and password combination did not work.");
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    try {
      const typed = String(formData.get("email") ?? "");
      if (remember && typed) localStorage.setItem(REMEMBERED_EMAIL, typed);
      else localStorage.removeItem(REMEMBERED_EMAIL);
    } catch {
      // Storage is a convenience; never block a sign-in on it.
    }

    if (pendingCredentials) {
      await attempt(
        pendingCredentials.email,
        pendingCredentials.password,
        String(formData.get("totp") ?? ""),
      );
      return;
    }

    await attempt(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
  }

  if (pendingCredentials) {
    return (
      <form action={onSubmit} className="space-y-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-headline font-semibold">Enter your code</h2>
            <p className="text-subhead text-secondary mt-1">
              Open your authenticator app, or use one of your backup codes.
            </p>
          </div>

          <Field label="Six-digit code">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="totp"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
              />
            )}
          </Field>
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        <SubmitButton pending={pending}>Verify</SubmitButton>

        <button
          type="button"
          onClick={() => {
            setPendingCredentials(null);
            setError(null);
          }}
          className="w-full min-h-11 text-subhead text-secondary"
        >
          Back
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {/*
        Social options lead, because they are the path most people take and
        burying them under a form nobody wants to fill in helps no one. Shared
        with the join screen so the two never drift apart.
      */}
      <SocialSignIn googleEnabled={googleEnabled} />

      <form action={onSubmit} className="space-y-4">
        <Field label="Email">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Password">
          {({ id, describedBy }) => (
            <div className="relative">
              <TextInput
                id={id}
                ref={passwordRef}
                aria-describedby={describedBy}
                name="password"
                type={reveal ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-control text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                {reveal ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          )}
        </Field>

        {/*
          Labelled for what it does. "Remember me" would imply the session
          stays open, and it does not: this deployment signs out after twenty
          minutes of inactivity either way.
        */}
        <label className="flex items-center gap-2.5 text-subhead text-secondary select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded-[3px] accent-[var(--accent-fill)]"
          />
          Remember my email on this device
        </label>

        {error && <ErrorText>{error}</ErrorText>}

        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      {/*
        Only offered when this deployment can send the email. Otherwise the
        link leads to a page that promises something nothing will deliver.
      */}
      {canResetPassword && (
        <p className="text-subhead text-center">
          <Link href="/forgot-password" className="text-accent font-medium">
            Forgot your password?
          </Link>
        </p>
      )}

      <p className="text-subhead text-secondary text-center">
        No account?{" "}
        <Link href="/register" className="text-accent font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
