import React, { Suspense } from "react";
import { LoginForm } from "@/components/pages/auth/login-form";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] text-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
