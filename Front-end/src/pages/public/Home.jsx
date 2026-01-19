import { useEffect } from "react";
import Typography from "../../Components/common/typography/typography";
import HomeBanner from "../../Components/common/Banners/HomeBanner";
import InfoBar from "../../Components/common/InfoBar/twoCol";
import FeaturedCategories from "../../Components/common/category/FeaturedCategories";

const Home = () => {
  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);
  return (
    <>
      <HomeBanner
        backgroundImage="https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"
        searchIcon="/assets/icons/ic-search.svg"
        titleStart="We Create"
        titleEnd="Category Leaders"
        subtitle="on every searchable platform"
        descriptionOne="Organic media planners creating, distributing & optimising search-first content for SEO, Social, PR"
        descriptionTwo="4 Global Offices serving UK, USA (New York) & EU"
        searchPlaceholder="Search anything..."
      />
      <InfoBar
        description="A global team of search-first content marketers engineering semantic relevancy & category signals for both the internet and people"
        headlineWords={["Driving", "Demand", "&"]}
        highlightWord="Discovery"
        highlightImage="https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"
        primaryBtn={{ text: "Our Story", link: "/story" }}
        secondaryBtn={{ text: "Our Services", link: "/services" }}
      />
      <FeaturedCategories>

      </FeaturedCategories>

      <section>
        <div className="container">
          <Typography />
        </div>
      </section>
    </>
  );
};

export default Home;
