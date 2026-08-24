import { search } from "@/lib/services/mechanics";
import { getMakes, getServices } from "@/lib/services/taxonomy";
import { Discover } from "./discover";

// The map is the front page: shops as pins, filters and results on glass above it.
export default async function HomePage() {
  const [makes, services, initial] = await Promise.all([
    getMakes(),
    getServices(),
    search({ verifiedOnly: false, limit: 50, offset: 0 }),
  ]);

  return <Discover makes={makes} services={services} initial={initial.items} />;
}
