import { redirect } from "next/navigation";
import { BlankForm, SheetHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getGarage } from "@/lib/services/vehicles";
import { NewExperienceForm } from "./new-experience-form";

export default async function NewExperiencePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const vehicles = await getGarage(user.id);

  if (vehicles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <SheetHeader title="Log a service" />
        <BlankForm
          heads={["Cost"]}
          title="Add a car first"
          hint="An experience is always tied to one of your cars."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SheetHeader
        title="Log a service"
        meta="Report what you paid and how it went. A receipt is optional."
      />
      <div className="mt-8">
        <NewExperienceForm
          vehicles={vehicles.map((v) => ({
            id: v.id,
            label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
          }))}
        />
      </div>
    </div>
  );
}
