import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle } from "@/components/ui";
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

      {profile.bio && <p className="text-sm mb-8 max-w-2xl">{profile.bio}</p>}

      <h2 className="text-lg font-medium mb-3">Garage</h2>
      {vehicles.length === 0 ? (
        <EmptyState title="No cars listed" />
      ) : (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link href={`/vehicle/${v.id}`}>
                <Card className="hover:border-accent transition-colors">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {v.nickname ?? `${v.year} ${v.make} ${v.model}`}
                    </span>
                    <span className="text-sm text-muted">{v.generation}</span>
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
