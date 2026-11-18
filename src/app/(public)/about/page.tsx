export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page py-16">
      <div className="article-content mx-auto max-w-3xl">
        <h1>About QUILLORA</h1>
        <p>
          QUILLORA is a digital publishing platform built for independent writers
          and small newsrooms. It combines an editorial workflow — drafts,
          review, approval — with infrastructure designed to scale from a single
          author to a high-traffic publication.
        </p>

        <h2>Built to scale</h2>
        <ul>
          <li>Incremental Static Regeneration and CDN caching for public stories.</li>
          <li>On-demand cache revalidation on every editorial action.</li>
          <li>PostgreSQL indexing, full-text search, and N+1-free data access.</li>
          <li>Connection pooling and optional read replicas for serverless.</li>
          <li>Rate limiting, request timeouts, retries, and graceful degradation.</li>
        </ul>

        <h2>Editorial workflow</h2>
        <p>
          Authors submit stories. Editors review, approve, or unpublish them.
          Every action is auditable, and readers always see the current version.
        </p>

        <h2>Contact</h2>
        <p>
          For editorial inquiries, please reach the desk through the dashboard
          once you have an account.
        </p>
      </div>
    </div>
  );
}
