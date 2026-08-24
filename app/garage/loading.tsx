import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your garage">
      <Skeleton className="h-10 w-56 mb-6" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <ul className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <Card>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56 mt-3" />
              </Card>
            </li>
          ))}
        </ul>
        <Card>
          <Skeleton className="h-5 w-24 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 mt-3" />
          ))}
        </Card>
      </div>
    </div>
  );
}
