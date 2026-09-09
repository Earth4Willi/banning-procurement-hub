import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

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
        <AdminDashboard />
      </div>
    </section>
  );
}