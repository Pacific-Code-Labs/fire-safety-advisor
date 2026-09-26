import { ListSkeleton, Skeleton } from "@pacific-code-labs/fire-code-design-system";
import { Header } from "@/components/Header";
import { useLang } from "@/contexts/LangContext";

/** Shown while the demo chunk loads: the demo's own shape (title, filters, rules, assistant). */
export function DemoSkeleton() {
  const { tr } = useLang();
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main aria-busy="true" className="container flex-1 px-4 py-4">
        <span className="sr-only">{tr.loading}</span>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-4 lg:flex-1">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="panel space-y-3 p-4">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            </div>
            <ListSkeleton rows={4} />
          </div>
          <div className="hidden lg:block lg:w-[360px] lg:shrink-0">
            <Skeleton className="h-[calc(100dvh-7rem)] w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
