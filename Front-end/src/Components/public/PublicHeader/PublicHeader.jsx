// src/components/public/PublicHeader.jsx
import { Link } from "react-router-dom";
import styles from "./PublicHeader.module.scss";

const PublicHeader = () => {
  return (
    <header className={styles.header}>
      <div className="container">
        <div  className={styles.headerWrapper}>
        <div className={styles.logo}>
          <Link to="/">
            <h1>SkillKart</h1>
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;