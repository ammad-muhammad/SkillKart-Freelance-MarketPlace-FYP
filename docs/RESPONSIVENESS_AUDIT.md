# SkillKart new-UI responsiveness audit

Branch `new-theme-site-FE-BE`, commit `9a16e3f` (desktop redesign). Audit date 2026-10-16. **Nothing was fixed**: this is the issue list to work from.

## How this was produced

1. **Measured** (Playwright, production build): all 77 routes × 5 viewports (360, 390, 768, 1024, 1366). API mocked with *empty* data, with client / freelancer / admin sessions faked. Per page: horizontal overflow, overflowing elements, text < 12px, tap targets < 32px, fixed elements, full-page screenshots.
2. **Read** (5 parallel reviewers, one per area): every CSS/JSX file in the area, each claim checked against the cited lines.
3. **Spot-verified** by me: screenshots of admin / client / freelancer pages at 390 and 768, and a grep confirming the "classes used in JSX but missing from CSS" findings.

Tags: **[M]** = measured / seen in a screenshot. **[V]** = verified in code. **[E]** = estimated from CSS arithmetic, confirm on a device/browser when fixing.

**Not covered:** data-heavy states (long tables, many cards, long names), because the mock returned empty lists; real Android devices (safe-area, keyboard, WebView quirks); the standalone admin APK build.

Shipped in the **Android APK** (matters most on phones): login/registration/role/otp/forgot-password/consent, both onboardings, browse-projects/gigs/freelancers, job/gig/freelancer detail, all client and freelancer dashboard pages, payment confirm. **Web only** (not in APK): home, about, contact, legal, help, categories, skills, post-project (public), ai-matchmaking, ai tools, public client profile.

---

## 1. Measured results

| Finding | Detail |
|---|---|
| **Admin panel unusable on phones/tablets [M]** | `.ap-sidebar` is a fixed 260px at every width: at 390 it covers ~67% of the screen; at 768 the content column is 508px. No hamburger exists. |
| **Horizontal overflow, 360px** | `/help` +151, `/cookies` +145 (+115 @390), `/privacy` +42 (+12 @390), `/services-agreement` +8, freelancer Settings +259 (+229 @390), client Settings +135 (+105 @390), client Dashboard +103 (+96 @390). |
| **Logged-in navbar hamburger off-screen at 360 [M]** | Right edge 377px on a 360px screen, on every client and freelancer page (+17px page overflow). Fits at 390. |
| **Settings pages [M]** | The pill sub-nav stretches the whole layout to ~619px, so every card is cut off on the right. Not found by the code reviewers. |
| **Freelancer dashboard [M]** | 4 KPI cards stay in one row at 390 (each ~75px wide). |
| **Cookie banner [M]** | 150px tall fixed bar = 20% of a 740px phone on every page until dismissed; ~100px at 768. |
| **Small targets/text at 390 [M]** | Tap targets < 32px: browse-freelancers 30, browse-projects/gigs 26, ai-matchmaking 24, jobs/gigs/profile detail ~20, 404 page 20, post-project 18. Text < 12px: home 23, about 16, ai-matchmaking 6, post-project/skill pages 5, client dashboard 7, freelancer wallet/skill-test 5-7. |
| **Clean at the page level** | Auth pages, browse pages, about, contact, all admin pages have no page-level overflow at the tested widths. (Admin hides it behind the sidebar problem.) |

---

## 2. Systemic root causes (fix once, many pages improve)

| # | Cause | Where | Effect |
|---|---|---|---|
| X1 | **Redesign deleted CSS but left JSX classes** [V grep] | `hero__*` (Role), `fl-modal-*` (client wallet deposit), `flm-lightbox-overlay` (client chat), `fl-edit-sheet-overlay` (freelancer submit work), `legal-accord*` (Terms), `cookie-chip`/`cookie-card__*` (Cookie), `sk-icon-btn`/`sk-badge`/`sk-pill-action-btn` (gigs/work), `cl-btn--secondary`, `fs-btn-outline`, `fsec-btn-outline`, `fsec-activity-*`, `fsec-danger-*`, `rp-*` | Modals render inline at page bottom (not overlays), buttons unstyled, whole pages unstyled. Broken on desktop too. |
| X2 | **No breakpoint scale** | 30+ distinct `max-width` values; off-by-one pairs (767/768, 1023/1024, `min-width:768` + `max-width:768`) | Different pieces of one page change layout at different widths. |
| X3 | **`1fr` / `repeat(n,1fr)` without `minmax(0,1fr)` / `min-width:0`** | Legal, Help, PFP, admin grids, bento | Any nowrap text/table/long token widens the page. Root cause of `/help`, `/cookies`, `/privacy`. |
| X4 | **Global `overflow-x: clip/hidden` on `html, body`** (`responsive.css`, `variables.css`) | everywhere | Turns overflow into unreachable, clipped content instead of a visible bug; the `hidden` fallback also kills `position:sticky` on old WebViews. |
| X5 | **`100vh`/`vh`/`100vw` instead of dvh / `--app-vh`** | ~40 files (modals, drawers, shells, loaders, hero) | Content taller than the visible area on phones (URL bar, keyboard). `--app-vh` exists in `main.jsx` but is used by one rule. |
| X6 | **No safe-area handling** | `index.html` has no `viewport-fit=cover`; `env(safe-area-inset-*)` almost nowhere; targetSdk 36 = edge-to-edge | Navbar/footers/sticky bars can sit under system bars in the APK **[E, verify on device]**. |
| X7 | **Inline `style={{gridColumn / gridTemplateColumns / display:flex / width}}`** | bento KPIs, language rows, avatar rows, proposals edit modal, onboarding | Media queries cannot override inline styles. |
| X8 | **Flex rows without `flex-wrap` / `min-width:0`** | hero chips, card heads, badge rows, toolbars, modal footers, pagination, tabs | Squeezed or clipped content below ~480px. Single most common overflow cause. |
| X9 | **Hover-only affordances** | portfolio/gig-gallery edit/delete overlays, avatar upload overlays, chart tooltips, notification actions, gallery arrows 769-1024, arc-slider pause | Invisible or unusable on touch. No `@media (hover: none)` anywhere. |
| X10 | **Touch targets and text floors** | no `pointer: coarse` rules anywhere; 24-36px controls; 9-11.8px text; `variables.css` shrinks `--fs-xs` to 10.4px at ≤400px | Hard to tap, hard to read on phones. |
| X11 | **z-index sprawl** (17+ levels, 100 → 100000) | Buddy FAB 9999 above modals/drawer/cookie; toasts (4000) under loader (9999) | Overlay conflicts. |
| X12 | **Global class-name collisions between page CSS files** | `FreelancerGigs.css` vs `CreateGig.css` (`.fl-section-card`, `.fl-media-dropzone`, `.fl-gallery-slot*`, `.fl-preview-drawer`) | Whichever loads last wins on both pages. |
| X13 | **Dead CSS (~1,200+ lines)** | `ClientSidebar`, `NotificationBell`, `.fl-job-card-ref5*`, `fl2-modal/drawer/g3/g4`, duplicated blocks in `PublicClientProfile.css` | Hides real gaps; a second copy of the client-profile stylesheet *overrides its own media queries*. |
| X14 | **Fixed widths of 280-360px** | popovers, notif panel, JobCard slider (360px), arc cards | Wider than a 360px phone. |

---

## 3. Issue list

Severity: **Crit** blocks a core task or hides the whole page; **High** clearly broken layout/overflow/unusable control; **Med** degraded but usable; **Low** polish.

### 3.1 Shared chrome, layouts, global styles (S)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| S-01 | Crit [M] | `AdminPanelLayout.css:17,78,93-104,972-974` | Admin sidebar fixed 260px at all widths, no drawer/toggle; mobile rule targets nonexistent `.ap-sidebar-width`. → off-canvas drawer < 1024 + header hamburger + scrim. |
| S-02 | Crit [M@360] | `AppNavbar.css:40-58,272-277` | Logged-in header ~410px wide; hamburger ends at 377 on a 360 screen and is clipped. → hide messages icon / avatar chevron ≤640, `min-width:0` on left cluster. |
| S-03 | Crit [E] | `AppNavbar.css:375-377,424-439` | Notification panel is `absolute; width:340px; right:0` of a bell sitting ~146px in → opens off the left edge on phones; user menu clips ≤340. → `position:fixed; inset-inline:8px` below 640. |
| S-04 | High | `AppNavbar.css:849-873` | Quick-search overlay: 80px top padding, no scroll, fixed 380px results → results unreachable with keyboard / landscape. |
| S-05 | High | `ClientLayout.css:26-41`, `FreelancerLayout.css:64-78` | Messages shell uses `100vh` and depends on `:has()`; on WebView < Chrome 105 layout is lost, composer sits under bars. → `--app-vh` + JS class. |
| S-06 | High | `responsive.css:40-54`, `variables.css:187-190` | Global clip hides overflow; comment says tables scroll but rule only sets `max-width`. → wrap tables; add dev overflow detector. |
| S-07 | High | `SuspendedOverlay.css` | Blocking overlay not scrollable; logout unreachable on short screens. |
| S-08 | High | `ReviewModal.css` | Modal `overflow:hidden`, no max-height → Submit clipped with keyboard/landscape. |
| S-09 | High | `BuddyWidget.css:12,99` | FAB (9999) floats over modals, drawer, cookie bar; covers Save bars (see F-19). |
| S-10 | Med | many | z-index ladder inconsistent (X11). |
| S-11 | Med | `Toast.css:15-40` | Toasts at `top:16px` sit over the navbar; no safe-area; `100vw` includes scrollbar. |
| S-12 | Med | `Toast.css:239-269` | Toast close 24px, action ~20px tall. |
| S-13 | Med [E] | `index.html:6`, nav/drawer CSS | No `viewport-fit=cover`, no safe-area padding on top/bottom chrome (X6). |
| S-14 | Med | many | `100vh` not `--app-vh` (X5). |
| S-15 | Med [E] | `AppNavbar.css:103-127` | 1025-1100 and 1281-1340: center links + right cluster exceed container, nothing can shrink. |
| S-16 | Med | `variables.css:263-295` | At ≤400px token scale shrinks (`--fs-xs` 10.4px, spacing -35%): 360-390 phones look different from 412+. |
| S-17 | Med | `Hero.css:7-17` | Hero is `100vh - 70px`; on tablets slider fills ~400px of ~1100px; landscape min-height 640 > viewport. |
| S-18 | Med | `FreelancerArcSlider` | Pause on `mouseenter` only; stat text 8.5-10.5px. |
| S-19 | Med | `FreelancerArcSlider.jsx` | 28-34 blurred cards kept in DOM on phones (perf). |
| S-20 | Med | Hero/Footer/Navbar CSS+JS | Off-by-one breakpoints 767/768, 1023/1024; at 768 hero is "mobile" but slider JS is "desktop". |
| S-21 | Med | `CustomSelect`, `ComboSelect`, `TagInput` | Dropdowns don't flip; clipped inside scrolling modals. |
| S-22 | Med | `freelancer-ds.css:305-330` | `.fl2-btn` ~30px, `.fl2-icon-btn--sm` 28px (used for drawer/search close). |
| S-23 | Med | `BuddyWidget.css` | 26-30px controls, 10-11px labels, 12.8px input (iOS zoom). |
| S-24 | Med | `Footer.css:13,499` | `margin-top:-64px` overlaps the previous section by 64px (pagination/CTAs hidden under it). |
| S-25 | Med | `design-system.css:152-294` | Page-header actions don't wrap; `repeat(n,1fr)`; 340px sidebar column to 1024. |
| S-26 | Med | `native-app.css:21-29` | All scrollbars hidden app-wide: horizontal scrollers lose affordance. |
| S-27 | Med | sticky `.app-nav` + `overflow-x:hidden` fallback | Sticky navbar scrolls away on old WebViews. |
| S-28 | Med | `Loader.css:33-46` | Full-screen loader `min-height:100vh`, z 9999 over toasts. |
| S-29 | Low | `AppNavbar.jsx:51` | Drawer accordions all open: Buddy/Logout ~900px down; footer not sticky. |
| S-30 | Low | `Footer.css` | Footer links ~20px tall; 2-col grid too tight at 320-360. |
| S-31 | Low | `AppDownload.css` | QR code shown on phones (pointless). |
| S-32 | Low | navbar | 72px sticky nav = 20% of a landscape phone; no `max-height` rule. |
| S-33 | Low | layouts | 1360px cap leaves wide gutters at ≥1700; four different max-widths (1360/1280/1240/1200). |
| S-34 | Low | `FreelancerLayout.css:11`, `Button.css` | `background-attachment:fixed` on mobile; hover transforms stick on touch; `.btn--sm` ~31px. |
| S-35 | Low | dead CSS | X13. |
| N-01 | Med [M] | `CookieConsent` | 150px banner on a 360x740 phone (20%); covers sticky bars until dismissed. → compact on phones. |

### 3.2 Public marketing / content / auth (P)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| P-01 | Crit [V] (APK) | `Role.jsx` + `Hero.css` | `/role` unstyled: all `hero__*` classes deleted; inline dark-theme white text on light page. (Harness redirected /role→/ so not screenshotted.) → rebuild on `Auth.css` role-card classes. |
| P-02 | Crit [M] | `Legal.css:203-208,322,799` | `/privacy` +42, `/cookies` +145, `/services-agreement` +8 @360: `1fr` track + table min-content. → `minmax(0,1fr)`, `min-width:0`, table min-width inside scroller. |
| P-03 | Crit [M] | `HelpCenter.css:241-293` | `/help` +151 @360: `white-space:nowrap` desc inside `1fr` tracks. → `minmax(0,1fr)`, `min-width:0` on card. |
| P-04 | High (APK) | `Auth.css:10` | `--u: min(1px,0.1136svh,0.0695vw)` collapses to ~0.27px on phones: icon boxes ~10px, gaps ~3px, password toggle offset ~3px. |
| P-05 | High (APK) | `ForgotPassword.jsx:106-121` | Invisible "Back to login" (white 40% on mint), dark-theme badges, inline `display:flex` beats the media rule hiding them. |
| P-06 | High (APK) [E] | `OTP.css:101-125` | Six 44px boxes need 299px; 280px available at 360 → last box clipped. |
| P-07 | High (APK) [E] | `Auth.css:166-176` | Stacked auth card keeps `max-height; overflow-y:auto; scrollbar hidden` inside a scrolling page (nested scroll trap). |
| P-08 | High | `TermsOfService.jsx` | FAQ accordion has no CSS (`legal-accord*`); can't collapse. |
| P-09 | High | `CookiePolicy.jsx:306` | `cookie-card__*`, `cookie-chip` missing; 2-col grid at ≤767 = 114px cards. |
| P-10 | High | `Legal.css:400-417` | `li{display:flex}` splits mixed text/`<strong>` into columns. |
| P-11 | High (APK) | `JobCard.css:16-19` | Slider card fixed 360px > 312-342px container. |
| P-12 | High [E] | `SkillsSlider.css:200-238` | 993-1200: orbit cards overlap the headline. |
| P-13 | High [E] | `Testimonials.css:31-36` | Header row doesn't wrap on phones; heading in ~180px. |
| P-14 | High [E] | `TrendingSkills.css:13-19` | Header squeezed to ~120px at 360 by nowrap button. |
| P-15 | High | `Contact.css:10,729` | Hero padding < navbar height → top 22px under the fixed navbar. |
| P-16 | High | `About.css:134,2847` | `margin-top:70px` never removed with padding at ≤1024 → 140-160px blank above hero. |
| P-17 | Med | `Hero.css:7-17,202` | Tablet hero ~1100px tall; landscape min-height 640. |
| P-18 | Med [E] | `Hero.css:97-99` | `heading-nowrap` exceeds its 980px box at ≥1300. |
| P-19 | Med | arc slider | Tiny text, dead "Get in touch" button, no touch/drag. |
| P-20 | Med [E] | `Testimonials.css:219-537` | Pixel-anchored name/avatar (`left:275px`) collides at 901-1100. |
| P-21 | Med | `Testimonials.css` | Bottom stats nowrap; 38px arrow button. |
| P-22 | Med | `AboutSection.css` | 1081-1280 chat card squeezed to ~230px; 9.9-11px text. |
| P-23 | Med [E] | `About.css:131-144` | Hero `max-height + overflow:hidden` clips content on short windows. |
| P-24 | Med [E] | `About.css:893-952` | Floating orbit cards overlap neighbouring columns at 1025-1180. |
| P-25 | Med | `About.css:2036-3045` | ≤768 comparison board loses column labels. |
| P-26 | Med [M] | `About.css` | 30 declarations at 9.5-11.5px (16 nodes @390). |
| P-27 | Med | `marketplace.css:937-945` | Skills/gigs grids stay 1-col to 768 (700px tablet = one huge card). |
| P-28 | Med | `FilterSelect.css:69-86` | Panel no max-height / edge clamp. |
| P-29 | Med | `marketplace.css:715-740` | Freelancer strip: hidden scrollbar, no snap, no arrows. |
| P-30 | Med | `GigCard.css:405-430` | `minmax(340px,1fr)` grid overflows narrow hosts; uncapped at ≥1700. |
| P-31 | Med | `Legal.css:765-792` | Back-to-top hidden under Buddy FAB. |
| P-32 | Med | `HelpCenter.css` | 12px close target; FAQ header nowrap. |
| P-33 | Med | inputs sitewide | Font < 16px → iOS auto-zoom on focus (login/registration in iOS app). |
| P-34 | Med | `variables.css:263-291` | Type scale shrinks at ≤400. |
| P-35 | Med | `CookiePolicy.jsx:417` | Info card children not wrapped → horizontal row on phones. |
| P-36 | Med | `SkillsSlider.css:379` | ≤480 2-col cards ~150px, titles ellipsised. |
| P-37 | Med | `TrendingSkills.css:399` | Three nowrap pills overflow card at ≤360. |
| P-38 | Med | `Auth.css:155` | Branding stacked above the card pushes the form ~330px down. |
| P-39 | Med | misc | `100vh` / `60vh` / `80vh` page heights (X5). |
| P-40..46 | Low | Contact 768-900 cards tight; NotFound 11.5px+nowrap; marketplace gig overlay hover-only; Legal TOC sticky no max-height; AppDownload QR; About dot buttons 6px; Unauthorized inline-styled with 24px link. |

### 3.3 Marketplace, detail, forms, AI (M)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| M-01 | Crit (APK) | `ClientOnboarding.jsx:804` | Inline `grid 1fr 1fr auto` language row → ~87px selects at 360; blocks mandatory step. |
| M-02 | Crit (APK) | `BrowseFreelancers.css:338-370` | Filter popovers fixed 240-320px absolute, no phone sheet → clipped, Apply unreachable. |
| M-03 | Crit (APK) | `BrowseGigs.css:200-274` | Category scroller starved to 40-80px by non-shrinking count + Filters cluster. |
| M-04 | Crit (APK) | `BrowseFreelancers.css:1201`, jsx:921 | Pagination renders every page number, no wrap → Next unreachable with > ~5 pages. |
| M-05 | High (APK) | `native-app.css:36-52` + page CSS | 82-110px blank above content (navbar absent); override targets nonexistent `.gd-page`; BG/BF/PFP have no override and no BackButton. → zero `--navbar-h` under `.is-native-app`. |
| M-06 | High | `JobDetails.css:12` | `overflow-x:hidden` on page kills the sticky Apply card (≥1025). |
| M-07 | High | `JobDetails.css:1254-1301` | 861-1024: grid is 1 col but mobile apply bar appears only ≤860 → no apply action until page end. |
| M-08 | High | `PublicClientProfile.css` | Second copy of stylesheet after media query overrides mobile hero fixes; inline `display:flex` avatars ~460px in 262px. |
| M-09 | High | `GigDetail.css:2295-2367` | Lightbox arrows at -64px off-screen on tablets; close/counter off-screen in landscape; no swipe. |
| M-10 | High | `AiMatchmaking.css:181` | Sticky brief panel taller than viewport; primary button unreachable. |
| M-11 | High | `AiMatchmaking.jsx` | ≤1023 results render below long form with no scroll-to → looks broken. |
| M-12 | High | BP/AIM/PP/BF | Chip/tag remove ✕ ~12px targets. |
| M-13 | Med | `BrowseProjects` sheet | Budget inputs unstyled, ~332px in 320px. |
| M-14 | Med | sheets/drawers | `85vh`, no safe-area; BG footer scrolls away. |
| M-15 | Med [E] | `jd-mobile-bar`, `gd-mobile-fixed-bottom-bar` | No safe-area; GD pads page only 80px. |
| M-16 | Med | `JobDetails.css:654` | Sticky panel inner-scroll with hidden scrollbar on short laptops. |
| M-17 | Med | `JobDetails.css:342-384` | 4-col facts strip truncates budget at 1025-1279. |
| M-18 | Med | `GigDetail.css:1106` | 3 tier cards ~200px wide, price clips at 1025-1180. |
| M-19 | Med | `GigDetail.css:1993` | Price row doesn't wrap in 299px column. |
| M-20 | Med | `GigDetail.css:528-572` | Slider arrows hover-only 769-1024 (iPad). |
| M-21 | Med | `GigDetail.css:122-247` | Hero gallery capped 260px tall when full-width → 3.6:1 strip. |
| M-22 | Med | `GigDetail.css:1319` | Compare table never scrolls → 65px columns at 360. |
| M-23 | Med | `PublicFreelancerProfile.css:1003` | Sticky sidebar no max-height; hire CTA after all content ≤1024. |
| M-24 | Med | `PublicFreelancerProfile.css:725` | Gig footer row no wrap (pills + button in 228px). |
| M-25 | Med | `PublicFreelancerProfile.css:516` | `1fr` + long strings widen left column. |
| M-26-29 | Med | PostProject, AiMatchmaking | 10-11.8px helper text; 21-40px pills/buttons. |
| M-30 | Med | `AiTools.css:979` | Cost-estimator result panel sticky, uncapped. |
| M-31 | Med | `AiTools.css:372` | Buddy chat fixed 320px → too tall landscape/keyboard. |
| M-32 | Med | AiTools | Sub-12px text; 15-32px targets. |
| M-33 | Med (APK) | `FreelancerOnboarding.css` | Desktop-compact inputs (38px, 13.5px font), 28px step nodes, 10-11px labels. |
| M-34 | Med | both onboardings | Avatar upload overlay hover-only. |
| M-35 | Med | `fob-dropdown-menu` | No max-height/scroll. |
| M-36 | Med | `ClientOnboarding.jsx:1070` | Resume modal inline padding 40px, no scroll. |
| M-37 | Med | `ClientOnboarding.jsx:960` | Div-based 24-26px toggle/checkbox, no semantics. |
| M-38-42 | Med | BP/BG/BF/JD/GD/PFP | 24-34px filter chips/buttons; 11-11.8px text. |
| M-43-58 | Low | ≥1700 grid cap pointless; BP pagination no wrap; sheet lacks Skills/Date filters; `minmax(280px)` overflow ≤335; client strip no min-width; breadcrumbs; KPI dividers; micro-text; PP stepper at 320; PP sidebar score hidden below form; blur blobs jank; breakdown table no scroller; PaymentConfirm no media query; GigDetail skeleton mismatch; sticky stepper inert; 768 min/max conflict. |

### 3.4 Freelancer dashboard (F)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| F-01 | Crit [M] | `DashboardOverview.jsx:468-507`, `BentoDashboard.css:1532-1561` | KPI wrappers inline `gridColumn:span 3` beat all media queries; 4 cards ~75px wide at 390 (also client C-01). → classes + 6/12 span breakpoints. |
| F-02 | Crit [E] | `SkillTest.css:708-993` | ≤1024: sidebar stacked under question, question card squashed to ~140px with `overflow:hidden` → test cannot be completed on a 360x640 phone. |
| F-03 | Crit [V] | `FreelancerWork.jsx:735,829,871` | Submit Work modal uses `fl-edit-sheet-overlay`/`fl-form-card`: no CSS → renders inline at page bottom, no backdrop. |
| F-04 | High [V] | Gigs/Work/CreateGig JSX | `sk-badge`, `sk-icon-btn`, `sk-pill-action-btn` have no CSS → unstyled native buttons. |
| F-05 | High | `FreelancerMessages.css:1285`, `FreelancerLayout.css:65` | Messenger `100vh`; ≤768 height `100vh-60px` vs 72px navbar → composer clipped 12px+. |
| F-06 | High | `FreelancerGigs.css:546-674` | Editor topbar: Save pushed off-screen exactly when "Unsaved" appears (360-430). |
| F-07 | High [E] | `FreelancerGigs.css:333-426` | List-view row needs ~715px at 768 → title collapses. |
| F-08 | High | `FreelancerPortfolio.css:455-473` | Edit/Delete/Preview overlay hover-only (default grid view). |
| F-09 | High | `FreelancerGigs.css:1180`, `CreateGig.css:888` | Gallery "Set cover"/Delete hover-only; 30px targets. |
| F-10 | High | `BentoDashboard.css:82-94` | Card header (title + toggle/link) doesn't wrap → title crushed to ~80px. |
| F-11 | High | `BentoDashboard.css:174` | Hero chip/date row nowrap, clipped by `overflow:hidden`. |
| F-12 | High | `DashboardOverview.jsx`, `FreelancerWallet.jsx` | SVG charts `preserveAspectRatio="none"`: distorted at any non-design width; HTML axis labels misaligned; hover-only tooltips. |
| F-13 | High | `FreelancerWallet.css:960-1037` | Withdraw modal not scrollable; Confirm unreachable in landscape/keyboard. |
| F-14 | High | `FreelancerProposals.css:192` | Sticky toolbar 170-200px tall on phones; top offset mismatches navbar. |
| F-15 | High [E] | `FreelancerProposals.css:408-496` | Card row overflows ~1025-1200, actions clipped. |
| F-16 | High | `:has()` layouts | Messages layout lost on WebView < 105. |
| F-17 | High | `JobCard.css`, `BentoDashboard.css:631` | Marquee: no touch scroll, 360px cards in ~284px window; reduced-motion mode shows nothing scrollable. |
| F-18 | High | `SkillTest.css:1062` | Result/Cancel cards `max-height:94vh`, no scroll. |
| F-19 | High | `BuddyWidget` vs Profile/Settings/CreateGig bars | FAB covers right end of sticky Save bars ≤1024. |
| F-20-40 | Med | Composer safe-area/scroll btn; **gigs vs create-gig CSS collisions (X12)**; profile hero 64px hole; sticky bar 170-200px; 24-28px card padding on phones; proposals stats 3+2 / 5 stacked; inline 2-col grid in edit modal; stats grids 1/row; editor tabs 768-900; messenger no ≥1700 cap; chat header crowded; details pane covers chat, no scrim; tier grid 901-1100; live-preview pill overlap; alert truncated to one line; `vh` modals; contract meta overflow; camera card too big; textarea + keyboard; onboarding `100vh`, avatar hover-only; hard-coded sticky `top:` values (72/76/96/140). |
| F-41-46 | Low | `.fsp-grid` `minmax(320px)` ≤347; contract dividers; titles don't step down; wallet table no min-width; `background-attachment:fixed` / `100vw`; fixed input widths and <16px inputs. |

Text < 12px and targets < 40px in the freelancer area are listed in the reviewer notes (dashboard, messages, gigs, wallet, proposals, work, portfolio, profile, skill test, security/settings switches 24px).

### 3.5 Client dashboard + common pages (C)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| C-01 | Crit [M] | `ClientDashboardOverview.jsx:207-246` | Same inline `span 3` as F-01 → +96-103px page overflow. |
| C-02 | High | `BentoDashboard.css:174` | Hero date row nowrap. |
| C-03 | High | `BentoDashboard.css:82`, jsx:272-315 | Card heads/metric rows don't wrap. |
| C-04 | High | `ClientDashboardOverview.jsx:87,318-418` | Chart viewBox 560 → labels render ~6px; hover-only tooltip; yearly labels collide. |
| C-05 | High [V] | `ClientWallet.jsx:893` | **Deposit Funds modal has no CSS** (`fl-modal-*` deleted): not an overlay on any device. |
| C-06 | High | `BuddyChatPage.css:13` | `100vh - 4.5rem` ignores container padding → send box below fold. |
| C-07 | High | `FreelancerLayout.css:65`, `ClientLayout.css:26` | Messages height mismatch; dead `.cl-messages-layout`. |
| C-08 | High | `PostProject.css:485-615` | Step footer buttons overflow ≤480; only media query is 900. |
| C-09 | High | `ClientProjects.jsx:554` | Badge row no wrap. |
| C-10 | High [V] | `ClientMessages.jsx:903` | Image lightbox class `flm-lightbox-overlay` doesn't exist (CSS has `-backdrop`). |
| C-11 | Med [V] | Projects/Settings/Security JSX | `cl-btn--secondary`, `fs-btn-outline`, `fsec-btn-outline` unstyled. |
| C-12 | Med [V] | `ClientSecurity.jsx:660` | `fsec-activity-*`, `fsec-danger-*` no CSS. |
| C-13 | Med | `FreelancerMessages.css:1011` | Details pane covers 74% of phone chat, no scrim. |
| C-14 | Med | `PostProject.css:7-17,374` | Double gutters + 28px padding → ~250px fields. |
| C-15-27 | Med | AI strip text squeezed; stepper 901-1100; wallet chart labels misaligned; notification actions hover-only (769-1280 touch) and 28px; notification text one-line nowrap on phones; modals `vh` + 1.75rem padding; `.cl-btn{width:100%}` + nowrap; escrow row no wrap; milestone rows no wrap; sticky bars + FAB/safe-area; profile cards 28px padding, `minmax(260px)`; targets < 40px; text < 12px. |
| C-28-32 | Low | Dead sidebar CSS; saved-freelancers 2-col lock; review-proposals polish; no ≥1700 cap on Messages; Google Fonts `@import` ×3. |
| N-02 | High [M] | `Settings` pages (fl & cl) | Sub-nav pill row stretches page to ~619px at 360/390 → cards cut off. Cause not yet confirmed (likely `1fr` grid child min-content); check when fixing. |

### 3.6 Admin panel (A)

| ID | Sev | Where | Issue → fix |
|---|---|---|---|
| A-01 | Crit [M] | `AdminPanelLayout.css/.jsx` | No mobile shell (see S-01). |
| A-02 | Crit [M] | `AdminPanelLayout.css:972` | ≤400: dead selector → sidebar covers 67% of screen. |
| A-03 | High | `AdminPanelLayout.css:261-301` | Header search squeezed; dropdown as narrow as the input. |
| A-04 | High | `AdminPanelLayout.css:67-98` | `100vh` + nested scroll in shell. |
| A-05 | High [E] | `AdminPanelLayout.css:431-503` | 5-col stat grid clips "PKR 1,250,000" at 1201-1500. |
| A-06 | High | `AdminPanelLayout.css:506-546` | Tables nowrap, no sticky column / card fallback; Users table needs ~800px. |
| A-07..A-19 | Med | grids `1fr` not content-aware; `.ap-tabs` can't wrap; analytics bars/labels overlap + hover tooltips; settings rows squeeze; modals 24+28px padding / `90vh`; `.ap-btn-sm` ~25px targets; text 10.4-11.5px; hover-only `data-tip` on icon buttons; **dark-theme leftovers on light theme (badge/alert contrast 1.5-2.4:1)**; taxonomy tabs overflow, fixed-vh panel, `100vw` modal, 2-col forms don't collapse. |
| A-20..A-24 | Low/Med | Taxonomy page is a dark standalone with no admin shell/nav; admin login `100vh` + inline styles + no `inputMode`; no ≥1700 cap; pagination no wrap; filters search only on Enter. |

---

## 4. Suggested fix order (when we start)

1. **Foundations** (unblocks everything): breakpoint tokens (480/768/1024/1280/1700), `--vh-full` + `--app-vh`, safe-area + `viewport-fit=cover`, `--navbar-h:0` in native, `pointer:coarse` tap/text floors, hover-none rules, z-index ladder, overflow dev-detector.
2. **Broken-on-all-sizes (X1)**: restore/replace missing CSS (modals, lightbox, role, legal accordion, cookie, buttons, badges). Highest value per line changed.
3. **Admin shell** (S-01/A-01..A-06) and **navbar/notification/search** (S-02..S-04).
4. **Dashboards**: bento KPI classes (F-01/C-01), Settings stretch (N-02), card heads/wrap rules, charts, messenger, wallet/withdraw/deposit modals.
5. **Public/APK pages**: auth (`--u`, OTP, forgot), onboarding, browse filters/pagination, detail pages, legal/help overflow.
6. **Skill test** layout and proctoring camera.
7. Sweep: tap targets, text floors, `minmax(0,1fr)`, class collisions, dead CSS removal.

Re-run the same Playwright harness (script kept outside the repo) after each phase to confirm overflow goes to zero.

---

## 5. Fix status (2026-10-16)

All sections above were worked through by area. Re-measured with the same harness (77 routes × 360/390/768/1024/1366, production build, empty-data API mocks):

| Viewport | Pages with horizontal overflow | Tap targets < 32px | Text nodes < 12px |
|---|---|---|---|
| 360 | 29 → **0** | 369 → 109 | 218 → 22 |
| 390 | 6 → **0** | 373 → 110 | 218 → 22 |
| 768 | 0 → 0 | 424 → 111 | 215 → 20 |
| 1024 | 0 → 0 | 471 → 414 | 273 → 71 |
| 1366 | 0 → 0 | 507 → 483 | 301 → 70 |

(Tap-target rules are scoped to touch devices, so the desktop columns barely move by design. What remains at 390: the 30px-tall logo link, 20px-tall breadcrumb/text links, 24px switches, footer newsletter input.)

**Deliberately not changed:** footer `-64px` overlap (S-24); hidden scrollbars in the native app (S-26); token scale below 400px (S-16 residual: 360-400px phones still use a slightly smaller type scale than 412px+); unused `NotificationBell` component left on disk.

**Needs a real-device / emulator check (not verifiable in desktop Chromium):** safe-area insets under `viewport-fit=cover` on Android 15+ gesture nav; keyboard + `--app-vh` behaviour in the WebView; old-WebView fallbacks (`:has()`, `overflow-x: clip`); the GigDetail lightbox controls, PostProject sidebar reorder, BrowseFreelancers filter sheet; the admin app APK build.

**Regressions found and fixed during verification:** headings on Post Project / AI Matchmaking / footer lost the Syne font (it was only loaded via `Hero.css`, which the Role page used to import globally) → Syne added to the global font import in `variables.css`; sticky sidebars on Post Project and AI Matchmaking hid their lower content behind an inner scroll on short laptop windows → now sticky only when the viewport is tall enough.
