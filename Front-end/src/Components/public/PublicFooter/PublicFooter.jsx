import styles from "./PublicFooter.module.scss";

const PublicFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerWrapper}>
          <p>&copy; {new Date().getFullYear()} SkillKart. All rights reserved.</p>
          <div className={styles.links}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
