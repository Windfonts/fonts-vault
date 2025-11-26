import { PublicLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function FontsLoading() {
  return (
    <PublicLayout>
      <div className="container py-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-10 w-[200px]" />
          <Skeleton className="h-6 w-[400px]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filter Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-[300px]" />
              <Skeleton className="h-10 w-[200px]" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
