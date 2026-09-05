import { Skeleton } from "@/components/ui";

/*
  Retuned to the ledger's own rule positions rather than generic blocks: the
  three totals across the top and one ruled row per car, so nothing shifts
  once the real content lands.
*/
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your garage">
      <Skeleton className="h-10 w-56 mb-6" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 border-t border-separator pt-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>

      <div className="mt-10 border-t border-separator">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 border-b border-separator" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
