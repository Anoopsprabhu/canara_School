import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

// Already signed in? Go straight to the portal rather than showing the sign-in
// form underneath the navbar.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) {
    const next = (await searchParams).next;
    redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
