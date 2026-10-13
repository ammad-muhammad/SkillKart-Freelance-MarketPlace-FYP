/**
 * Draws Figure 6.1 (use-case overview) as four role columns of capabilities.
 * Output: thesis-figures/diagrams/fig-06-01-use-cases.png (+ an entry in manifest.json).
 *   node render-usecases.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "..", "Front-end", "node_modules", "playwright-core"));
const OUT = path.join(__dirname, "..", "thesis-figures", "diagrams");
fs.mkdirSync(OUT, { recursive: true });

const col = (cls, title, sub, items) => `
  <div class="col ${cls}">
    <div class="head"><b>${title}</b><span>${sub}</span></div>
    ${items.map((i) => `<div class="uc">${i}</div>`).join("")}
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#0B1F33}
  #fig{width:1040px;padding:18px;background:#fff}
  .cols{display:flex;gap:14px;align-items:stretch}
  .col{flex:1;border:2px solid #042E4C;border-radius:12px;background:#F4F8FC;padding:0 12px 12px;display:flex;flex-direction:column;gap:9px}
  .head{margin:0 -12px 2px;padding:12px 10px;background:#042E4C;color:#fff;border-radius:9px 9px 0 0;text-align:center}
  .head b{display:block;font-size:19px}
  .head span{display:block;font-size:12.5px;color:#C9D8EA;margin-top:3px}
  .uc{border:1.5px solid #1A6FA8;background:#fff;border-radius:22px;padding:9px 12px;text-align:center;font-size:14.5px;line-height:1.3;box-shadow:1px 2px 3px rgba(0,0,0,.1)}
  .shared{margin-top:14px;border:2px dashed #475569;border-radius:12px;background:#F1F5F9;padding:12px 14px}
  .shared .t{font-weight:700;font-size:15px;color:#334155;margin-bottom:8px}
  .shared .row{display:flex;gap:10px}
  .shared .uc{flex:1;border-color:#475569}
</style></head><body><div id="fig">
  <div class="cols">
    ${col("v", "Visitor", "not signed in", [
      "Browse jobs, gigs and freelancers",
      "Search by text, category and skill",
      "Use the AI cost estimator and matchmaking",
      "Chat with Buddy (3 free messages)",
      "Register and sign in",
    ])}
    ${col("f", "Freelancer", "offers skills", [
      "Onboard; upload a CV for AI analysis",
      "Verify skills with a proctored test",
      "Publish gigs; apply to jobs (skill-gated)",
      "Send custom offers in chat",
      "Deliver work; log time",
      "Withdraw earnings",
    ])}
    ${col("c", "Client", "hires talent", [
      "Onboard with an AI industry hint",
      "Post jobs; order gigs",
      "Review proposals; hire with milestones",
      "Fund milestones; approve work",
      "Top up the wallet",
      "Save freelancers",
    ])}
    ${col("a", "Administrator", "admin panel", [
      "Sign in with an emailed code",
      "Moderate users, jobs, contracts, reviews",
      "Resolve disputes",
      "Manage wallets and withdrawals",
      "Broadcast; reply as Support",
      "Monitor, audit, analyse, configure",
    ])}
  </div>
  <div class="shared"><div class="t">Shared by signed-in clients and freelancers</div>
    <div class="row">
      <div class="uc">Chat and attachments</div>
      <div class="uc">Notifications and push</div>
      <div class="uc">Two-way reviews</div>
      <div class="uc">Raise a dispute</div>
      <div class="uc">Profile and security settings</div>
    </div>
  </div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 800 }, deviceScaleFactor: 2.5 });
  await page.setContent(html);
  const el = page.locator("#fig");
  await el.screenshot({ path: path.join(OUT, "fig-06-01-use-cases.png") });
  const b = await el.boundingBox();
  const mf = path.join(OUT, "manifest.json");
  const prev = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
  const landscape = b.width / b.height > 1.15;
  const inch = landscape ? Math.min(9.3 / b.width, 5.9 / b.height) : Math.min(6.3 / b.width, 8.3 / b.height);
  prev["fig-06-01-use-cases"] = { width: Math.round(b.width * 2.5), height: Math.round(b.height * 2.5), fontPx: 14.5, landscape, textPt: Number((14.5 * inch * 72).toFixed(1)) };
  fs.writeFileSync(mf, JSON.stringify(prev, null, 1));
  console.log("use-cases", Math.round(b.width) + "x" + Math.round(b.height), prev["fig-06-01-use-cases"]);
  await browser.close();
})();
