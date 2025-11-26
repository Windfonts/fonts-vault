import { PublicLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function FontDetailLoading() {
  return (
    <PublicLayout>
      <div className="container py-8">
        {/* Breadcrumb Skeleton */}
        <Skeleton className="mb-6 h-5 w-[300px]" />

        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="mb-2 h-12 w-[400px]" />
          <Skeleton className="mb-4 h-6 w-[300px]" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-5 w-[150px]" />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Content Skeleton */}
          <div className="space-y-8">
            <Skeleton className="h-[600px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>

          {/* Sidebar Skeleton */}
          <aside className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
