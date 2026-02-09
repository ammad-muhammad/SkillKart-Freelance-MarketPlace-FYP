import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./PublicHeader.module.scss";

const PublicHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Handle transparent to glass transition
      setIsScrolled(currentScrollY > 50);

      // Handle smart hide/show on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        // Scrolling down and past certain point - hide header
        setIsVisible(false);
      } else {
        // Scrolling up or at top - show header
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Fix: Automatically close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Updated nav items with Fiverr/Upwork style categories
  const navItems = [
    {
      label: "Design & Creative",
      hasDropdown: true,
      categories: [
        { name: "Graphics & Design", items: ["Logo & Brand Identity", "Web & App Design", "Visual Design", "Print Design", "Packaging & Covers"] },
        { name: "Video & Animation", items: ["Video Editing", "3D Product Animation", "Character Animation", "Motion Graphics"] },
        { name: "Photography", items: ["Product Photography", "Portrait Photography", "Event Photography"] },
      ],
    },
    {
      label: "Development & IT",
      hasDropdown: true,
      categories: [
        { name: "Software Development", items: ["Web Development", "Mobile Apps", "Desktop Apps", "AI & Machine Learning"] },
        { name: "Data", items: ["Data Science", "Data Analysis", "Database Design"] },
        { name: "IT & Infrastructure", items: ["Cloud Computing", "Information Security", "DevOps"] },
      ],
    },
    {
        label: "Digital Marketing",
        hasDropdown: true,
        categories: [
          { name: "Search", items: ["SEO", "SEM", "Local SEO"] },
          { name: "Social Content", items: ["Social Media Marketing", "Influencer Marketing", "Content Strategy"] },
          { name: "Advertising", items: ["Paid Search", "Display Advertising", "Public Relations"] },
        ],
    },
    { label: "About", to: "/about" },
    { label: "How it Works", to: "/howitworks" },
  ];

  return (
    <header className={`
      ${styles.header} 
      ${isScrolled ? styles.scrolled : ""} 
      ${isVisible ? "" : styles.hidden}
    `}>
      <div className={styles.headerContainer}>
        <div className={styles.navbar}>
          {/* Logo Section */}
          <div className={styles.logoSection}>
            <Link to="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M12 20L18 26L28 14" stroke="#b3f5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.2" />
                </svg>
              </div>
              <span className={styles.logoText}>Skill<span>Kart</span></span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            {navItems.map((item) => (
              <div
                key={item.label}
                className={styles.navItemWrapper}
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link 
                  to={item.to || "#"} 
                  className={`${styles.navLink} ${location.pathname === item.to ? styles.active : ""}`}
                >
                  {item.label}
                  {item.hasDropdown && <span className={styles.plus}>+</span>}
                </Link>

                {/* Dropdown / Mega Menu */}
                {item.hasDropdown && activeDropdown === item.label && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownContent}>
                      {item.categories.map((cat) => (
                        <div key={cat.name} className={styles.dropdownCol}>
                          <h4>{cat.name}</h4>
                          <ul>
                            {cat.items.map((subItem) => (
                              <li key={subItem}>
                                <Link to={`/skills/${subItem.toLowerCase().replace(/ /g, "-")}`}>
                                  {subItem}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className={styles.rightActions}>
            <Link to="/login" className={styles.loginBtn}>Login</Link>
            <Link to="/contact" className={styles.getInTouch}>
              <span>Get in Touch</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className={styles.mobileToggle}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ""}`}>
        <div className={styles.mobileMenuHeader}>
            <div className={styles.logo}>
                <span className={styles.logoText}>Skill<span>Kart</span></span>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsMobileMenuOpen(false)} aria-label="Close Menu">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <nav className={styles.mobileLinks}>
          {navItems.map((item) => (
            <div key={item.label} className={styles.mobileNavItem}>
               <div className={styles.linkHeader} onClick={() => item.hasDropdown ? setActiveDropdown(activeDropdown === item.label ? null : item.label) : null}>
                 {item.to ? (
                    <Link to={item.to}>{item.label}</Link>
                 ) : (
                    <span>{item.label}</span>
                 )}
                 {item.hasDropdown && (
                    <span className={`${styles.chevron} ${activeDropdown === item.label ? styles.rotate : ""}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                 )}
               </div>

               {item.hasDropdown && activeDropdown === item.label && (
                   <div className={styles.mobileSubMenu}>
                        {item.categories.map((cat) => (
                            <div key={cat.name} className={styles.mobileCat}>
                                <h5>{cat.name}</h5>
                                <ul>
                                    {cat.items.map((sub) => (
                                        <li key={sub}>
                                            <Link to={`/skills/${sub.toLowerCase().replace(/ /g, "-")}`}>{sub}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                   </div>
               )}
            </div>
          ))}
        </nav>

        <div className={styles.mobileFooter}>
            <Link to="/login" className={styles.mobileLogin}>Login</Link>
            <Link to="/contact" className={styles.mobileCta}>
              <span>Get in Touch</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;