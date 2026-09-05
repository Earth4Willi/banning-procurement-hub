import { HomeHero } from "@/components/sections/home-hero";
import { StatsBand } from "@/components/sections/stats-band";
import { CategoryGrid } from "@/components/sections/category-grid";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Testimonials } from "@/components/sections/testimonials";
import { Certifications } from "@/components/sections/certifications";
import { Faq } from "@/components/sections/faq";
import { CtaBand } from "@/components/sections/cta-band";

export default function Home() {
  return (
    <>
      <HomeHero />
      <StatsBand />
      <CategoryGrid />
      <HowItWorks />
      <Testimonials />
      <Certifications />
      <Faq />
      <CtaBand />
    </>
  );
}