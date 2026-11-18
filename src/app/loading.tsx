export default function RootLoading() {
  return (
    <div className="container-page animate-pulse space-y-6 py-12">
      <div className="h-10 w-2/3 rounded bg-border" />
      <div className="h-4 w-40 rounded bg-border" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-64 rounded-2xl bg-border" />
        ))}
      </div>
    </div>
  );
}
