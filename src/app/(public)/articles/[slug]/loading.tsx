export default function ArticleLoading() {
  return (
    <div className="container-page animate-pulse space-y-8 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-32 rounded bg-border" />
        <div className="h-10 w-full rounded bg-border" />
        <div className="h-10 w-2/3 rounded bg-border" />
        <div className="h-4 w-48 rounded bg-border" />
      </div>
      <div className="mx-auto h-72 max-w-4xl rounded-3xl bg-border" />
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-5/6 rounded bg-border" />
      </div>
    </div>
  );
}
