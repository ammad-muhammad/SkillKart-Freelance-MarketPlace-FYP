import { useEffect } from "react";


import Navbar from '../../../Components/common/Navbar/Navbar';
import Hero from '../../../Components/common/Hero/Hero';
import SkillsSlider from '../../../Components/common/SkillsSlider/SkillsSlider';
import AboutSection from '../../../Components/common/AboutSection/AboutSection';
import TrendingSkills from '../../../Components/common/TrendingSkills/TrendingSkills';
import TeamLegacy from '../../../Components/common/TeamLegacy/TeamLegacy';
import Testimonials from '../../../Components/common/Testimonials/Testimonials';
import Footer from '../../../Components/common/Footer/Footer';
import SectionBoundary from '../../../Components/common/ErrorBoundary/SectionBoundary';

const Home = () => {
  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);

  return (
    <>
      {/* Fixed Navbar */}
      <Navbar />

      {/* Page Sections.
          Each section is wrapped in a STABLE, always-present <div>. Several
          sections render their content asynchronously (and some return null
          until real data exists). Without stable wrappers, those sections
          appearing/disappearing changes <main>'s direct children — and because
          TeamLegacy's GSAP ScrollTrigger `pin` re-parents its node into a
          generated `.pin-spacer`, React's sibling references into <main> go
          stale and it throws "Failed to execute 'insertBefore'". Fixed wrapper
          slots keep <main>'s child list constant so inserts stay local. */}
      <main>
        {/* 1. Hero / Banner */}
        <div className="home-slot"><SectionBoundary name="Hero"><Hero /></SectionBoundary></div>

        {/* 2. Skills Slider */}
        <div className="home-slot"><SectionBoundary name="SkillsSlider"><SkillsSlider /></SectionBoundary></div>

        {/* 3. About SkillKart (AI Modules) */}
        <div className="home-slot"><SectionBoundary name="AboutSection"><AboutSection /></SectionBoundary></div>

        {/* 4. Trending Skills */}
        <div className="home-slot"><SectionBoundary name="TrendingSkills"><TrendingSkills /></SectionBoundary></div>

        {/* 5. Team Legacy */}
        <div className="home-slot"><SectionBoundary name="TeamLegacy"><TeamLegacy /></SectionBoundary></div>

        {/* 6. Testimonials / Success Stories */}
        <div className="home-slot"><SectionBoundary name="Testimonials"><Testimonials /></SectionBoundary></div>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default Home;