import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Banning Procurement Hub account to check quotes and orders, and manage your delivery details.",
  alternates: { canonical: "/login/" },
};

export default function LoginPage() {
  return (
    <section className="py-20 lg:py-28" aria-label="Sign in">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mx-auto max-w-md">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Customer account
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Welcome back
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Sign in to check your quotes and orders, and manage your delivery details.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8">
              <LoginForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}