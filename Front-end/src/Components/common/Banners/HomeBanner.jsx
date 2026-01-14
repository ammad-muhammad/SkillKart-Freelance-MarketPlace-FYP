import styles from "./Banners.module.scss";

const HomeBanner = ({
  backgroundImage,
  animationImage,
  searchIcon,
  titleStart,
  titleEnd,
  subtitle,
  descriptionOne,
  descriptionTwo,
  searchPlaceholder,
}) => {
  return (
    <div className={styles.banner}>
      <img
        src={backgroundImage}
        alt="background"
        className={styles.bannerImage}
      />

      <div className={styles.blurOverlay}></div>

      <div className="container">
        <div className={styles.bannerWrapper}>
          <div className={styles.bannerContent}>
            <div className={styles.mainContent}>
              <h1 className={`heading1 ${styles.title}`}>
                {titleStart}
                <div className="headImgWrap">
                  <img
                    src={animationImage}
                    alt="creative"
                    className="headImg"
                  />
                </div>
                {titleEnd}
              </h1>

              <h3 className={`heading3 ${styles.subtitle}`}>{subtitle}</h3>

              <div className={styles.bannerSearchWrap}>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className={styles.searchAllInput}
                />
                <div className={styles.searchAllBtn}>
                  <img
                    src={searchIcon}
                    alt="search icon"
                    className={styles.headImg}
                  />
                </div>
              </div>
            </div>

            <div className={styles.sideContent}>
              <p className="body1">{descriptionOne}</p>
              <p className="body1">{descriptionTwo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeBanner;
