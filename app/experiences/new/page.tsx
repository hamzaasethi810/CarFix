import { redirect } from "next/navigation";
import { EmptyState, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getGarage } from "@/lib/services/vehicles";
import { NewExperienceForm } from "./new-experience-form";

export default async function NewExperiencePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const vehicles = await getGarage(user.id);

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
      />
    </div>
  );
}
