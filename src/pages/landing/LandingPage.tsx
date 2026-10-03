import { FinalCta, Footer, HowItWorks, ModelSection, ProductSection, RoadmapSection } from './Sections'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <ModelSection />
        <ProductSection />
        <RoadmapSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
