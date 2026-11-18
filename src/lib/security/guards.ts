import "server-only";

import type { Role } from "@prisma/client";

import { prismaRead } from "@/lib/db/read";
import { getSessionUser } from "@/lib/supabase/server";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/resilience/errors";

export type CurrentUserProfile = {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
};

export type CurrentUser = {
  id: string;
  email: string;
  profile: CurrentUserProfile | null;
};

const profileSelect = {
  id: true,
  username: true,
  fullName: true,
  bio: true,
  avatarUrl: true,
  role: true,
} as const;

/**
 * Resolve the current Supabase Auth user plus their QUILLORA profile.
 * `auth.getUser()` verifies the JWT server-side, so a forged cookie cannot
 * impersonate another user.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authUser = await getSessionUser();
  if (!authUser) return null;

  const profile = await prismaRead.profile.findUnique({
    where: { id: authUser.id },
    select: profileSelect,
  });

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    profile,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.profile) {
    throw new ForbiddenError("Complete your author profile first.");
  }
  if (!roles.includes(user.profile.role)) {
    throw new ForbiddenError();
  }
  return user;
}

/** True when the user may edit a given article. */
export function canEditArticle(
  user: CurrentUser,
  article: { authorId: string; status: string },
): boolean {
  if (!user.profile) return false;
  if (user.profile.role === "admin" || user.profile.role === "editor") return true;
  return article.authorId === user.id;
}
