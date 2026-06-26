import { Hero } from "@/components/home/Hero";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { FeatureCards } from "@/components/home/FeatureCards";
import { TrustStrip } from "@/components/home/TrustStrip";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ContactSection } from "@/components/home/ContactSection";

// ISR — rebuilt at most every 5 min; admin "clear cache" can revalidate on demand.
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <BannerCarousel />
      <FeatureCards />
      <TrustStrip />
      <FeaturedProducts />
      <CategoryStrip />
      <ContactSection />
    </>
  );
}
