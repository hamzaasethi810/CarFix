import { notFound } from "next/navigation";
import { BlankForm, Columns, OperationLine, SectionTitle, SheetHeader } from "@/components/ui";
import { getPublicProfile } from "@/lib/services/account";
import { AppError } from "@/lib/errors";

/*
  An owner's index, not forty-eight lines of grey boxes.

  The garage used to be a stack of Cards, each one a rounded tile with a
  nickname and a chassis code sitting inside it — this was the weakest page
  on the site by a wide margin. It is a ruled index now, the same one the
  garage and vehicle pages use: one line per car, its generation in the
  column that promises it.
*/
export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const { profile, vehicles } = await getPublicProfile(username).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  return (
    <>
      <SheetHeader
        title={profile.displayName}
        meta={[`@${profile.username}`, profile.generalLocation].filter(Boolean).join(" · ")}
      />

      {profile.bio && <p className="text-body max-w-2xl text-pretty mt-2">{profile.bio}</p>}

      <SectionTitle>Garage</SectionTitle>

      {vehicles.length === 0 ? (
        <BlankForm heads={["Generation"]} title="No cars listed" />
      ) : (
        <Columns heads={["Generation"]} label="Garage">
          {vehicles.map((v) => (
            <OperationLine
              key={v.id}
              label={v.nickname ?? `${v.year} ${v.make} ${v.model}`}
              figures={[v.generation]}
              href={`/vehicle/${v.id}`}
            />
          ))}
        </Columns>
      )}
    </>
  );
}
