import { useEffect } from "react";


import Navbar from '../../../Components/common/Navbar/Navbar';
import Hero from '../../../Components/common/Hero/Hero';
import SkillsSlider from '../../../Components/common/SkillsSlider/SkillsSlider';
import AboutSection from '../../../Components/common/AboutSection/AboutSection';
import TrendingSkills from '../../../Components/common/TrendingSkills/TrendingSkills';
import TeamLegacy from '../../../Components/common/TeamLegacy/TeamLegacy';
import Testimonials from '../../../Components/common/Testimonials/Testimonials';
import Footer from '../../../Components/common/Footer/Footer';

const Home = () => {
  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);

  return (
    <>
      {/* Fixed Navbar */}
      <Navbar />

      {/* Page Sections */}
      <main>
        {/* 1. Hero / Banner */}
        <Hero />

        {/* 2. Skills Slider */}
        <SkillsSlider />

        {/* 3. About SkillKart (AI Modules) */}
        <AboutSection />

        {/* 4. Trending Skills */}
        <TrendingSkills />

        {/* 5. Team Legacy */}
        <TeamLegacy />

        {/* 6. Testimonials / Success Stories */}
        <Testimonials />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default Home;