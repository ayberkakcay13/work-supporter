export function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="card text-sm text-zinc-500 dark:text-zinc-400">
        Bu ekran {stage}. aşamada eklenecek.
      </div>
    </div>
  );
}
