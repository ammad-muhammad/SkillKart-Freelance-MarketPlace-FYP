import styles from "./PublicFooter.module.scss";

const PublicFooter = () => {
  return (
    <footer className={styles.footer}>
      <p>&copy; {new Date().getFullYear()} SkillKart. All rights reserved.</p>
      <div className={styles.links}>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </div>
    </footer>
  );
};

export default PublicFooter;
