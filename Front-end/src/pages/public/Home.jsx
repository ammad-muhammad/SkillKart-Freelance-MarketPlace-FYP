import { useEffect } from "react";
import Typography from "../../Components/common/typography/typography";
import HomeBanner from "../../Components/common/Banners/HomeBanner";
import InfoBar from "../../Components/common/InfoBar/twoCol";
import FeaturedCategories from "../../Components/common/Cards/FeaturedCategories";
import LgLinks from "../../Components/common/InfoBar/LgLinks";
import LinerarTextAnimation from "../../Components/common/SrcollingText/LinerarTextAnimation";
import CardStackScroll from "../../Components/common/InfoBar/CardStackScroll";
import DroppingTextAnimation from "../../Components/common/SrcollingText/DroppingTextAnimation";
import WhatsNewCarousel from "../../Components/common/Cards/WhatsNewCarousel";
import { useCMS } from "../../cms/context/CMSContext";

const Home = () => {
  const { getPage } = useCMS();
  const homePage = getPage('home');

  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);

  // Helper to get section content by ID
  const getSectionContent = (sectionId) => {
    const section = homePage?.sections?.find(s => s.id === sectionId);
    return section?.content || {};
  };

  // Get content for all sections
  const heroContent = getSectionContent('home-hero');
  const infoBarContent = getSectionContent('home-infobar');
  const featuredContent = getSectionContent('home-featured-categories');
  const servicesContent = getSectionContent('home-services');
  const scrollingTextContent = getSectionContent('home-scrolling-text');
  const teamContent = getSectionContent('home-team');
  const blogContent = getSectionContent('home-blog');
  const ctaContent = getSectionContent('home-cta');

  return (
    <>
      <HomeBanner
        backgroundImage={heroContent.backgroundImage}
        searchIcon={heroContent.searchIcon}
        titleStart={heroContent.titleStart}
        titleEnd={heroContent.titleEnd}
        subtitle={heroContent.subtitle}
        descriptionOne={heroContent.descriptionOne}
        descriptionTwo={heroContent.descriptionTwo}
        searchPlaceholder={heroContent.searchPlaceholder}
      />
      <InfoBar
        description={infoBarContent.description}
        headlineWords={infoBarContent.headlineWords || []}
        highlightWord={infoBarContent.highlightWord}
        highlightImage={infoBarContent.highlightImage}
        primaryBtn={infoBarContent.primaryButton}
        secondaryBtn={infoBarContent.secondaryButton}
      />
      <FeaturedCategories categories={featuredContent.categories} />
      <LgLinks
        services={servicesContent.services || []}
        headerTitle={servicesContent.headerTitle}
        headerImage={servicesContent.headerImage}
        viewAllLink={servicesContent.viewAllLink}
        viewAllText={servicesContent.viewAllText}
        stats={servicesContent.stats || []}
        showStats={servicesContent.showStats}
      />
      <LinerarTextAnimation items={scrollingTextContent.items || []} />
      <CardStackScroll
        title={teamContent.title}
        cards={teamContent.cards || []}
        backgroundColor={teamContent.backgroundColor}
      />
      <WhatsNewCarousel
        posts={blogContent.posts || []}
        sectionTitle={blogContent.sectionTitle}
        sectionTitleHighlight={blogContent.sectionTitleHighlight}
        decorativeImage={blogContent.decorativeImage}
        ctaText={blogContent.ctaText}
        ctaLink={blogContent.ctaLink}
      />
      {ctaContent.id && <DroppingTextAnimation text={ctaContent.text} id={ctaContent.id} />}
    </>
  );
};

export default Home;