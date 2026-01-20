import styles from "./PublicFooter.module.scss";
import { Link } from "react-router-dom";

const PublicFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerWrapper}>
          <p>&copy; {new Date().getFullYear()} SkillKart. All rights reserved.</p>
          <div className={styles.links}>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-and-conditions">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
