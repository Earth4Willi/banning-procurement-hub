import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a Banning Procurement Hub account to request quotes faster, track your orders and manage delivery details.",
  alternates: { canonical: "/register/" },
};

export default function RegisterPage() {
  return (
    <section className="py-20 lg:py-28" aria-label="Create an account">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mx-auto max-w-lg">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Customer account
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Create your account
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Save your delivery details, request quotes faster and track every order in one place.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8">
              <RegisterForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}