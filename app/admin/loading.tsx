import { AdminLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    </AdminLayout>
  );
}
