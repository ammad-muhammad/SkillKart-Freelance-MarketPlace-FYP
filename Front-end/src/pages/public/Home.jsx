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
        backgroundImage="https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"
        searchIcon="/public/assets/icons/ic-search.svg"
        titleStart="We Create"
        titleEnd="Category Leaders"
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
