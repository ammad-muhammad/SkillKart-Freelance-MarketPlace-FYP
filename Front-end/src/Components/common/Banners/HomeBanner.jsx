import { useEffect } from "react";
import styles from "./Banners.module.scss";
import { animateSplitText } from "../../../utils/gsapTextAnimation";

const HomeBanner = ({
  backgroundImage,
  searchIcon,
  titleStart,
  titleEnd,
  subtitle,
  descriptionOne,
  descriptionTwo,
  searchPlaceholder,
}) => {

    useEffect(() => {
      animateSplitText({
        selector: ".split",
      });
    }, []);
  

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
              <h1 className={`headline ${styles.title} split`}>
                <span dangerouslySetInnerHTML={{ __html: titleStart }} />

                <span  className={`word img-word ${styles.headImgWrap}`}>
                  <img
                    src={backgroundImage}
                    alt="creative"
                    className={styles.headImg}
                  />
                </span>

                <span dangerouslySetInnerHTML={{ __html: titleEnd }} />
              </h1>



              <h3 className={`heading3 ${styles.subtitle}`}>{subtitle}</h3>

              <div className={styles.bannerSearchWrap}>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className={`body1 ${styles.searchAllInput}`}
                />
                <div className={styles.searchAllBtn}>
                  <img
                    src={searchIcon}
                    alt="search icon"
                    className={styles.icon}
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
