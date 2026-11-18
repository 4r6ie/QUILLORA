import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted">
          Use at least 8 characters. You will be signed in afterwards.
        </p>
      </div>
      <AuthForm mode="reset" />
    </div>
  );
}
