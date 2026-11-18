import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, dash-separated");

export const articleInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(400).optional(),
  content: z.string().trim().min(1).max(50_000),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagSlugs: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  status: z.enum(["draft", "in_review", "published", "archived"]).optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export const commentInputSchema = z.object({
  articleId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  authorName: z.string().trim().min(1).max(80).optional(),
});

export type CommentInput = z.infer<typeof commentInputSchema>;

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().max(500).optional().nullable(),
  role: z.enum(["reader", "author", "editor", "admin"]).optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
