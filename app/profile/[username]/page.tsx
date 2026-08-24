import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui";
import { getPublicProfile } from "@/lib/services/account";
import { AppError } from "@/lib/errors";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const { profile, vehicles } = await getPublicProfile(username).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  return (
    <>
      <PageTitle
        title={profile.displayName}
        subtitle={[`@${profile.username}`, profile.generalLocation].filter(Boolean).join(" · ")}
      />

      {profile.bio && <p className="text-body max-w-2xl text-pretty">{profile.bio}</p>}

      <SectionTitle>Garage</SectionTitle>

      {vehicles.length === 0 ? (
        <EmptyState title="No cars listed" />
      ) : (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link href={`/vehicle/${v.id}`} className="block group">
                <Card className="group-hover:bg-tertiary transition-colors duration-150">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-headline font-semibold">
                      {v.nickname ?? `${v.year} ${v.make} ${v.model}`}
                    </span>
                    <span className="text-subhead text-secondary">{v.generation}</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
