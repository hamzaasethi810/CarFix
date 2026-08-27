import "server-only";
import { conflict, forbidden, notFound } from "../errors";
import {
  createReply,
  findExperienceWithShop,
  findReplyByExperience,
} from "../repositories/shop-reply";

function toReplyView(reply: {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  mechanic: { id: string; name: string };
}) {
  return {
    id: reply.id,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    shop: reply.mechanic,
  };
}

export async function getReply(experienceId: string) {
  const reply = await findReplyByExperience(experienceId);
  if (!reply) return null;
  return toReplyView(reply);
}

/**
 * A shop's one public reply to a report about it.
 *
 * Ownership is re-checked here, against the database, and never trusted from
 * the caller: a reply is a public statement attributed to a business, so
 * letting the wrong account post it would be a serious defect. `body` is
 * expected to already have passed through `shopReplySchema` (moderatedText),
 * which is where masking and slur/link rejection happen — this function does
 * not re-run that screening.
 */
export async function postReply(params: {
  experienceId: string;
  userId: string;
  body: string;
}) {
  const experience = await findExperienceWithShop(params.experienceId);
  if (!experience) throw notFound();

  if (experience.mechanic.claimedById !== params.userId) throw forbidden();

  const existing = await findReplyByExperience(params.experienceId);
  if (existing) throw conflict("This report already has a reply.");

  const created = await createReply({
    experienceId: params.experienceId,
    mechanicId: experience.mechanic.id,
    authorId: params.userId,
    body: params.body,
  });

  return toReplyView(created);
}
