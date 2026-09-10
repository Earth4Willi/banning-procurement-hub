import type { Metadata } from "next";
import { Suspense } from "react";
import AdminShell from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Owner Dashboard",
  description: "Review incoming quote requests and audit events.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin/" },
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={<p className="p-6 text-sm text-ink-muted">Loading admin…</p>}
    >
      <AdminShell />
    </Suspense>
  );
}
