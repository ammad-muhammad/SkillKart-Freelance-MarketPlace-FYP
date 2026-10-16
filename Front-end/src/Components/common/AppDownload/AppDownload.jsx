import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, Smartphone, CheckCircle2, QrCode } from 'lucide-react';
import './AppDownload.css';

export default function AppDownload() {
  const [qrSrc, setQrSrc] = useState('');
  const apkDownloadPath = '/downloads/skillkart.apk';

  useEffect(() => {
    // Generate QR code pointing to direct APK download URL
    const fullDownloadUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${apkDownloadPath}`
      : apkDownloadPath;

    QRCode.toDataURL(fullDownloadUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#042E4C',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrSrc(url))
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });
  }, []);

  return (
    <section className="app-download-section" aria-label="Mobile App Download">
      <div className="app-download-container">
        <div className="app-download-card">
          {/* Subtle background glow effect */}
          <div className="app-download-card__glow" />

          {/* Left Column: Content */}
          <div className="app-download-card__content">
            <div className="app-download__badge">
              <span className="app-download__badge-dot" />
              <span>MOBILE APP</span>
            </div>

            <h2 className="app-download__title">
              Take SkillKart With You
            </h2>

            <p className="app-download__subtitle">
              Get SkillKart on your Android phone and manage your projects,
              proposals, and client chats seamlessly on the go.
            </p>

            <ul className="app-download__features">
              <li>
                <span className="app-download__check">
                  <CheckCircle2 size={17} strokeWidth={2.4} />
                </span>
                <span>Manage gigs, proposals & client orders on the go</span>
              </li>
              <li>
                <span className="app-download__check">
                  <CheckCircle2 size={17} strokeWidth={2.4} />
                </span>
                <span>Instant push notifications for messages & milestones</span>
              </li>
              <li>
                <span className="app-download__check">
                  <CheckCircle2 size={17} strokeWidth={2.4} />
                </span>
                <span>AI-powered matchmaking & freelance tools at your fingertips</span>
              </li>
            </ul>

            <div className="app-download__actions">
              <a
                href={apkDownloadPath}
                download="SkillKart.apk"
                className="app-download__btn-primary"
              >
                <Download size={18} strokeWidth={2.3} />
                <span>Download for Android</span>
              </a>

              <div
                className="app-download__btn-secondary"
                role="status"
                title="iOS version coming soon"
              >
                <Smartphone size={17} strokeWidth={2.2} />
                <span>iOS coming soon</span>
              </div>
            </div>

            <p className="app-download__footnote">
              Requires Android 7.0 or later. If Android asks, allow your browser to install apps to finish setup.
            </p>
          </div>

          {/* Right Column: QR Code Box */}
          <div className="app-download-card__visual">
            <div className="app-download__qr-wrapper">
              <div className="app-download__qr-box">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="Scan QR code to download SkillKart APK"
                    className="app-download__qr-img"
                  />
                ) : (
                  <div className="app-download__qr-skeleton" />
                )}
              </div>
              <div className="app-download__qr-caption">
                <QrCode size={15} className="app-download__qr-icon" />
                <span>Scan with your phone's camera to download</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
