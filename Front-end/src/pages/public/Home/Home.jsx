import { useEffect } from "react";


import Navbar from '../../../Components/common/Navbar/Navbar';
import Hero from '../../../Components/common/Hero/Hero';
import SkillsSlider from '../../../Components/common/SkillsSlider/SkillsSlider';
import AboutSection from '../../../Components/common/AboutSection/AboutSection';
import AppDownload from '../../../Components/common/AppDownload/AppDownload';
import TrendingSkills from '../../../Components/common/TrendingSkills/TrendingSkills';
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

      {/* Page Sections. */}
      <main>
        {/* 1. Hero / Banner */}
        <div className="home-slot"><SectionBoundary name="Hero"><Hero /></SectionBoundary></div>

        {/* 2. Skills Slider */}
        <div className="home-slot"><SectionBoundary name="SkillsSlider"><SkillsSlider /></SectionBoundary></div>

        {/* 3. About SkillKart (AI Modules) */}
        <div className="home-slot"><SectionBoundary name="AboutSection"><AboutSection /></SectionBoundary></div>

        {/* 3.5. Mobile App APK Download Banner */}
        <div className="home-slot"><SectionBoundary name="AppDownload"><AppDownload /></SectionBoundary></div>

        {/* 4. Trending Skills */}
        <div className="home-slot"><SectionBoundary name="TrendingSkills"><TrendingSkills /></SectionBoundary></div>

        {/* 5. Testimonials / Success Stories */}
        <div className="home-slot"><SectionBoundary name="Testimonials"><Testimonials /></SectionBoundary></div>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default Home;