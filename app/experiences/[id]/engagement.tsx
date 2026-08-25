"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, buttonStyles, num, formatDate } from "@/components/ui";
import { TextArea } from "@/components/form";

type Reply = { id: string; body: string; createdAt: string; edited: boolean; shop: { id: string; name: string } } | null;

/*
  Everything an owner or shop can do with a report after it is posted: mark it
  helpful, reply to it as the shop it is about, and attach photos of the work.
*/
export function Engagement({
  experienceId,
  helpful,
  reply,
  canReply,
  isOwn,
  photos,
}: {
  experienceId: string;
  helpful: { count: number; voted: boolean };
  reply: Reply;
  canReply: boolean;
  isOwn: boolean;
  photos: { id: string; url: string }[];
}) {
  const router = useRouter();
  const [vote, setVote] = useState(helpful);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setError(null);
    const res = await fetch(`/api/experiences/${experienceId}/helpful`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) return setError(body?.error?.message ?? "Could not record that.");
    setVote(body);
  }

  async function saveReply(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/experiences/${experienceId}/reply`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: String(formData.get("body") ?? "") }),
    });
    const payload = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return setError(payload?.error?.message ?? "Could not save that reply.");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-4 mt-4">
      {photos.length > 0 && (
        <Card>
          <h2 className="text-headline font-semibold mb-3">Photos of the work</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt="The completed work"
                className="w-full aspect-square object-cover rounded-control bg-fill"
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-wrap items-center gap-3">
        {/* The author cannot vote for their own report, so it is not offered. */}
        {!isOwn && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={vote.voted}
            className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-control text-subhead font-medium transition-colors duration-150 ${
              vote.voted ? "bg-accent-fill/12 text-accent" : "bg-black/[0.06] text-secondary hover:bg-black/10"
            }`}
          >
            <span aria-hidden="true">{vote.voted ? "✓" : "☆"}</span>
            Helpful
          </button>
        )}
        <span className="text-subhead text-secondary">
          {num(vote.count)} {vote.count === 1 ? "person found" : "people found"} this helpful
        </span>
      </Card>

      {reply && !editing && (
        <Card className="border-l-2 border-accent">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-subhead font-semibold">{reply.shop.name} replied</h2>
            <span className="text-footnote text-secondary">
              {formatDate(reply.createdAt)}
              {reply.edited && " · edited"}
            </span>
          </div>
          <p className="text-body mt-2 text-pretty">{reply.body}</p>
          {canReply && (
            <button type="button" onClick={() => setEditing(true)} className="mt-3 text-footnote text-accent min-h-11">
              Edit reply
            </button>
          )}
        </Card>
      )}

      {canReply && (!reply || editing) && (
        <Card>
          <h2 className="text-headline font-semibold mb-1">Reply as the shop</h2>
          <p className="text-subhead text-secondary mb-3">
            Your reply appears publicly beneath this report.
          </p>
          <form action={saveReply} className="space-y-3">
            <TextArea name="body" rows={4} maxLength={2000} required defaultValue={reply?.body ?? ""} />
            {error && <ErrorText>{error}</ErrorText>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className={buttonStyles.primary}>
                {pending ? "Saving…" : "Post reply"}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(false)} className={buttonStyles.secondary}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {error && !editing && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
