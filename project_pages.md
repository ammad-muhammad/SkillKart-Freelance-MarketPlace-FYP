# 🗺️ SkillKart Application Pages & Routes

This document contains a comprehensive list of all pages and routes in the SkillKart platform. It serves as a checklist for reviewing and fixing UI/UX or functional issues across the app.

---

## 🌍 Public Pages (No Login Required)

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/` | **Home / Landing Page** - The main entry point for the platform. | ⬜ Pending Review |
| `/about` | **About Us** - Company and platform background. | ⬜ Pending Review |
| `/contact` | **Contact Us** - Form to reach support. | ⬜ Pending Review |
| `/careers` | **Careers** - Job openings at SkillKart. | ⬜ Pending Review |
| `/press` | **Press Kit** - Media resources and brand assets. | ⬜ Pending Review |
| `/help` | **Help Center** - FAQs and support articles. | ⬜ Pending Review |
| `/browse-freelancers` | **Browse Freelancers** - Public directory to find talent. | ⬜ Pending Review |
| `/browse-projects` | **Browse Projects** - Public directory to find jobs. | ⬜ Pending Review |
| `/categories` | **Categories** - Browse by skill categories. | ⬜ Pending Review |
| `/post-project` | **Post Project Landing** - Marketing page to encourage job posting. | ⬜ Pending Review |
| `/ai-matchmaking` | **AI Matchmaking** - Landing page explaining the AI matching feature. | ⬜ Pending Review |
| `/ai/buddy` | **Buddy AI Assistant** - Chat interface for platform guidance. | ⬜ Pending Review |
| `/ai/cost-estimator` | **AI Cost Estimator** - Tool to estimate project costs. | ⬜ Pending Review |

---

## 👤 Public Profiles & Details

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/freelancers/:id` | **Public Freelancer Profile** - A freelancer's public showcase. | ⬜ Pending Review |
| `/gigs/:id` | **Gig Details** - Details of a specific service/gig. | ⬜ Pending Review |
| `/jobs/:id` | **Job Details** - Details of a specific posted project. | ⬜ Pending Review |
| `/skills/:category` | **Skill Category Page** - Specific category page (e.g. Web Dev). | ⬜ Pending Review |
| `/skills/:cat/:skill` | **Specific Skill Page** - Specific skill page (e.g. React). | ⬜ Pending Review |

---

## 🔐 Authentication & Onboarding

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/login` | **Login** - Standard login page. | ⬜ Pending Review |
| `/registration` | **Sign Up** - Registration page. | ⬜ Pending Review |
| `/role` | **Account Type** - Select Freelancer or Client role. | ⬜ Pending Review |
| `/auth/consent` | **OAuth Consent** - Social login consent page. | ⬜ Pending Review |
| `/otp-verification` | **OTP / 2FA** - Code verification page. | ⬜ Pending Review |
| `/forgot-password` | **Password Recovery** - Reset password flow. | ⬜ Pending Review |
| `/onboarding` | **Initial Onboarding** - General onboarding router. | ⬜ Pending Review |
| `/client/onboarding` | **Client Setup Flow** - Profile setup for clients. | ⬜ Pending Review |
| `/freelancer/onboarding`| **Freelancer Setup Flow** - Profile setup for freelancers. | ⬜ Pending Review |

---

## ⚖️ Legal Pages

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/privacy` | **Privacy Policy** | ⬜ Pending Review |
| `/terms` | **Terms of Service** | ⬜ Pending Review |
| `/cookies` | **Cookie Policy** | ⬜ Pending Review |
| `/services-agreement` | **Services Agreement** | ⬜ Pending Review |

---

## 🧑‍💻 Freelancer Dashboard
*Requires Freelancer account login.*

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/freelancer/dashboard` | **Overview** - Main statistics and recent activity. | ⬜ Pending Review |
| `/freelancer/profile` | **Edit Profile** - Manage profile details. | ⬜ Pending Review |
| `/freelancer/portfolio` | **Manage Portfolio** - Add/Edit portfolio items. | ⬜ Pending Review |
| `/freelancer/gigs` | **Manage Gigs** - View and manage active services. | ⬜ Pending Review |
| `/freelancer/gigs/create`| **Create Gig** - Form to publish a new gig. | ⬜ Pending Review |
| `/freelancer/proposals` | **Manage Proposals** - Track submitted proposals. | ⬜ Pending Review |
| `/freelancer/work` | **Active Work** - Active contracts and delivery room. | ⬜ Pending Review |
| `/freelancer/messages` | **Messages** - Inbox and chats. | ⬜ Pending Review |
| `/freelancer/wallet` | **Wallet** - Earnings and withdrawals. | ⬜ Pending Review |
| `/freelancer/skill-test`| **Skill Tests** - Take AI skill assessments. | ⬜ Pending Review |
| `/freelancer/saved` | **Saved Projects** - Bookmarked jobs. | ⬜ Pending Review |
| `/freelancer/notifications`| **Notifications** - Alert hub. | ⬜ Pending Review |
| `/freelancer/settings` | **Account Settings** - General settings. | ⬜ Pending Review |
| `/freelancer/security` | **Security** - Passwords and 2FA. | ⬜ Pending Review |

---

## 💼 Client Dashboard
*Requires Client account login.*

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/client/dashboard` | **Overview** - Spend stats and active jobs. | ⬜ Pending Review |
| `/client/profile` | **Edit Profile** - Manage company/personal profile. | ⬜ Pending Review |
| `/client/projects` | **Manage Projects** - Active and past job postings. | ⬜ Pending Review |
| `/client/projects/create`| **Post Project** - Form to create a new job. | ⬜ Pending Review |
| `/client/.../proposals`| **Review Proposals** - Review applications for a specific job. | ⬜ Pending Review |
| `/client/messages` | **Messages** - Inbox and chats. | ⬜ Pending Review |
| `/client/wallet` | **Wallet** - Payments, billing, and deposits. | ⬜ Pending Review |
| `/client/saved` | **Saved Freelancers** - Bookmarked talent. | ⬜ Pending Review |
| `/client/notifications` | **Notifications** - Alert hub. | ⬜ Pending Review |
| `/client/settings` | **Account Settings** - General settings. | ⬜ Pending Review |
| `/client/security` | **Security** - Passwords and 2FA. | ⬜ Pending Review |

---

## 💳 Miscellaneous

| Route | Page Name / Description | Status / Notes |
| :--- | :--- | :--- |
| `/payment/confirm` | **Payment Confirmation** - Stripe success redirect. | ⬜ Pending Review |
