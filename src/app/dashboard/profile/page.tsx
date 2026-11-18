import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/security/guards";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = user.profile;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted">How readers see you.</p>
      </div>
      <ProfileForm
        initial={{
          fullName: profile?.fullName ?? "",
          bio: profile?.bio ?? "",
          avatarUrl: profile?.avatarUrl ?? "",
        }}
      />
    </div>
  );
}
