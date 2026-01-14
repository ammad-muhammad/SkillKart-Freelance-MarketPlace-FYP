import { useEffect } from "react";
import Typography from "../../Components/common/typography/typography";
import HomeBanner from "../../Components/common/Banners/HomeBanner";

const Home = () => {
  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);
  return (
    <>
      <HomeBanner
        backgroundImage="https://images.pexels.com/photos/459203/pexels-photo-459203.jpeg"
        animationImage="freelancerAnimation.png"
        searchIcon="ic-search.svg"
        titleStart="We Create Category"
        titleEnd="Leaders"
        subtitle="on every searchable platform"
        descriptionOne="Organic media planners creating, distributing & optimising search-first content for SEO, Social, PR"
        descriptionTwo="4 Global Offices serving UK, USA (New York) & EU"
        searchPlaceholder="Search anything..."
      />

      <section>
        <div className="container">
          <Typography />
        </div>
      </section>
    </>
  );
};

export default Home;
