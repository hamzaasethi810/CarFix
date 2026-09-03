"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { SIGNIN_ERROR } from "@/lib/auth/credentials";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Eye, EyeOff } from "lucide-react";
import { ErrorText } from "@/components/ui";

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
        Google leads, because it is the path most people will take and burying
        it under a form nobody wants to fill in helps no one. The card wrapper
        is gone with it: a form on a flat ground needs no box drawn round it.
      */}
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => signIn("google", { redirectTo: "/garage" })}
            className="w-full min-h-11 flex items-center justify-center gap-2.5 rounded-control border border-separator bg-elevated text-subhead font-medium transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-tertiary"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="relative text-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-separator" />
            <span className="relative bg-bg px-3 text-footnote text-tertiary-label">
              or use your email
            </span>
          </div>
        </>
      )}

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

/* Google's mark is a fixed brand asset; lucide has no equivalent. */
function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
