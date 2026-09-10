import type { Metadata } from "next";
import { AccountView } from "@/components/account/account-view";

export const metadata: Metadata = {
  title: "My Account",
  description:
    "Manage your Banning Procurement Hub profile, delivery details, security and order history.",
  alternates: { canonical: "/account/" },
};

export default function AccountPage() {
  return (
    <section className="py-20 lg:py-28" aria-label="My account">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <AccountView />
      </div>
    </section>
  );
}