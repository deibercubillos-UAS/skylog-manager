import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Contact from '@/components/landing/Contact';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-[#f8f6f6] font-display antialiased">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
}