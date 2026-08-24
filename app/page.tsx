import { search } from "@/lib/services/mechanics";
import { getMakes } from "@/lib/services/taxonomy";
import { Discover } from "./discover";

// The map is the front page: shops as pins, filters and results on glass above it.
export default async function HomePage() {
  const [makes, initial] = await Promise.all([
    getMakes(),
    search({ verifiedOnly: false, limit: 50, offset: 0 }),
  ]);

  return <Discover makes={makes} initial={initial.items} />;
}
