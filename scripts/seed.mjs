/**
 * QUILLORA database seed.
 *
 * Run after migrations:
 *   npm run db:seed
 *
 * Creates categories, tags, author/editor profiles, published + draft +
 * in-review + archived articles, and approved comments. Idempotent: uses
 * `ON CONFLICT DO NOTHING` where possible.
 */
import { randomUUID } from "node:crypto";

import { loadEnv, withClient, log } from "./lib.mjs";

const CATEGORIES = [
  { slug: "technology", name: "Technology", description: "Software, infrastructure, and the modern web." },
  { slug: "culture", name: "Culture", description: "How technology shapes the way we live." },
  { slug: "science", name: "Science", description: "Research, space, and the natural world." },
  { slug: "business", name: "Business", description: "Markets, startups, and the economy." },
  { slug: "opinion", name: "Opinion", description: "Argument and analysis from our contributors." },
];

const TAGS = [
  { slug: "performance", name: "performance" },
  { slug: "scalability", name: "scalability" },
  { slug: "security", name: "security" },
  { slug: "databases", name: "databases" },
  { slug: "web", name: "web" },
  { slug: "tutorial", name: "tutorial" },
  { slug: "ai", name: "ai" },
  { slug: "devops", name: "devops" },
];

const PROFILES = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "editor@quillora.dev",
    username: "editor",
    full_name: "Eleanor Editor",
    bio: "Editor-in-chief. Reads everything twice.",
    role: "editor",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "ada@quillora.dev",
    username: "ada",
    full_name: "Ada Okafor",
    bio: "Staff writer covering infrastructure and databases.",
    role: "author",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "grace@quillora.dev",
    username: "grace",
    full_name: "Grace Tan",
    bio: "Engineer turned writer. Performance nerd.",
    role: "author",
  },
];

const ARTICLES = [
  {
    slug: "caching-that-actually-scales",
    title: "Caching That Actually Scales",
    excerpt: "Most caching advice stops at 'add Redis'. Here is the model that holds up under real traffic.",
    category: "technology",
    tags: ["performance", "scalability", "web"],
    author: "ada",
    status: "published",
    reading_time: 8,
    content: `<p>Caching is easy to add and hard to keep correct. The trick is to treat the cache as a speed optimization, never as the source of truth.</p><h2>Tag-based invalidation</h2><p>Give every cached read a tag, then invalidate on write. Readers either see the new value or a slightly stale one — never a missing one.</p><blockquote>Serve stale, refresh in the background, and never block a reader on a revalidation.</blockquote><h2>Hit ratios are a lagging indicator</h2><p>Watch eviction rates and origin load instead. If origin load stays low, your cache is doing its job.</p>`,
  },
  {
    slug: "postgres-indexes-for-editorial-workloads",
    title: "PostgreSQL Indexes for Editorial Workloads",
    excerpt: "Composite indexes, partial indexes, and why your feed query does not need a full table scan.",
    category: "technology",
    tags: ["databases", "performance"],
    author: "grace",
    status: "published",
    reading_time: 6,
    content: `<p>An editorial feed has one dominant query shape: published rows, newest first, filtered by category or author.</p><pre><code>CREATE INDEX ON articles (status, published_at DESC);</code></pre><p>That single index removes the sort and the scan from the hottest path.</p>`,
  },
  {
    slug: "the-hidden-cost-of-n-plus-one",
    title: "The Hidden Cost of N+1",
    excerpt: "One extra query per row does not sound bad until you multiply it by a thousand page views.",
    category: "technology",
    tags: ["databases", "web", "tutorial"],
    author: "grace",
    status: "published",
    reading_time: 5,
    content: `<p>N+1 queries are the quiet killer of read-heavy applications. Load relations in a constant number of queries, not per row.</p>`,
  },
  {
    slug: "rate-limiting-without-redis",
    title: "Rate Limiting Without Redis",
    excerpt: "A Postgres-backed fixed-window limiter is enough for most teams, and it fails open.",
    category: "technology",
    tags: ["security", "scalability"],
    author: "ada",
    status: "published",
    reading_time: 7,
    content: `<p>You do not need Redis to rate limit. An atomic upsert on a counter table is simple, durable, and observable.</p>`,
  },
  {
    slug: "reading-replicas-when-and-why",
    title: "Read Replicas: When and Why",
    excerpt: "Replicas are not free scaling. Here is the measurement that tells you whether you need one.",
    category: "technology",
    tags: ["databases", "scalability"],
    author: "ada",
    status: "published",
    reading_time: 9,
    content: `<p>Replicas help when read volume outpaces a single primary. Measure replication lag before you add one.</p>`,
  },
  {
    slug: "why-we-design-for-degradation",
    title: "Why We Design for Degradation",
    excerpt: "The goal is not five nines. It is a system that fails in ways users can understand.",
    category: "opinion",
    tags: ["devops", "scalability"],
    author: "editor",
    status: "published",
    reading_time: 4,
    content: `<p>Graceful degradation is a feature. Decide what the system should do when the database is slow, and test it.</p>`,
  },
  {
    slug: "a-field-guide-to-load-testing",
    title: "A Field Guide to Load Testing",
    excerpt: "Load tests are hypotheses with a stopwatch. Write them down before you run them.",
    category: "technology",
    tags: ["performance", "devops", "tutorial"],
    author: "grace",
    status: "published",
    reading_time: 10,
    content: `<p>Start with a smoke test, then a stress test, then a soak. Change one variable at a time.</p>`,
  },
  {
    slug: "the-editorial-queue-as-a-system",
    title: "The Editorial Queue as a System",
    excerpt: "Review queues are databases too. Design them so editors are not the bottleneck.",
    category: "culture",
    tags: ["web", "tutorial"],
    author: "editor",
    status: "published",
    reading_time: 6,
    content: `<p>A queue is a workflow with a database behind it. Make the default action the right one.</p>`,
  },
  {
    slug: "observability-is-a-writing-tool",
    title: "Observability Is a Writing Tool",
    excerpt: "Dashboards tell you what happened; logs tell you why. Both matter.",
    category: "technology",
    tags: ["devops"],
    author: "ada",
    status: "published",
    reading_time: 5,
    content: `<p>Instrument the paths that touch money and user trust first. Everything else can wait.</p>`,
  },
  {
    slug: "designing-for-cost",
    title: "Designing for Cost from Day One",
    excerpt: "Cost is a non-functional requirement. Put it next to latency and availability.",
    category: "business",
    tags: ["scalability"],
    author: "editor",
    status: "published",
    reading_time: 7,
    content: `<p>Every cache, index, and replica is a cost decision. Make those decisions explicit.</p>`,
  },
  {
    slug: "the-case-against-premature-sharding",
    title: "The Case Against Premature Sharding",
    excerpt: "Sharding is a last resort, not a growth strategy.",
    category: "opinion",
    tags: ["databases", "scalability"],
    author: "grace",
    status: "published",
    reading_time: 6,
    content: `<p>Fix the queries before you fix the topology. Most workloads fit on one well-indexed primary.</p>`,
  },
  {
    slug: "images-at-scale",
    title: "Images at Scale Without Breaking the Bank",
    excerpt: "Storage CDNs plus on-demand transforms beat storing fifty derivatives.",
    category: "technology",
    tags: ["performance", "web"],
    author: "ada",
    status: "published",
    reading_time: 5,
    content: `<p>Store the original once. Resize at the edge, cache aggressively, and let the browser pick a size.</p>`,
  },
  {
    slug: "notes-on-incident-review",
    title: "Notes on Incident Review",
    excerpt: "Blame-free reviews work only if the action items are specific and owned.",
    category: "culture",
    tags: ["devops"],
    author: "editor",
    status: "published",
    reading_time: 4,
    content: `<p>An incident review without owners is a post-mortem, not a review.</p>`,
  },
  {
    slug: "search-that-survives-real-queries",
    title: "Search That Survives Real Queries",
    excerpt: "Full-text search with GIN indexes beats LIKE scans at every scale that matters.",
    category: "technology",
    tags: ["databases", "performance", "tutorial"],
    author: "grace",
    status: "published",
    reading_time: 8,
    content: `<p>Parameterize the query, index the tsvector, and paginate. Never load the whole table.</p>`,
  },
  {
    slug: "draft-scaling-the-newsroom",
    title: "Scaling the Newsroom",
    excerpt: "Draft: how editorial teams grow without losing quality.",
    category: "culture",
    tags: ["web"],
    author: "editor",
    status: "draft",
    reading_time: 3,
    content: `<p>Draft in progress.</p>`,
  },
  {
    slug: "in-review-the-future-of-feeds",
    title: "The Future of Feeds",
    excerpt: "In review: algorithmic feeds versus chronological ones.",
    category: "culture",
    tags: ["web", "ai"],
    author: "ada",
    status: "in_review",
    reading_time: 5,
    content: `<p>In review.</p>`,
  },
  {
    slug: "archived-monoliths",
    title: "Monoliths Are Fine",
    excerpt: "Archived: a defense of the well-structured monolith.",
    category: "opinion",
    tags: ["web"],
    author: "grace",
    status: "archived",
    reading_time: 4,
    content: `<p>Archived.</p>`,
  },
];

async function seed(client) {
  for (const category of CATEGORIES) {
    await client.query(
      `INSERT INTO categories (id, slug, name, description, created_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (slug) DO NOTHING`,
      [randomUUID(), category.slug, category.name, category.description],
    );
  }

  for (const tag of TAGS) {
    await client.query(
      `INSERT INTO tags (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [randomUUID(), tag.slug, tag.name],
    );
  }

  for (const profile of PROFILES) {
    await client.query(
      `INSERT INTO profiles (id, email, username, full_name, bio, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         bio = EXCLUDED.bio,
         role = EXCLUDED.role`,
      [profile.id, profile.email, profile.username, profile.full_name, profile.bio, profile.role],
    );
  }

  const categoryRows = await client.query(`SELECT id, slug FROM categories`);
  const tagRows = await client.query(`SELECT id, slug FROM tags`);
  const profileRows = await client.query(`SELECT id, username FROM profiles`);
  const categoryId = new Map(categoryRows.rows.map((row) => [row.slug, row.id]));
  const tagId = new Map(tagRows.rows.map((row) => [row.slug, row.id]));
  const profileId = new Map(profileRows.rows.map((row) => [row.username, row.id]));

  let publishedCount = 0;
  for (const article of ARTICLES) {
    const isPublished = article.status === "published";
    const publishedAt = isPublished
      ? new Date(Date.now() - publishedCount * 36 * 60 * 60 * 1000)
      : null;
    publishedCount += 1;

    const result = await client.query(
      `INSERT INTO articles
         (id, slug, title, excerpt, content, status, reading_time, view_count,
          author_id, category_id, published_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         content = EXCLUDED.content,
         status = EXCLUDED.status,
         published_at = EXCLUDED.published_at
       RETURNING id`,
      [
        randomUUID(),
        article.slug,
        article.title,
        article.excerpt,
        article.content,
        article.status,
        article.reading_time,
        Math.floor(Math.random() * 4000),
        profileId.get(article.author),
        categoryId.get(article.category),
        publishedAt,
      ],
    );
    const articleId = result.rows[0].id;

    await client.query(`DELETE FROM article_tags WHERE article_id = $1`, [articleId]);
    for (const slug of article.tags) {
      const id = tagId.get(slug);
      if (id) {
        await client.query(
          `INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [articleId, id],
        );
      }
    }

    if (isPublished) {
      await client.query(
        `INSERT INTO comments (id, article_id, author_name, content, status, created_at)
         VALUES ($1, $2, $3, $4, 'approved', now())`,
        [randomUUID(), articleId, "A Reader", "Great piece — shared it with my team."],
      );
    }
  }

  const counts = await client.query(`
    SELECT
      (SELECT count(*) FROM articles) AS articles,
      (SELECT count(*) FROM articles WHERE status = 'published') AS published,
      (SELECT count(*) FROM categories) AS categories,
      (SELECT count(*) FROM tags) AS tags,
      (SELECT count(*) FROM profiles) AS profiles,
      (SELECT count(*) FROM comments) AS comments
  `);
  log("seed complete:", counts.rows[0]);
}

loadEnv(".env.local");
loadEnv(".env");

withClient(seed).catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
