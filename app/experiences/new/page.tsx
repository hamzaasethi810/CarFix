import { redirect } from "next/navigation";
import { EmptyState, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getGarage } from "@/lib/services/vehicles";
import { getServices } from "@/lib/services/taxonomy";
import { search } from "@/lib/services/mechanics";
import { NewExperienceForm } from "./new-experience-form";

export default async function NewExperiencePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [vehicles, services, mechanics] = await Promise.all([
    getGarage(user.id),
    getServices(),
    search({ verifiedOnly: false, limit: 50, offset: 0 }),
  ]);

  if (vehicles.length === 0) {
    return (
      <>
        <PageTitle title="Log a service" />
        <EmptyState
          title="Add a car first"
          hint="An experience is always tied to one of your cars."
        />
      </>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Log a service"
        subtitle="Report what you paid and how it went. A receipt is optional."
      />
      <NewExperienceForm
        vehicles={vehicles.map((v) => ({
          id: v.id,
          label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
        }))}
        services={services}
        mechanics={mechanics.items.map((m) => ({
          id: m.id,
          label: `${m.name} — ${m.city}, ${m.state}`,
        }))}
      />
    </div>
  );
}
