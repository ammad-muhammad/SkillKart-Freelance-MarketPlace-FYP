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

const Home = () => {
  useEffect(() => {
    document.title = "Home - SkillKart";
  }, []);

  const servicesData = [
    { id: 1, name: "Digital PR", icon: "Zap", desc: "Amplify your brand story", link: "/digital-pr" },
    { id: 2, name: "Organic Social & Content", icon: "Users", desc: "Engage and grow your audience", link: "/social-content" },
    { id: 3, name: "Search & Growth Strategy", icon: "TrendingUp", desc: "Scale with data-driven insights", link: "/growth-strategy" },
    { id: 4, name: "Content Experience", icon: "Target", desc: "Create memorable interactions", link: "/content-experience" },
    { id: 5, name: "Data & Insights", icon: "BarChart3", desc: "Transform data into action", link: "/data-insights" },
    { id: 6, name: "Onsite SEO", icon: "Search", desc: "Optimize for visibility", link: "/onsite-seo" },
  ];

  const statsData = [
    { value: "500+", label: "Projects Delivered" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "50+", label: "Team Experts" },
    { value: "24/7", label: "Support Available" },
  ];

  const linerText = [
    { text: 'Innovation First', image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop' },
    { text: 'Design Matters', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop' },
    { text: 'Build Better', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop' },
  ];

  const sampleCards = [
    {
      id: 0,
      title: 'Ammad',
      position: "CEO",
      bgColor: '#000000',
      textColor: '#ffffff',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "We're dedicated to creating the industry narrative that others follow 3 years from now. We paved the path for creative SEO, multi-channel search with Digital PR, and Social Search and we will continue to do it.",
      rotate: 4
    },
    {
      id: 1,
      title: 'Sumair',
      position: "Founder",
      bgColor: '#ffffff',
      textColor: '#000000',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "A roll top bath full of 79 awards. Voted The Drum's best agency outside of London. We are official judges for industry awards including Global Search Awards and Global Content Marketing Awards.",
      rotate: 8
    },
    {
      id: 2,
      title: 'Sherry',
      position: "Co-Founder",
      bgColor: '#000000',
      textColor: '#ffffff',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "People ask us why we are called Rise at Seven? Ever heard the saying Early Bird catches the worm? Google is moving fast, but humans are moving faster. We chase consumers, not algorithms.",
      rotate: 12
    },
    {
      id: 3,
      title: 'Shammer',
      position: "Dishwasher",
      bgColor: '#ffffff',
      textColor: '#000000',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "We've created a service which takes ideas to result within 60 minutes. Our team is dedicated to pushing boundaries and delivering exceptional results.",
      rotate: 16
    },
     {
      id: 4,
      title: 'Syed Obaid',
      position: "CO-CEO",
      bgColor: '#000000',
      textColor: '#ffffff',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "We've created a service which takes ideas to result within 60 minutes. Our team is dedicated to pushing boundaries and delivering exceptional results.",
      rotate: 20
    },
     {
      id: 5,
      title: 'Lamiz Khan',
      position: "QA Lead",
      bgColor: '#ffffff',
      textColor: '#000000',
      image: 'https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg',
      description: "We've created a service which takes ideas to result within 60 minutes. Our team is dedicated to pushing boundaries and delivering exceptional results.",
      rotate: 4
    },
  ];


  const blogPosts = [
    {
      id: 1,
      title: "Rise at Seven appointed by Quorn for multi-channel marketing services",
      category: "Social Search",
      categoryBg: "bg-black",
      author: "Ray Saddiq",
      authorImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      readTime: "2 mins",
      image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      link: "/blog/post-1"
    },
    {
      id: 2,
      title: "RESOURCE: 40+ traffic sources",
      category: "Social Search",
      categoryBg: "bg-black",
      authors: ["Carrie Rose", "Ray Saddiq"],
      authorImages: ["https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg", "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"],
      readTime: "3 mins",
      image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      link: "/blog/post-2"
    },
    {
      id: 3,
      title: "Rise at Seven appointed by Quorn for multi-channel marketing services",
      category: "Social Search",
      categoryBg: "bg-black",
      author: "Ray Saddiq",
      authorImage: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      readTime: "2 mins",
      image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      link: "/blog/post-1"
    },
    {
      id: 4,
      title: "RESOURCE: 40+ traffic sources",
      category: "Social Search",
      categoryBg: "bg-black",
      authors: ["Carrie Rose", "Ray Saddiq"],
      authorImages: ["https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg", "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"],
      readTime: "3 mins",
      image: "https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg",
      link: "/blog/post-2"
    },
    // ... more posts
  ];


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
      <LgLinks
        services={servicesData}
        headerTitle="Our Services"
        headerImage="https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"
        viewAllLink="/services"
        viewAllText="View All Services"
        stats={statsData}
        showStats={true}
        onServiceClick={(service) => console.log('Clicked:', service)}
      />
      <LinerarTextAnimation items={linerText} />
      <CardStackScroll
        title="Legacy In The Making"
        cards={sampleCards}
        backgroundColor="#f0f0f0"
      />
      <WhatsNewCarousel
        posts={blogPosts}
        sectionTitle="What's"
        sectionTitleHighlight="New"
        decorativeImage="https://images.pexels.com/photos/35684097/pexels-photo-35684097.jpeg"
        ctaText="Explore More Thoughts"
        ctaLink="/blog"
        className="my-custom-class"
      />
      <DroppingTextAnimation text="Ready to serve SkillKart?" id="2250" />
      {/* 
      <section>
        <div className="container">
          <Typography />
        </div>
      </section> */}
    </>
  );
};

export default Home;
