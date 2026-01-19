import React from "react";
import styles from "./PublicFooter.module.scss";

const PublicFooter = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      {/* CTA Section - NOW AT THE TOP */}
      <div className={styles.ctaSection}>
        <h2>Need more clarity? Let our team help you.</h2>
        <a href="#consultation" className={styles.ctaButton}>
          BOOK A FREE CONSULTATION
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </a>
      </div>

      {/* Links Grid */}
      <div className={styles.linksGrid}>
        <div className={styles.column}>
          <h4>Design</h4>
          <ul>
            <li><a href="#">UI/UX Design</a></li>
            <li><a href="#">UI/UX Consulting</a></li>
            <li><a href="#">UX Research</a></li>
            <li><a href="#">Design Audit</a></li>
            <li><a href="#">Usability Testing</a></li>
            <li><a href="#">Design System</a></li>
            <li><a href="#">Heuristic Evaluation</a></li>
            <li><a href="#">Interaction Design</a></li>
            <li><a href="#">Digital Prototyping</a></li>
            <li><a href="#">Digital Branding</a></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>Development</h4>
          <ul>
            <li><a href="#">Front End Development</a></li>
            <li><a href="#">Back End Development</a></li>
            <li><a href="#">Full Stack Development</a></li>
            <li><a href="#">API Development</a></li>
            <li><a href="#">AI Development services</a></li>
            <li><a href="#">ML Development services</a></li>
            <li><a href="#">Cloud Application Development</a></li>
            <li><a href="#">Low-code No-code Development</a></li>
          </ul>
          <h4 style={{ marginTop: '30px' }}>Marketing</h4>
          <ul>
            <li><a href="#">All-in-one Digital Marketing</a></li>
            <li><a href="#">Search Engine Optimisation (SEO)</a></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>Solutions</h4>
          <ul>
            <li><a href="#">Design Discovery</a></li>
            <li><a href="#">Minimum Viable Product</a></li>
            <li><a href="#">Full Product Design</a></li>
            <li><a href="#">SaaS Design</a></li>
            <li><a href="#">CMS Design</a></li>
            <li><a href="#">Website Development</a></li>
            <li><a href="#">Mobile App Development</a></li>
            <li><a href="#">Ecommerce Development</a></li>
            <li><a href="#">Cross Platform Development</a></li>
            <li><a href="#">Sports & Fitness</a></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4>Hire Us</h4>
          <ul>
            <li><a href="#">Trusted Design Partner</a></li>
            <li><a href="#">Dedicated Product Solutions</a></li>
            <li><a href="#">Complete Enterprise Solutions</a></li>
          </ul>

          <div className={styles.actionButtons}>
            <a href="#" className={styles.outlineBtn}>
              EXPLORE OUR WORK
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
            <a href="#" className={styles.outlineBtn}>
              READ OUR LATEST BLOGS
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>About</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">CSR</a></li>
          </ul>
        </div>
      </div>

      {/* Awards Section - NOW AFTER LINKS GRID */}
      <div className={styles.badgesSection}>
        <div className={styles.badgesWrapper}>
          <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/10/globle-leader.svg" alt="Global Leader" />
          </div>
          <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/04/Top-UX-Company.png" alt="Clutch 2024" />
          </div>
          <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/04/Top-UX-Company.png" alt="Top Design Firm" />
          </div>
          {/* <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/04/Top-UX-Company.png" alt="Top 10 Pros" />
          </div> */}
          <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/04/50-Pros.png" alt="Clutch India" />
          </div>
          <div className={styles.badge}>
            <img src="https://thefinch.design/wp-content/uploads/2025/04/Top-UX-Company.png" alt="Clutch India" />
          </div>
        </div>
      </div>

      {/* Contact Info Row */}
      <div className={styles.contactDetails}>
        <div className={styles.infoBlock}>
          <h5>Email</h5>
          <a href="mailto:sales@skillkart.design">sales@skillkart.design</a>
          <span>(For Sales Inquiry)</span>
          <a href="mailto:hr@skillkart.design">hr@skillkart.design</a>
          <span>(For Hiring)</span>
        </div>
        <div className={styles.infoBlock}>
          <h5>Call</h5>
          <a href="tel:+917777997049">+91 77779 97049</a>
          <span>(For Sales Inquiry)</span>
          <a href="tel:+917016391962">+91 70163 91962</a>
          <span>(For Hiring)</span>
        </div>
        <div className={styles.infoBlock}>
          <h5>Studio</h5>
          <p>E-206A, Ganesh Glory 11, Jagatpur Rd, nr. BSNL Office, Jagatpur, Ahmedabad, Gujarat 382470.</p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.left}>
          <span>© {new Date().getFullYear()} skillkart.design studio. All Rights Reserved</span>
          <span className={styles.separator}>/</span>
          <a href="/privacy">Privacy policy</a>
          <span className={styles.separator}>/</span>
          <a href="/terms">Terms of Use</a>
        </div>
        
        <div className={styles.rightSection}>
          <div className={styles.socials}>
            <a href="#" aria-label="Behance">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"></path><path d="M13 19h-5v-10h5a4 4 0 0 1 0 8h-5"></path><path d="M8 13h5"></path><path d="M16 6h4"></path></svg>
            </a>
            <a href="#" aria-label="Website">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          </div>
          <div className={styles.backToTop} onClick={scrollToTop}>
            <span>Back to the top</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Giant Background Text - WITH SPLIT SPANS FOR WEIGHTS */}
      <div className={styles.giantTextWrapper}>
        <div className={styles.giantText}>
          <span className={styles.bold}>skillkart</span>
          <span className={styles.semiBold}>.design</span>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
