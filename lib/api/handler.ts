import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, validation } from "../errors";

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });

// Internal detail stays in the server log; the client gets a stable code and a
// message that is safe to display.
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details ?? undefined } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    // A single issue is unambiguous, so its own message is more useful than
    // the generic line — this is what lets a rejected display name (or any
    // other single-field failure) tell the person why, rather than just that
    // something was wrong. With more than one issue, naming just one of them
    // would misleadingly suggest it's the only problem, so the generic
    // message stands and the caller falls back to `details`.
    //
    // Restricted to `code === "custom"`: those are the issues our own
    // schemas author via `ctx.addIssue`, including every moderation message.
    // Any other single issue is Zod's own default phrasing (e.g.
    // `Unrecognized key: "extra"`, `Too small: expected string to have >=12
    // characters`) — meaningless or machine-voiced to a person, so it falls
    // back to the generic line too rather than reaching the browser verbatim.
    const single = error.issues.length === 1 ? error.issues[0] : undefined;
    const message =
      single && single.code === "custom"
        ? single.message
        : "Some of the information provided was not valid.";
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message,
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 400 },
    );
  }

  console.error("[unhandled]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/*
  Accepts a plain Response as well as a NextResponse, because not every handler
  returns JSON — a reviewer's document is served as raw bytes with headers that
  keep it from being cached or downloaded.
*/
export function route(fn: () => Promise<NextResponse | Response>) {
  return fn().catch(toErrorResponse);
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw validation("Expected a JSON request body.");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

export async function parseForm(req: Request) {
  try {
    return await req.formData();
  } catch {
    throw validation("Expected a multipart form upload.");
  }
}

export function requireFile(form: FormData, field: string): File {
  const value = form.get(field);
  if (!(value instanceof File)) throw validation("A file is required.");
  return value;
}
