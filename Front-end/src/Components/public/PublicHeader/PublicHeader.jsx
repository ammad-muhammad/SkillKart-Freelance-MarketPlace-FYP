import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./PublicHeader.module.scss";

const PublicHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Handle sticky background appearance
      setIsScrolled(currentScrollY > 50);

      // Handle hide/show on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        setIsVisible(false);
      } else {
        // Scrolling up - show header
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const navItems = [
    {
      label: "Hire Talent",
      hasDropdown: true,
      categories: [
        { name: "Developers", items: ["Full-stack Developers", "Front-end Developers", "Back-end Developers", "Web Developers", "Mobile App Developers", "AI Engineers"] },
        { name: "Designers", items: ["UX Designers", "UI Designers", "Product Designers", "Visual Designers"] },
        { name: "Marketing Experts", items: ["Digital Marketers", "SEO Experts", "Content Marketers"] },
        { name: "Management Consultants", items: ["Project Managers", "Product Managers"] },
      ],
    },
    {
      label: "Consulting & Services",
      hasDropdown: true,
      categories: [
        { name: "Technology Services", items: ["Artificial Intelligence", "Data Analytics", "Cloud Services", "Information Security", "Apps and Integrations", "Custom Software Development"] },
        { name: "Marketing Agency", items: ["Brand Strategy", "Digital Growth", "Creative Services"] },
      ],
    },
    { label: "Contact", to: "/contact" },
    { label: "About Us", to: "/about" },
  ];

  const handleDropdownHover = (label) => {
    setActiveDropdown(label);
    setActiveCategoryIndex(0); // Reset category index when switching dropdowns
  };

  const handleDropdownLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ""} ${!showNotice ? styles.noNotice : ""} ${isVisible ? "" : styles.hidden}`}>
      {/* Top Notice Bar */}
      {showNotice && (
        <div className={styles.noticeBar}>
          <div className={styles.container}>
            <p>
              Toptal launches <span>HireGlobal</span> 🚀 The most competitively priced global workforce payroll platform.
            </p>
            <button className={styles.closeNotice} onClick={() => setShowNotice(false)}>&times;</button>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className={styles.mainNav}>
        <div className={styles.container}>
          <div className={styles.navWrapper}>
            {/* Left Section: Logo + Desktop Nav */}
            <div className={styles.leftSection}>
              <div className={styles.logoWrapper}>
                <Link to="/" className={styles.logo}>
                  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 36c-8.837 0-16-7.163-16-16s7.163-16 16-16 16 7.163 16 16-7.163 16-16 16z" fill="#204ECF" />
                    <path d="M20 10l-8 8 1.414 1.414L20 12.828l6.586 6.586L28 18l-8-8z" fill="#204ECF" />
                    <path d="M20 30l8-8-1.414-1.414L20 27.172l-6.586-6.586L12 22l8 8z" fill="#204ECF" />
                  </svg>
                  <span className={styles.logoText}>Skill<span>Kart</span></span>
                </Link>
              </div>

              <nav className={styles.desktopNav}>
                {navItems.map((item) => (
                  <div
                    key={item.label}
                    className={styles.navItemWrapper}
                    onMouseEnter={() => item.hasDropdown && handleDropdownHover(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <Link to={item.to || "#"} className={styles.navLink}>
                      {item.label}
                      {item.hasDropdown && <span className={styles.arrow}></span>}
                    </Link>

                    {/* Dropdown / Mega Menu */}
                    {item.hasDropdown && activeDropdown === item.label && (
                      <div className={styles.megaMenu}>
                        <div className={styles.megaMenuContent}>
                          <div className={styles.sidebar}>
                            {item.categories.map((cat, idx) => (
                              <div 
                                key={cat.name} 
                                className={`${styles.sidebarItem} ${idx === activeCategoryIndex ? styles.active : ""}`}
                                onMouseEnter={() => setActiveCategoryIndex(idx)}
                                onClick={() => setActiveCategoryIndex(idx)}
                              >
                                {cat.name}
                              </div>
                            ))}
                            <div className={styles.sidebarFooter}>
                              <p>WANT TO HIRE A FULL TEAM?</p>
                              <Link to="/hire-team" className={styles.footerLink}>Hire a Team &rarr;</Link>
                            </div>
                          </div>
                          <div className={styles.mainGrid}>
                            <div className={styles.gridHeader}>
                              <span>{item.categories[activeCategoryIndex].name} &rarr;</span>
                            </div>
                            <div className={styles.linksGrid}>
                              {item.categories[activeCategoryIndex].items.map((subItem) => (
                                <Link 
                                  key={subItem} 
                                  to={item.customLinks?.[subItem] || `/category/${subItem.toLowerCase().replace(/ /g, "-")}`}
                                >
                                  {subItem}
                                </Link>
                              ))}
                            </div>
                            <div className={styles.seeMore}>
                              <Link to="/skills">See more {item.categories[activeCategoryIndex].name.toLowerCase()} &rarr;</Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Right Actions */}
            <div className={styles.rightActions}>
              <Link to="/apply" className={styles.actionLink}>Apply as a Talent</Link>
              <Link to="/hire" className={styles.hireBtn}>Hire Top Talent</Link>
              <Link to="/login" className={styles.loginBtn}>Log In</Link>

              {/* Mobile Menu Toggle */}
              <button
                className={styles.mobileToggle}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ""}`}>
        <div className={styles.mobileMenuHeader}>
           <Link to="/" className={styles.logoText}>Skill<span>Kart</span></Link>
           <button onClick={() => setIsMobileMenuOpen(false)}>&times;</button>
        </div>
        <nav className={styles.mobileLinks}>
          {navItems.map((item) => (
            <div key={item.label} className={styles.mobileNavItem}>
               <Link to={item.to || "#"}>{item.label}</Link>
            </div>
          ))}
          <div className={styles.mobileAuth}>
            <Link to="/apply">Apply as a Talent</Link>
            <Link to="/hire" className={styles.mobileHireBtn}>Hire Top Talent</Link>
            <Link to="/login">Log In</Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;