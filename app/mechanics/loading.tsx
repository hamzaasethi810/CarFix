import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading mechanics">
      <Skeleton className="h-10 w-64 mb-6" />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
      <ul className="space-y-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Card>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full mt-3" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
