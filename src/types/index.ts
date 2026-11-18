export type ArticleAuthor = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type ArticleCategory = {
  id: string;
  slug: string;
  name: string;
} | null;

export type ArticleTag = {
  slug: string;
  name: string;
};

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  readingTime: number;
  publishedAt: string | null;
  author: ArticleAuthor;
  category: ArticleCategory;
  tags: ArticleTag[];
};

export type ArticleDetail = ArticleCard & {
  content: string;
  viewCount: number;
  status: "draft" | "in_review" | "published" | "archived";
  updatedAt: string;
};

export type ArticleListResult = {
  items: ArticleCard[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type AuthorProfile = {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: "reader" | "author" | "editor" | "admin";
  articleCount: number;
};

export type CategoryWithCount = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
};

export type TagWithCount = {
  id: string;
  slug: string;
  name: string;
  articleCount: number;
};

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  author: {
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
};

export type CommentListResult = {
  items: CommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type SearchResult = {
  items: ArticleCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
};
