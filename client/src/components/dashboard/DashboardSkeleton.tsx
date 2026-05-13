import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AppPageShell } from '@/components/layout/AppPageShell'

export function DashboardSkeleton() {
  return (
    <AppPageShell contentClassName="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>

        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/60 py-0 shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-[88px] w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
            <div className="flex flex-col gap-6 xl:col-span-7 2xl:col-span-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-6 xl:col-span-5 2xl:col-span-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <Skeleton className="h-10 flex-1 rounded-lg" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
    </AppPageShell>
  )
}
