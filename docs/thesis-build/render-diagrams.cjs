/**
 * Renders every diagrams/*.mmd (Mermaid) to ../thesis-figures/diagrams/<name>.png using the repo's
 * Playwright Chromium. Print-friendly theme: white background, dark text, SkillKart navy/blue accents.
 *   node render-diagrams.cjs            # all
 *   node render-diagrams.cjs fig-09-02  # only files whose name starts with this
 * Writes manifest.json (size + text size on an A4 page) which build-docx.cjs uses to decide whether a
 * diagram deserves a landscape page.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "..", "Front-end", "node_modules", "playwright-core"));

const SRC = path.join(__dirname, "diagrams");
const OUT = path.join(__dirname, "..", "thesis-figures", "diagrams");
fs.mkdirSync(OUT, { recursive: true });
const mermaidJs = fs.readFileSync(path.join(__dirname, "node_modules", "mermaid", "dist", "mermaid.min.js"), "utf8");

const THEME = {
  theme: "base",
  themeVariables: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "18px",
    primaryColor: "#E3ECF6",
    primaryTextColor: "#0B1F33",
    primaryBorderColor: "#042E4C",
    lineColor: "#334155",
    secondaryColor: "#EEF2FF",
    tertiaryColor: "#FFF7ED",
    noteBkgColor: "#FFFBEB",
    noteTextColor: "#422006",
    noteBorderColor: "#D97706",
    actorBkg: "#E3ECF6", actorBorder: "#042E4C", actorTextColor: "#0B1F33",
    signalColor: "#334155", signalTextColor: "#111827",
    labelBoxBkgColor: "#E3ECF6", labelBoxBorderColor: "#042E4C",
    sequenceNumberColor: "#ffffff",
  },
  flowchart: { curve: "basis", htmlLabels: true, nodeSpacing: 36, rankSpacing: 46, padding: 14, wrappingWidth: 220, useMaxWidth: false },
  sequence: { mirrorActors: false, showSequenceNumbers: false, actorMargin: 14, messageMargin: 20, boxMargin: 6, noteMargin: 8, width: 112, wrap: true, actorFontSize: 14, messageFontSize: 14, noteFontSize: 14, useMaxWidth: false },
  er: { useMaxWidth: false, layoutDirection: "TB", fontSize: 16, entityPadding: 16, minEntityWidth: 110, minEntityHeight: 50 },
  state: { useMaxWidth: false },
  securityLevel: "loose",
};

(async () => {
  const only = process.argv.slice(2);
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".mmd") && (!only.length || only.some((o) => f.startsWith(o)))).sort();
  const browser = await chromium.launch();
  const report = [];
  const manifest = {};
  for (const file of files) {
    const name = file.replace(/\.mmd$/, "");
    const source = fs.readFileSync(path.join(SRC, file), "utf8");
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2.5 });
    try {
      await page.setContent(`<html><body style="margin:0;background:#fff"><div id="host" style="display:inline-block;padding:20px;background:#fff"></div></body></html>`);
      await page.addScriptTag({ content: mermaidJs });
      // Few participants → roomier lifelines so long message labels don't overlap them.
      const participants = (source.match(/^\s*(actor|participant)\s/gm) || []).length;
      const theme = JSON.parse(JSON.stringify(THEME));
      if (participants && participants <= 4) Object.assign(theme.sequence, { width: 170, actorMargin: 24, wrap: true });
      else if (participants && participants <= 6) Object.assign(theme.sequence, { width: 190, actorMargin: 40, wrap: false });
      const err = await page.evaluate(async ({ source, THEME }) => {
        try {
          window.mermaid.initialize({ startOnLoad: false, ...THEME });
          const { svg } = await window.mermaid.render("diagram", source);
          document.getElementById("host").innerHTML = svg;
          return null;
        } catch (e) { return String((e && e.message) || e); }
      }, { source, THEME: theme });
      if (err) throw new Error(err.split("\n")[0]);
      await page.waitForTimeout(300);
      const el = page.locator("#host");
      await el.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: false });
      const box = await el.boundingBox();
      const fontPx = /^\s*(sequenceDiagram)/.test(source) ? 14 : /^\s*erDiagram/.test(source) ? 14 : 18;
      const landscape = box.width / box.height > 1.15;
      const inchPerPx = landscape ? Math.min(9.3 / box.width, 5.9 / box.height) : Math.min(6.3 / box.width, 8.3 / box.height);
      const pt = (fontPx * inchPerPx * 72).toFixed(1);
      manifest[name] = { width: Math.round(box.width * 2.5), height: Math.round(box.height * 2.5), fontPx, landscape, textPt: Number(pt) };
      report.push(`${landscape ? "L " : "P "}${pt >= 6.5 ? "ok  " : "SMALL"} ${name.padEnd(40)} ${String(Math.round(box.width)).padStart(5)}x${String(Math.round(box.height)).padEnd(5)} text on A4 page ≈ ${pt} pt`);
    } catch (e) {
      report.push(`FAIL ${name.padEnd(44)} ${e.message.slice(0, 160)}`);
    }
    await page.close();
  }
  await browser.close();
  const mf = path.join(OUT, "manifest.json");
  const prev = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
  fs.writeFileSync(mf, JSON.stringify({ ...prev, ...manifest }, null, 1));
  console.log(report.join("\n"));
})();
