/**
 * Builds docs/SkillKart_FYP_Final_Report.docx from docs/FYP_Final_Report.md.
 *
 *   node build-docx.cjs
 *
 * The Markdown file stays the single source of truth for the text. This script adds what a printed
 * thesis needs: title page, roman-numbered front matter, a real table of contents plus lists of
 * figures and tables (Word fills in page numbers — see finalize-docx.ps1), chapter styling,
 * captioned tables and figures. Student / university details come from thesis.config.json.
 *
 * Conventions in the Markdown (so figures and captions need no code changes):
 *   Figure   ![Figure 9.1 — Title](thesis-figures/diagrams/fig-09-01-architecture.png "optional note")
 *            Several images in one paragraph are joined side by side into ONE figure (phone screens).
 *            If an image file does not exist yet, a clearly marked "to be inserted" frame is drawn in
 *            its place, so adding the screenshot later and rebuilding is all that is needed.
 *   Table    a bold line directly above the table:  **Table 7.1 — Title**
 *   Callout  a Markdown blockquote ( > text ).
 */
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const MD_FILE = path.join(ROOT, "FYP_Final_Report.md");
const OUT_FILE = process.env.THESIS_OUT ? path.resolve(process.env.THESIS_OUT) : path.join(ROOT, "SkillKart_FYP_Final_Report.docx"); // THESIS_OUT: write elsewhere when Word has the default file open
const FIG = path.join(ROOT, "thesis-figures");
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, "thesis.config.json"), "utf8"));
const MANIFEST_FILE = path.join(FIG, "diagrams", "manifest.json");
const MANIFEST = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) : {};

const PROJECT_TITLE = "SkillKart";
const PROJECT_SUBTITLE = "An AI-Powered Freelance Marketplace Platform";

// ── Page geometry (DXA: 1440 = 1 inch) ───────────────────────────────────────
const A4 = { w: 11906, h: 16838 };
const MARGIN = { top: 1152, bottom: 1152, left: 1152, right: 1152, header: 600, footer: 600 }; // 0.8" margins
const TEXT_W = A4.w - MARGIN.left - MARGIN.right; // 9602
const L_MARGIN = { top: 1100, bottom: 1100, left: 1152, right: 1152, header: 500, footer: 500 };
const PX = (dxa) => (dxa / 1440) * 96;
const MAX_IMG = {
  portrait: { w: PX(TEXT_W), h: 390 },
  landscape: { w: PX(A4.h - L_MARGIN.left - L_MARGIN.right), h: 480 },
};

const FONT = (typeof CONFIG.font === "string" && CONFIG.font.trim()) || "Times New Roman"; // thesis.config.json "font"
const MONO = "Consolas";
const BODY = 22; // body text, half-points (11 pt)
const NAVY = "042E4C"; // SkillKart brand navy
const ACCENT = "1A6FA8"; // SkillKart brand blue
const INK = "0B1F33";
const ZEBRA = "F1F5FA";
const SOFT = "E3ECF6";

// ── Placeholders in the Markdown ("*[Supervisor Name]*" …) ───────────────────
const students = [0, 1, 2].map((i) => (CONFIG.students || [])[i] || {});
const present = (v) => typeof v === "string" && v.trim() !== "";
const studentNames = students.map((s) => (present(s.name) ? s.name.trim() : ""));

function fillPlaceholders(md) {
  let regIndex = 0;
  const rep = (ph, value) => (md = md.split(ph).join(present(value) ? value.trim() : ph));
  rep("*[Department of Computer Science, University Name]*", present(CONFIG.department) && present(CONFIG.university) ? `${CONFIG.department.trim()}, ${CONFIG.university.trim()}` : "");
  rep("*[Department of Computer Science]*", CONFIG.department);
  rep("*[University Name]*", CONFIG.university);
  rep("*[Supervisor Name]*", CONFIG.supervisor);
  rep("*[e.g. 2022 – 2026]*", CONFIG.session);
  rep("*[Month, Year]*", CONFIG.submissionDate);
  rep("*[Name]*", CONFIG.headOfDepartment);
  if (studentNames.every(Boolean)) rep("*[Student 1], [Student 2], [Student 3]*", studentNames.join(", "));
  [0, 1, 2].forEach((i) => rep(`*[Student ${i + 1} Name]*`, studentNames[i]));
  md = md.replace(/\*\[Reg\. No\.\]\*/g, (m) => {
    const reg = students[regIndex % 3].regNo;
    regIndex += 1;
    return present(reg) ? reg.trim() : m;
  });
  return md;
}

// ── Image cache ──────────────────────────────────────────────────────────────
const IMG = new Map(); // key -> { data, w, h }
const STATS = { figuresEmbedded: 0, figurePlaceholders: [], tables: 0, captionedTables: 0 };

function getPngDimensions(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return { width: 800, height: 600 };
}

async function loadPng(key, filePath) {
  const buf = fs.readFileSync(filePath);
  const meta = getPngDimensions(buf);
  IMG.set(key, { data: buf, w: meta.width, h: meta.height });
}

async function loadMontage(key, filePaths) {
  // If first file exists, load it as fallback or primary
  if (filePaths.length > 0 && fs.existsSync(filePaths[0])) {
    await loadPng(key, filePaths[0]);
  }
}

const figKey = (srcs) => srcs.join("|");
const exists = (src) => fs.existsSync(path.join(ROOT, src));
const isImageParagraph = (tok) => tok.type === "paragraph" && tok.tokens.some((t) => t.type === "image") && tok.tokens.every((t) => t.type === "image" || (t.type === "text" && !t.text.trim()));

async function preloadImages(tokens) {
  for (const tok of tokens) {
    if (!isImageParagraph(tok)) continue;
    const srcs = tok.tokens.filter((t) => t.type === "image").map((t) => t.href);
    if (!srcs.every(exists)) continue;
    if (srcs.length === 1) await loadPng(figKey(srcs), path.join(ROOT, srcs[0]));
    else await loadMontage(figKey(srcs), srcs.map((s) => path.join(ROOT, s)));
  }
  const logo = path.join(FIG, "logo.png");
  if (fs.existsSync(logo)) await loadPng("logo", logo);
}

// ── Inline conversion ────────────────────────────────────────────────────────
const SYMBOLS = /([✔✓⚠✗])/;
function sanitize(text) {
  return text.replace(/✅/g, "✔").replace(/⚠️/g, "⚠").replace(/[  ]/g, " ");
}
function run(text, style = {}) {
  const props = { text, font: style.code ? MONO : style.font || FONT, size: style.size || BODY };
  if (style.code) { props.size = Math.round((style.size || BODY) * 0.85); props.shading = { type: D.ShadingType.CLEAR, color: "auto", fill: "EEF2F6" }; }
  if (style.bold) props.bold = true;
  if (style.italics) props.italics = true;
  if (style.strike) props.strike = true;
  if (style.color) props.color = style.color;
  if (style.highlight) props.highlight = style.highlight;
  if (style.link) { props.color = "0563C1"; props.underline = { type: D.UnderlineType.SINGLE }; }
  return new D.TextRun(props);
}
function textRuns(text, style) {
  text = sanitize(text);
  return text.split(SYMBOLS).filter((s) => s !== "").map((seg) => {
    if (SYMBOLS.test(seg)) {
      const color = seg === "✔" || seg === "✓" ? "15803D" : seg === "⚠" ? "B45309" : "B91C1C";
      return run(seg, { ...style, font: "Segoe UI Symbol", color: style.color || color });
    }
    return run(seg, style);
  });
}
function inline(tokens, style = {}) {
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case "text":
      case "escape":
        if (t.tokens && t.tokens.length) out.push(...inline(t.tokens, style));
        else out.push(...textRuns(t.text, style));
        break;
      case "strong": out.push(...inline(t.tokens, { ...style, bold: true })); break;
      case "em": {
        const unresolved = /^\[[^\]]*\]$/.test((t.text || "").trim());
        out.push(...inline(t.tokens, { ...style, italics: true, ...(unresolved ? { highlight: "yellow" } : {}) }));
        break;
      }
      case "del": out.push(...inline(t.tokens, { ...style, strike: true })); break;
      case "codespan": out.push(...textRuns(t.text, { ...style, code: true })); break;
      case "br": out.push(new D.TextRun({ break: 1 })); break;
      case "link":
        if (/^https?:\/\//.test(t.href)) out.push(new D.ExternalHyperlink({ link: t.href, children: inline(t.tokens, { ...style, link: true }) }));
        else out.push(...inline(t.tokens, style));
        break;
      case "html": case "image": break;
      default: if (t.raw) out.push(...textRuns(t.raw, style));
    }
  }
  return out;
}

// ── Block helpers ────────────────────────────────────────────────────────────
const numberingConfigs = [
  {
    reference: "bullets",
    levels: [
      { level: 0, format: D.LevelFormat.BULLET, text: "•", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } },
      { level: 1, format: D.LevelFormat.BULLET, text: "–", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 1100, hanging: 300 } } } },
      { level: 2, format: D.LevelFormat.BULLET, text: "▪", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 1600, hanging: 300 } } } },
    ],
  },
];
let orderedCount = 0;
function newOrderedReference() {
  const reference = `ol-${++orderedCount}`;
  const fmt = [D.LevelFormat.DECIMAL, D.LevelFormat.LOWER_LETTER, D.LevelFormat.LOWER_ROMAN];
  numberingConfigs.push({
    reference,
    levels: [0, 1, 2].map((l) => ({ level: l, format: fmt[l], text: `%${l + 1}.`, alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 600 + l * 500, hanging: 360 } } } })),
  });
  return reference;
}

const para = (children, opts = {}) => new D.Paragraph({ children, ...opts });
const bodyPara = (tokens, opts = {}) => para(inline(tokens), { alignment: D.AlignmentType.JUSTIFIED, ...opts });

function listBlocks(list, level = 0, reference) {
  const ref = list.ordered ? reference || newOrderedReference() : "bullets";
  const out = [];
  for (const item of list.items) {
    let first = true;
    for (const tok of item.tokens) {
      if (tok.type === "text" || tok.type === "paragraph") {
        out.push(para(inline(tok.tokens), first
          ? { numbering: { reference: ref, level }, alignment: D.AlignmentType.JUSTIFIED, spacing: { line: 336, after: 60 } }
          : { indent: { left: 600 + level * 500 }, alignment: D.AlignmentType.JUSTIFIED, spacing: { line: 336, after: 60 } }));
        first = false;
      } else if (tok.type === "list") {
        out.push(...listBlocks(tok, Math.min(level + 1, 2), tok.ordered ? newOrderedReference() : undefined));
      }
    }
  }
  return out;
}

function codeBlocks(text) {
  const lines = text.replace(/\s+$/, "").split("\n");
  return lines.map((line, i) =>
    new D.Paragraph({
      style: "CodeBlock",
      keepLines: true,
      keepNext: i < lines.length - 1,
      children: [new D.TextRun({ text: sanitize(line) === "" ? " " : sanitize(line), font: MONO, size: 17 })],
    })
  );
}

function quoteBlocks(tokens) {
  const out = [];
  for (const tok of tokens) {
    if (tok.type === "paragraph" || tok.type === "text") out.push(para(inline(tok.tokens, { size: 21 }), { style: "Quote", alignment: D.AlignmentType.LEFT }));
    else if (tok.type === "list") out.push(...listBlocks(tok));
  }
  return out;
}

// ── Tables ───────────────────────────────────────────────────────────────────
const cellText = (c) => (c.text || "").replace(/[*_`]/g, "");
const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
const LINE = { style: D.BorderStyle.SINGLE, size: 4, color: "B6C2CC" };

function columnWidths(tok, total, size = 20) {
  const cols = tok.header.length;
  const weights = [];
  for (let c = 0; c < cols; c++) {
    const lens = [cellText(tok.header[c]).length, ...tok.rows.map((r) => cellText(r[c] || { text: "" }).length)];
    const max = Math.max(...lens), avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    weights.push(Math.min(Math.max(0.55 * max + 0.45 * avg, 7), 48));
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  const floor = Math.max(620, Math.floor(total / cols / 3));
  // A column should never be narrower than its longest single word (so "Achieved" stays on one line).
  const wordMin = [];
  for (let c = 0; c < cols; c++) {
    const cells = [cellText(tok.header[c]), ...tok.rows.map((r) => cellText(r[c] || { text: "" }))];
    // Short columns (status, numbers, codes) keep their whole text on one line; long ones only need their longest word.
    const maxCell = Math.max(...cells.map((t) => t.length));
    const longest = maxCell <= 16 ? maxCell : Math.max(...cells.flatMap((t) => t.split(/\s+/)).map((w) => w.length));
    wordMin.push(Math.min(Math.round(longest * size * 5.4 + 220), Math.floor(total * 0.45)));
  }
  const minimum = wordMin.map((w) => Math.max(w, floor));
  let widths = weights.map((w, c) => Math.max(minimum[c], Math.round((w / sum) * total)));
  for (let guard = 0; guard < 20; guard++) {
    const over = widths.reduce((a, b) => a + b, 0) - total;
    if (over === 0) break;
    if (over > 0) {
      const slack = widths.map((w, c) => w - minimum[c]);
      const slackSum = slack.reduce((a, b) => a + b, 0);
      if (slackSum <= 0) { widths = widths.map((w) => Math.floor((w / (total + over)) * total)); break; }
      widths = widths.map((w, c) => w - Math.round((slack[c] / slackSum) * over));
    } else {
      widths[widths.indexOf(Math.max(...widths))] -= over; // give leftover to the widest column
    }
  }
  const fix = total - widths.reduce((a, b) => a + b, 0);
  widths[widths.indexOf(Math.max(...widths))] += fix;
  return widths;
}

function makeTable(tok, { caption, compact = false } = {}) {
  const cols = tok.header.length;
  const borderless = tok.header.every((h) => cellText(h).trim() === "");
  const small = cols >= 5;
  const size = compact ? 18 : small ? 17 : cols === 4 ? 19 : 20;
  const widths = columnWidths(tok, TEXT_W, size);
  const border = borderless ? NONE : LINE;
  const borders = { top: border, bottom: border, left: border, right: border };
  STATS.tables += 1;
  if (caption) STATS.captionedTables += 1;

  const mkCell = (cell, w, { header = false, zebra = false, bold = false } = {}) =>
    new D.TableCell({
      width: { size: w, type: D.WidthType.DXA },
      borders,
      verticalAlign: borderless ? D.VerticalAlign.BOTTOM : D.VerticalAlign.CENTER,
      margins: { top: compact ? 30 : 60, bottom: compact ? 30 : 60, left: 90, right: 90 },
      shading: header ? { type: D.ShadingType.CLEAR, color: "auto", fill: NAVY } : zebra ? { type: D.ShadingType.CLEAR, color: "auto", fill: ZEBRA } : undefined,
      children: [
        new D.Paragraph({
          spacing: { before: 0, after: 0, line: 252 },
          alignment: borderless ? D.AlignmentType.CENTER : D.AlignmentType.LEFT,
          children: inline(cell.tokens, { size, bold: header || bold, color: header ? "FFFFFF" : undefined }),
        }),
      ],
    });

  const rows = [];
  if (!borderless) {
    rows.push(new D.TableRow({ tableHeader: true, cantSplit: true, children: tok.header.map((h, i) => mkCell(h, widths[i], { header: true })) }));
  }
  tok.rows.forEach((r, ri) => {
    rows.push(new D.TableRow({ cantSplit: true, children: r.map((c, i) => mkCell(c, widths[i], { zebra: !borderless && ri % 2 === 1 })) }));
  });

  const table = new D.Table({
    width: { size: TEXT_W, type: D.WidthType.DXA },
    columnWidths: widths,
    layout: D.TableLayoutType.FIXED,
    alignment: D.AlignmentType.CENTER,
    rows,
  });
  const out = [];
  if (caption) out.push(para([run(caption, { size: 20, bold: true, color: INK })], { style: "TableCaption", keepNext: true }));
  out.push(table);
  out.push(para([], { spacing: { before: 0, after: 80 } }));
  return out;
}

// ── Figures ──────────────────────────────────────────────────────────────────
function fitImage(w, h, kind) {
  const max = MAX_IMG[kind];
  const scale = Math.min(max.w / w, max.h / h, 1.35);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
function imageParagraph(key, { alt, kind, frame = false, diagram = false }) {
  const img = IMG.get(key);
  // The diagrams are rendered at 2.5x; screenshots at 1x.
  const natural = diagram ? { w: img.w / 2.5, h: img.h / 2.5 } : { w: img.w, h: img.h };
  const size = fitImage(natural.w, natural.h, kind);
  const options = { type: "png", data: img.data, transformation: size, altText: { title: alt, description: alt, name: path.basename(key.split("|")[0]) } };
  if (frame) options.outline = { type: "solidFill", solidFillType: "rgb", value: "AEB9C4", width: 9525 };
  return new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 30 }, children: [new D.ImageRun(options)] });
}
function captionParas(label, title, note) {
  const text = label ? `${label} — ${title}` : title;
  const out = [para([run(text, { size: 20, bold: true, color: INK })], { style: "FigureCaption" })];
  if (note) out.push(para(inline(marked.lexer(note)[0].tokens, { size: 18, italics: true, color: "475569" }), { style: "FigureNote" }));
  return out;
}
// Print size (pt) of a diagram's text when fitted to a page in the given orientation.
function textPt(m, kind) {
  const max = MAX_IMG[kind];
  const scale = Math.min(max.w / (m.width / 2.5), max.h / (m.height / 2.5), 1.35);
  return m.fontPx * scale * 0.75;
}
// Landscape only if portrait would be hard to read AND landscape is clearly better (avoids half-empty landscape pages).
function wantsLandscape(m) {
  if (!m || !m.fontPx) return false;
  const p = textPt(m, "portrait"), l = textPt(m, "landscape");
  return p < 6.4 && l >= p * 1.25;
}

/** The "screenshot to be inserted" frame drawn where an image file does not exist yet. */
function placeholderFrame(srcs, title) {
  const dash = { style: D.BorderStyle.DASHED, size: 8, color: "B8860B" };
  const borders = { top: dash, bottom: dash, left: dash, right: dash };
  const lines = [
    para([run("SCREENSHOT TO BE INSERTED", { size: 20, bold: true, color: "8A6D00" })], { alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 80 } }),
    para([run(title, { size: 20, italics: true, color: "5C4A00" })], { alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 100 } }),
    ...srcs.map((s) => para([run(s, { size: 16, font: MONO, color: "8A6D00" })], { alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 20 } })),
  ];
  return [
    new D.Table({
      width: { size: TEXT_W, type: D.WidthType.DXA },
      columnWidths: [TEXT_W],
      layout: D.TableLayoutType.FIXED,
      alignment: D.AlignmentType.CENTER,
      rows: [new D.TableRow({
        cantSplit: true,
        height: { value: 3600, rule: D.HeightRule.ATLEAST },
        children: [new D.TableCell({
          width: { size: TEXT_W, type: D.WidthType.DXA },
          borders,
          verticalAlign: D.VerticalAlign.CENTER,
          shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "FFF9DB" },
          margins: { top: 200, bottom: 200, left: 200, right: 200 },
          children: lines,
        })],
      })],
    }),
    para([], { spacing: { before: 0, after: 40 }, keepNext: true }),
  ];
}

/** One figure from an image paragraph token → list of docx blocks; { landscape: [...] } marks a block that needs its own page. */
function figureFromToken(tok) {
  const images = tok.tokens.filter((t) => t.type === "image");
  const first = images[0];
  const srcs = images.map((i) => i.href);
  const m = (first.text || "").match(/^(Figure\s+[A-Z]?[\d.]+[a-z]?)\s+[—–-]\s+(.+)$/);
  const label = m ? m[1] : "";
  const title = m ? m[2] : first.text || path.basename(srcs[0]);
  const note = first.title || "";
  const key = figKey(srcs);
  if (!IMG.has(key)) {
    STATS.figurePlaceholders.push(`${label || "(unnumbered)"} ${srcs.join(", ")}`);
    return [...placeholderFrame(srcs, title), ...captionParas(label, title, note)];
  }
  STATS.figuresEmbedded += 1;
  const isDiagram = srcs[0].includes("/diagrams/");
  const landscape = isDiagram && wantsLandscape(MANIFEST[path.basename(srcs[0], ".png")]);
  const kind = landscape ? "landscape" : "portrait";
  const elements = [imageParagraph(key, { alt: title, kind, frame: !isDiagram, diagram: isDiagram && srcs.length === 1 }), ...captionParas(label, title, note)];
  return landscape ? [{ landscape: elements }] : elements;
}

// ── Front matter pieces ──────────────────────────────────────────────────────
function titlePage() {
  const c = (children, o = {}) => para(children, { alignment: D.AlignmentType.CENTER, ...o });
  const t = (text, o = {}) => run(text, { size: 24, ...o });
  const hl = (v, ph, o = {}) => (present(v) ? t(v.trim(), o) : t(ph, { ...o, italics: true, highlight: "yellow" }));
  const kids = [];
  const logo = IMG.get("logo");
  if (logo) kids.push(c([new D.ImageRun({ type: "png", data: logo.data, transformation: { width: 96, height: 96 }, altText: { title: "SkillKart logo", description: "SkillKart logo", name: "logo" } })], { spacing: { before: 200, after: 160 } }));
  kids.push(c([hl(CONFIG.university, "[University Name]", { size: 28, bold: true, color: INK })], { spacing: { after: 60 } }));
  kids.push(c([hl(CONFIG.department, "[Department of Computer Science]", { size: 26, color: INK })], { spacing: { after: 360 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 10 } } }));
  kids.push(c([t(PROJECT_TITLE, { size: 72, bold: true, color: NAVY })], { spacing: { before: 600, after: 120 } }));
  kids.push(c([t(PROJECT_SUBTITLE, { size: 30, color: INK })], { spacing: { after: 480 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 14 } } }));
  kids.push(c([t("Final Year Project Report", { size: 32, bold: true })], { spacing: { before: 360, after: 120 } }));
  kids.push(c([t("Submitted in partial fulfilment of the requirements for the degree of", { size: 22, italics: true })], { spacing: { after: 60 } }));
  kids.push(c([t("Bachelor of Science in Computer Science (BSCS)", { size: 26, bold: true })], { spacing: { after: 420 } }));

  // Submitted by
  kids.push(c([t("Submitted by", { size: 24, bold: true, color: NAVY })], { spacing: { after: 100 } }));
  const w = [5200, 3000];
  const cell = (text, width, o = {}) => new D.TableCell({
    width: { size: width, type: D.WidthType.DXA },
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    borders: { top: LINE, bottom: LINE, left: LINE, right: LINE },
    shading: o.header ? { type: D.ShadingType.CLEAR, color: "auto", fill: NAVY } : undefined,
    children: [para(o.runs || [t(text, { size: 22, bold: !!o.header, color: o.header ? "FFFFFF" : undefined })], { alignment: D.AlignmentType.CENTER })],
  });
  const rows = [new D.TableRow({ tableHeader: true, children: [cell("Name", w[0], { header: true }), cell("Registration No.", w[1], { header: true })] })];
  students.forEach((s, i) => {
    rows.push(new D.TableRow({ children: [
      cell("", w[0], { runs: [hl(s.name, `[Student ${i + 1} Name]`, { size: 22 })] }),
      cell("", w[1], { runs: [hl(s.regNo, "[Reg. No.]", { size: 22 })] }),
    ] }));
  });
  kids.push(new D.Table({ width: { size: w[0] + w[1], type: D.WidthType.DXA }, columnWidths: w, alignment: D.AlignmentType.CENTER, layout: D.TableLayoutType.FIXED, rows }));

  kids.push(c([t("Project Supervisor", { size: 24, bold: true, color: NAVY })], { spacing: { before: 360, after: 80 } }));
  kids.push(c([hl(CONFIG.supervisor, "[Supervisor Name]", { size: 24 })], { spacing: { after: 280 } }));
  kids.push(c([t("Session: ", { size: 22, bold: true }), hl(CONFIG.session, "[e.g. 2022 – 2026]", { size: 22 }), t("      Submission date: ", { size: 22, bold: true }), hl(CONFIG.submissionDate, "[Month, Year]", { size: 22 })]));
  return kids;
}

const frontHeading = (text, pageBreakBefore) => new D.Paragraph({ pageBreakBefore, style: "FrontHeading", children: [run(text, { size: 40, bold: true, color: INK })] });

// ── Main conversion ──────────────────────────────────────────────────────────
const CAPTION_RE = /^Table\s+[A-Z]?[\d.]+\s+[—–-]\s+/;

function convert(tokens) {
  const front = []; // certificate, declaration, dedication, abbreviations
  const body = [];
  let mode = "title"; // title -> front -> toc -> body
  let centerBlock = false;

  const nextReal = (i) => { let j = i + 1; while (tokens[j] && tokens[j].type === "space") j++; return j; };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (mode === "title") {
      if (tok.type === "html" && /page-break-after/.test(tok.raw)) mode = "front";
      continue;
    }

    if (mode === "front" || mode === "toc") {
      if (tok.type === "heading" && tok.depth === 2) {
        if (/^Table of Contents/i.test(tok.text)) { mode = "toc"; continue; }
        if (/^\d+\./.test(tok.text)) { mode = "body"; i--; continue; }
        mode = "front";
        front.push({ heading: tok.text, blocks: [] });
        continue;
      }
      if (mode === "toc") continue;
      const cur = front[front.length - 1];
      if (!cur) continue;
      const dedication = cur.heading === "Dedication";
      if (tok.type === "paragraph") {
        cur.blocks.push(para(inline(tok.tokens, { size: dedication ? 24 : BODY }), { alignment: dedication ? D.AlignmentType.CENTER : D.AlignmentType.JUSTIFIED, spacing: { before: dedication ? 2400 : 0, after: 240, line: 360 } }));
      } else if (tok.type === "table") {
        cur.blocks.push(...makeTable(tok, { compact: /abbreviation/i.test(cur.heading) }));
      }
      continue;
    }

    // ── body ──
    switch (tok.type) {
      case "heading": {
        if (tok.depth === 1) break;
        const level = tok.depth === 2 ? D.HeadingLevel.HEADING_1 : tok.depth === 3 ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_3;
        body.push(new D.Paragraph({ heading: level, children: inline(tok.tokens, { size: tok.depth === 2 ? 36 : tok.depth === 3 ? 28 : 24, bold: true }) }));
        break;
      }
      case "paragraph": {
        const raw = tok.raw.trim();
        if (isImageParagraph(tok)) { body.push(...figureFromToken(tok)); break; }
        // "**Table N.N — Title**" directly above a table is that table's caption.
        if (CAPTION_RE.test(raw.replace(/^\*\*/, "").replace(/\*\*$/, "")) && /^\*\*.*\*\*$/.test(raw)) {
          const j = nextReal(i);
          if (tokens[j] && tokens[j].type === "table") {
            body.push(...makeTable(tokens[j], { caption: raw.replace(/^\*\*/, "").replace(/\*\*$/, "") }));
            i = j;
            break;
          }
        }
        if (/^\[\d+\]\s/.test(raw)) { body.push(para(inline(tok.tokens, { size: 21 }), { alignment: D.AlignmentType.LEFT, indent: { left: 560, hanging: 560 }, spacing: { before: 0, after: 90, line: 288 } })); break; }
        if (centerBlock) { body.push(para(inline(tok.tokens, { size: BODY }), { alignment: D.AlignmentType.CENTER, spacing: { before: 600 } })); break; }
        body.push(bodyPara(tok.tokens));
        break;
      }
      case "list": body.push(...listBlocks(tok)); break;
      case "table": body.push(...makeTable(tok)); break;
      case "blockquote": body.push(...quoteBlocks(tok.tokens)); break;
      case "code": {
        if (tok.lang === "mermaid") { console.warn("  ! a mermaid block was found in the Markdown; move it to thesis-build/diagrams/*.mmd and reference the PNG"); break; }
        body.push(...codeBlocks(tok.text));
        body.push(para([], { spacing: { before: 0, after: 120 } }));
        break;
      }
      case "html":
        if (/align="center"/.test(tok.raw)) centerBlock = true;
        if (/<\/div>/.test(tok.raw)) centerBlock = false;
        break;
      case "hr": case "space": default: break;
    }
  }
  return { front, body };
}

// ── Document assembly ────────────────────────────────────────────────────────
const mkHeader = () => new D.Header({ children: [para([run(`${PROJECT_TITLE} — ${PROJECT_SUBTITLE}`, { size: 17, italics: true, color: "475569" })], { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } } })] });
const mkFooter = () => new D.Footer({ children: [para([new D.TextRun({ children: [D.PageNumber.CURRENT], size: 20, font: FONT })], { alignment: D.AlignmentType.CENTER })] });
const portraitPage = (pageNumbers) => ({ page: { size: { width: A4.w, height: A4.h }, margin: MARGIN, ...(pageNumbers ? { pageNumbers } : {}) } });
const landscapePage = () => ({ page: { size: { width: A4.w, height: A4.h, orientation: D.PageOrientation.LANDSCAPE }, margin: L_MARGIN } });
const hf = () => ({ headers: { default: mkHeader() }, footers: { default: mkFooter() } });

function splitBodySections(items) {
  const sections = [];
  let current = [];
  const pushPortrait = () => { if (current.length) sections.push({ kind: "portrait", children: current }); current = []; };
  for (const it of items) {
    if (it && it.landscape) { pushPortrait(); sections.push({ kind: "landscape", children: it.landscape }); }
    else current.push(it);
  }
  pushPortrait();
  return sections;
}

async function main() {
  const md = fillPlaceholders(fs.readFileSync(MD_FILE, "utf8").replace(/\r\n/g, "\n"));
  const tokens = marked.lexer(md, { gfm: true });
  await preloadImages(tokens);
  const { front, body } = convert(tokens);

  const frontKids = [];
  let first = true;
  const pushFront = (f) => { frontKids.push(frontHeading(f.heading, !first)); frontKids.push(...f.blocks); first = false; };
  // Certificate / Declaration / Dedication — each on its own page
  front.filter((f) => !/abbreviation/i.test(f.heading)).forEach(pushFront);
  // Contents, lists, abbreviations
  frontKids.push(frontHeading("Table of Contents", true));
  frontKids.push(new D.TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }));
  frontKids.push(frontHeading("List of Figures", true));
  frontKids.push(new D.TableOfContents("List of Figures", { hyperlink: true, stylesWithLevels: [new D.StyleLevel("Figure Caption", 1)] }));
  frontKids.push(frontHeading("List of Tables", true));
  frontKids.push(new D.TableOfContents("List of Tables", { hyperlink: true, stylesWithLevels: [new D.StyleLevel("Table Caption", 1)] }));
  front.filter((f) => /abbreviation/i.test(f.heading)).forEach((f) => { frontKids.push(frontHeading(f.heading, true)); frontKids.push(...f.blocks); });

  const bodySections = splitBodySections(body);
  const sections = [
    { properties: portraitPage(), children: titlePage() },
    { properties: portraitPage({ start: 1, formatType: D.NumberFormat.LOWER_ROMAN }), ...hf(), children: frontKids },
  ];
  bodySections.forEach((s, i) => {
    if (s.kind === "landscape") sections.push({ properties: landscapePage(), ...hf(), children: s.children });
    else sections.push({ properties: i === 0 ? portraitPage({ start: 1, formatType: D.NumberFormat.DECIMAL }) : portraitPage(), ...hf(), children: s.children });
  });
  // The very first body section must restart numbering at 1 in arabic.
  if (bodySections[0] && bodySections[0].kind === "landscape") throw new Error("body must start with a portrait section");

  const heading = (id, name, size, before, after, extra = {}) => ({
    id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
    run: { font: FONT, size, bold: true, color: INK, ...(extra.run || {}) },
    paragraph: { spacing: { before, after, line: 276 }, keepNext: true, keepLines: true, ...(extra.paragraph || {}) },
  });
  const toc = (id, name, left) => ({ id, name, basedOn: "Normal", next: "Normal", run: { font: FONT, size: 22 }, paragraph: { indent: { left }, spacing: { before: 0, after: 70, line: 264 }, tabStops: [{ type: D.TabStopType.RIGHT, position: TEXT_W, leader: D.LeaderType.DOT }] } });

  const doc = new D.Document({
    creator: studentNames.filter(Boolean).join(", ") || "SkillKart project team",
    title: `${PROJECT_TITLE} — ${PROJECT_SUBTITLE}`,
    subject: "Final Year Project Report (BSCS)",
    description: "Final Year Project Report",
    styles: {
      default: { document: { run: { font: FONT, size: BODY }, paragraph: { spacing: { line: 336, after: 70 } } } },
      characterStyles: [{ id: "Hyperlink", name: "Hyperlink", basedOn: "DefaultParagraphFont", run: { color: "0563C1", underline: { type: D.UnderlineType.SINGLE } } }],
      paragraphStyles: [
        heading("Heading1", "heading 1", 30, 0, 180, { paragraph: { pageBreakBefore: true, outlineLevel: 0, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 6 } } } }),
        heading("Heading2", "heading 2", 24, 220, 100, { paragraph: { outlineLevel: 1 } }),
        heading("Heading3", "heading 3", 22, 160, 80, { paragraph: { outlineLevel: 2 } }),
        { id: "FrontHeading", name: "Front Heading", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: INK }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: 180, after: 240 }, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: NAVY, space: 8 } } } },
        { id: "FigureCaption", name: "Figure Caption", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 19, bold: true, color: INK }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: 40, after: 30, line: 240 }, keepNext: false } },
        { id: "TableCaption", name: "Table Caption", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 19, bold: true, color: INK }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 60, line: 240 }, keepNext: true } },
        { id: "FigureNote", name: "Figure Note", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 17, italics: true, color: "475569" }, paragraph: { alignment: D.AlignmentType.JUSTIFIED, spacing: { before: 0, after: 100, line: 240 }, indent: { left: 360, right: 360 } } },
        { id: "CodeBlock", name: "Code Block", basedOn: "Normal", next: "CodeBlock", run: { font: MONO, size: 16 }, paragraph: { spacing: { before: 0, after: 0, line: 220 }, indent: { left: 200, right: 100 }, shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "F3F6F9" }, border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: NAVY, space: 6 } } } },
        { id: "Quote", name: "Quote", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 20 }, paragraph: { spacing: { before: 60, after: 60, line: 280 }, indent: { left: 360, right: 360 }, shading: { type: D.ShadingType.CLEAR, color: "auto", fill: SOFT }, border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } } } },
        toc("TOC1", "toc 1", 0), toc("TOC2", "toc 2", 360), toc("TOC3", "toc 3", 720),
      ],
    },
    numbering: { config: numberingConfigs },
    sections,
  });

  const buffer = await D.Packer.toBuffer(doc);
  fs.writeFileSync(OUT_FILE, buffer);
  console.log(`wrote ${OUT_FILE} (${(buffer.length / 1048576).toFixed(1)} MB) — ${sections.length} sections, ${orderedCount} ordered lists`);
  console.log(`figures embedded: ${STATS.figuresEmbedded}   screenshot placeholders: ${STATS.figurePlaceholders.length}   tables: ${STATS.tables} (${STATS.captionedTables} captioned)`);
  if (STATS.figurePlaceholders.length) console.log("placeholders:\n  " + STATS.figurePlaceholders.join("\n  "));
}

main().catch((e) => { console.error(e); process.exit(1); });
