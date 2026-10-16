import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone, QrCode, CheckCircle2 } from 'lucide-react';
import './AppDownload.css';

// Always the latest build, served from Front-end/public/downloads (static — no env var).
const APK_PATH = '/downloads/SkillKart-v1.0.apk';

export default function AppDownload() {
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    // Full URL for the QR code (a phone scanning it needs the absolute address)
    setDownloadUrl(`${window.location.origin}${APK_PATH}`);
  }, []);

  return (
    <section className="sk-app-banner-section" id="download-app">
      <div className="container">
        <div className="sk-app-banner-card">
          {/* Subtle Ambient Background Gradient Lighting */}
          <div className="sk-app-banner-ambient" aria-hidden="true" />

          {/* Left Column: Details & Actions */}
          <div className="sk-app-banner-left">
            {/* Pill Badge */}
            <div className="sk-app-pill-badge">
              <span className="sk-app-pill-dot" />
              <span>MOBILE APP</span>
            </div>

            {/* Main Heading */}
            <h2 className="sk-app-banner-title">
              Take SkillKart With You
            </h2>

            {/* Subtitle */}
            <p className="sk-app-banner-sub">
              Get SkillKart on your Android phone and manage your projects, proposals,
              messages, and earnings on the go.
            </p>

            {/* Features Check List */}
            <ul className="sk-app-checklist">
              <li className="sk-app-checkitem">
                <CheckCircle2 className="sk-app-check-icon" size={18} />
                <span>Browse projects, submit proposals and track milestones</span>
              </li>
              <li className="sk-app-checkitem">
                <CheckCircle2 className="sk-app-check-icon" size={18} />
                <span>Real-time client messaging & instant push notifications</span>
              </li>
              <li className="sk-app-checkitem">
                <CheckCircle2 className="sk-app-check-icon" size={18} />
                <span>Secure wallet transactions, payouts and skill verification tests</span>
              </li>
            </ul>

            {/* Action Buttons Row */}
            <div className="sk-app-actions-row">
              <a
                href={APK_PATH}
                download="SkillKart-v1.0.apk"
                className="sk-app-btn-download"
                id="btn-download-apk"
              >
                <Download size={17} />
                <span>Download for Android</span>
              </a>

              <div className="sk-app-btn-ios" title="iOS version coming soon">
                <Smartphone size={17} />
                <span>iOS coming soon</span>
              </div>
            </div>

            {/* Footnote Notice */}
            <p className="sk-app-banner-footnote">
              Requires Android 7.0 or later. If Android asks, allow your browser to install apps to finish setup.
            </p>
          </div>

          {/* Right Column: QR Code Card */}
          <div className="sk-app-banner-right">
            <div className="sk-app-qr-box">
              {downloadUrl ? (
                <QRCodeSVG
                  value={downloadUrl}
                  size={152}
                  level="M"
                  includeMargin={false}
                  imageSettings={{
                    src: '/favicon.svg',
                    x: undefined,
                    y: undefined,
                    height: 34,
                    width: 34,
                    opacity: 1,
                    excavate: true,
                  }}
                />
              ) : (
                <div className="sk-app-qr-skeleton">
                  <QrCode size={48} className="animate-pulse" />
                </div>
              )}
            </div>

            <div className="sk-app-scan-caption">
              <QrCode size={15} className="sk-app-scan-icon" />
              <span>Scan with your phone's camera to download</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
