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
    <section className="py-20 lg:py-28" aria-label="Owner dashboard">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <Suspense
          fallback={
            <p className="p-6 text-sm text-ink-muted">Loading admin…</p>
          }
        >
          <AdminShell />
        </Suspense>
      </div>
    </section>
  );
}
