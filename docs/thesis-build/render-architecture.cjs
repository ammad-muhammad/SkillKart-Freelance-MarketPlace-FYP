/**
 * Draws Figure 9.1 (system architecture) as a layered diagram, laid out for print legibility.
 * Output: thesis-figures/diagrams/fig-09-01-architecture.png (+ an entry in manifest.json).
 *   node render-architecture.cjs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "..", "Front-end", "node_modules", "playwright-core"));
const OUT = path.join(__dirname, "..", "thesis-figures", "diagrams");
fs.mkdirSync(OUT, { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#0B1F33}
  #fig{width:1000px;padding:18px;background:#fff}
  .layer{border:2px solid #042E4C;border-radius:12px;background:#F4F8FC;padding:34px 16px 16px;position:relative}
  .layer>.title{position:absolute;top:8px;left:14px;font-weight:700;font-size:15px;color:#042E4C;letter-spacing:.2px}
  .row{display:flex;gap:14px}
  .box{flex:1;border:1.5px solid #1A6FA8;background:#E3ECF6;border-radius:8px;padding:10px 12px;font-size:15px;line-height:1.3;text-align:center;box-shadow:1px 2px 3px rgba(0,0,0,.12)}
  .box b{display:block;font-size:16px;margin-bottom:2px}
  .box small{display:block;font-size:13px;color:#33475B}
  .db{border-radius:10px 10px 18px 18px/14px 14px 22px 22px}
  .conn{display:flex;gap:14px;height:54px;align-items:center}
  .conn>div{flex:1;text-align:center;font-size:13.5px;color:#1E293B;position:relative;height:100%;display:flex;align-items:center;justify-content:center}
  .conn>div:before{content:"";position:absolute;left:50%;top:0;bottom:8px;border-left:2px solid #334155}
  .conn>div:after{content:"";position:absolute;left:calc(50% - 6px);bottom:2px;border:6px solid transparent;border-top:8px solid #334155;border-bottom:0}
  .conn span{background:#fff;padding:1px 8px;position:relative;z-index:1;border-radius:4px}
  .dashed:before{border-left-style:dashed !important}
  .col{display:flex;flex-direction:column;gap:12px;flex:1}
  .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .ext{background:#fff;border-color:#475569}
  .opt{border-style:dashed}
  .prov{background:#fff;font-size:13.5px}
  .arrow{text-align:center;font-size:20px;line-height:14px;color:#334155}
</style></head><body><div id="fig">
  <div class="layer"><div class="title">Clients — one React 19 + Vite codebase (Front-end/src), three build targets</div>
    <div class="row">
      <div class="box"><b>Web SPA</b>browser · hosted on Vercel</div>
      <div class="box"><b>Android app</b>Capacitor — client, freelancer and admin-panel screens</div>
      <div class="box"><b>Admin Android app</b>Capacitor — admin panel only</div>
    </div>
  </div>
  <div class="conn"><div><span>HTTPS  /api/v1/*  (JSON)</span></div><div><span>HTTPS  /api/v1/*  (origin https://localhost)</span></div><div><span>HTTPS  /api/v1/admin-panel/*</span></div></div>
  <div class="layer"><div class="title">Express REST API — Node.js, hosted on Railway</div>
    <div class="row">
      <div class="col" style="flex:2">
        <div class="box"><b>Middleware pipeline</b>Helmet · CORS · rate limiting · NoSQL sanitisation · authentication · RBAC · validation · reCAPTCHA</div>
        <div class="arrow">↓</div>
        <div class="box"><b>Controllers → Services → Mongoose models</b>strict layering; escrow, matching, AI and email logic live in services</div>
      </div>
      <div class="col" style="flex:1">
        <div class="box"><b>Scheduled jobs</b>node-cron: milestone auto-release, stale-order and offer clean-up</div>
        <div class="box"><b>Webhook endpoint</b>/webhooks/stripe — signature verified</div>
      </div>
    </div>
  </div>
  <div class="conn"><div><span>queries · writes</span></div><div><span>provider calls</span></div><div class="dashed"><span>REST / SDK calls — each optional, fails open</span></div></div>
  <div class="row" style="align-items:stretch">
    <div class="box db" style="flex:.8;display:flex;flex-direction:column;justify-content:center"><b>MongoDB Atlas</b>40 collections via Mongoose<small>sole system of record for marketplace data</small></div>
    <div class="layer" style="flex:1.3;padding-bottom:14px"><div class="title">AI provider router</div>
      <div class="col">
        <div class="box"><b>Priority-ordered fallback</b>AI_PRIORITY_* · clean 503 if all fail</div>
        <div class="arrow">↓</div>
        <div class="box prov">Gemini → DeepSeek → Qwen → Groq → Claude → Ollama (local)</div>
      </div>
    </div>
    <div class="layer" style="flex:1.9;background:#F1F5F9;border-color:#475569;border-style:dashed;padding-bottom:14px;padding-top:58px"><div class="title" style="color:#334155;right:14px;line-height:1.25">External services —<br>each independently degradable</div>
      <div class="grid2">
        <div class="box ext"><b>Stripe</b><small>wallet top-ups, gig deposits, Connect payouts</small></div>
        <div class="box ext"><b>Email router</b><small>Gmail API (HTTPS) or SMTP</small></div>
        <div class="box ext"><b>Cloudinary</b><small>avatars, CVs, portfolio, attachments</small></div>
        <div class="box ext"><b>Firebase FCM</b><small>Android push notifications</small></div>
        <div class="box ext"><b>Supabase</b><small>social OAuth only — no marketplace data</small></div>
        <div class="box ext"><b>Google reCAPTCHA v3</b><small>invisible bot scoring</small></div>
      </div>
    </div>
  </div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2.5 });
  await page.setContent(html);
  const el = page.locator("#fig");
  await el.screenshot({ path: path.join(OUT, "fig-09-01-architecture.png") });
  const b = await el.boundingBox();
  const mf = path.join(OUT, "manifest.json");
  const prev = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
  const landscape = b.width / b.height > 1.15;
  prev["fig-09-01-architecture"] = { width: Math.round(b.width * 2.5), height: Math.round(b.height * 2.5), fontPx: 15, landscape, textPt: Number((15 * Math.min(6.3 / b.width, 8.3 / b.height) * 72).toFixed(1)) };
  fs.writeFileSync(mf, JSON.stringify(prev, null, 1));
  console.log("architecture", Math.round(b.width) + "x" + Math.round(b.height), prev["fig-09-01-architecture"]);
  await browser.close();
})();
