// Yükleme iskeletleri: sayfa verisi gelene kadar sayfanın kabaca şeklini gösterir.
// loading.tsx dosyaları ve sayfalardaki Suspense yedekleri bunları kullanır.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800 ${className}`} />;
}

function Title({ text }: { text?: string }) {
  return text ? <h1 className="text-2xl font-semibold">{text}</h1> : <Skeleton className="h-8 w-40" />;
}

function Rows({ count, className = "h-10" }: { count: number; className?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Yükleniyor" className="space-y-6">
      {children}
    </div>
  );
}

export function HomeBodySkeleton() {
  return (
    <>
      <div className="space-y-4 lg:col-span-2">
        <section className="card space-y-3">
          <Skeleton className="h-6 w-44" />
          <Rows count={3} />
        </section>
        <section className="card space-y-3">
          <Skeleton className="h-5 w-56" />
          <Rows count={4} className="h-8" />
        </section>
      </div>
      <aside className="space-y-4">
        <section className="card flex items-center gap-5">
          <Skeleton className="h-36 w-36 shrink-0 rounded-full" />
          <Rows count={3} className="h-4 w-28" />
        </section>
        <section className="card space-y-3">
          <Skeleton className="h-36 w-36 rounded-full" />
          <Skeleton className="h-32" />
        </section>
      </aside>
    </>
  );
}

export function HomeSkeleton() {
  return (
    <Loading>
      <div>
        <Title text="Ana ekran" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <HomeBodySkeleton />
      </div>
    </Loading>
  );
}

export function GoalsBodySkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Title text="Hedefler" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <section key={i} className="card space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Rows count={3} className="h-8" />
          </section>
        ))}
      </div>
    </>
  );
}

export function GoalsSkeleton() {
  return (
    <Loading>
      <GoalsBodySkeleton />
    </Loading>
  );
}

export function CalendarBodySkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="card space-y-3 p-3">
        <div className="flex justify-between">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-[420px] md:h-[640px]" />
      </div>
      <aside className="card h-fit space-y-3">
        <Skeleton className="h-5 w-24" />
        <Rows count={5} className="h-8" />
      </aside>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <Loading>
      <Title text="Takvim" />
      <CalendarBodySkeleton />
    </Loading>
  );
}

export function TodosBodySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 rounded-xl" />
      <section className="card space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Rows count={4} />
      </section>
      <section className="card space-y-3">
        <Skeleton className="h-5 w-28" />
        <Rows count={3} className="h-8" />
      </section>
    </div>
  );
}

export function TodosSkeleton() {
  return (
    <Loading>
      <Title text="Yapılacaklar" />
      <TodosBodySkeleton />
    </Loading>
  );
}

export function TimerBodySkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Title text="Sayaç" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="card flex flex-col items-center gap-6 px-4 py-6 md:py-8">
        <Skeleton className="aspect-square w-[min(18rem,calc(100vw-4rem))] rounded-full" />
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
      <section className="card space-y-3">
        <Skeleton className="h-5 w-40" />
        <Rows count={3} className="h-7" />
      </section>
    </>
  );
}

export function TimerSkeleton() {
  return (
    <Loading>
      <TimerBodySkeleton />
    </Loading>
  );
}

export function StatsBodySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <section className="card space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-64" />
      </section>
      <section className="card space-y-3">
        <Skeleton className="h-5 w-32" />
        <Rows count={4} className="h-6" />
      </section>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <Loading>
      <Title text="İstatistik" />
      <StatsBodySkeleton />
    </Loading>
  );
}

export function SettingsSkeleton() {
  return (
    <Loading>
      <div className="max-w-2xl space-y-6">
        <Title text="Ayarlar" />
        <section className="card space-y-3">
          <Skeleton className="h-5 w-16" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </section>
        <section className="card space-y-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-28" />
        </section>
      </div>
    </Loading>
  );
}

export function DayPlanBodySkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Title text="Gün planı" />
        <Skeleton className="ml-auto h-10 w-24" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <section className="card">
          <Rows count={8} className="h-12" />
        </section>
        <aside className="card h-fit space-y-3">
          <Skeleton className="h-5 w-24" />
          <Rows count={4} className="h-8" />
        </aside>
      </div>
    </>
  );
}

export function DayPlanSkeleton() {
  return (
    <Loading>
      <DayPlanBodySkeleton />
    </Loading>
  );
}
