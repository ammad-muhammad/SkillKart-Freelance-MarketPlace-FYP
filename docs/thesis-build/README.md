# Thesis build — `FYP_Final_Report.md` → `SkillKart_FYP_Final_Report.docx`

The Markdown report stays the single source of truth for the text. This folder turns it into a
submission-ready Word file: title page, roman-numbered front matter, a real table of contents plus
lists of figures and tables, captioned tables, diagrams, and screenshots of the running application.

```
docs/
├── FYP_Final_Report.md               ← edit the text here
├── SkillKart_FYP_Final_Report.docx   ← generated (open in Word)
├── thesis-figures/                   ← diagrams/*.png (generated), screens/*.png (you add), logo.png
└── thesis-build/                     ← this folder
```

## Quick start — rebuild the Word file

```bash
cd docs/thesis-build
npm install                    # first time only (docx, marked, mermaid)
npm run build                  # writes ../SkillKart_FYP_Final_Report.docx
npm run finalize               # Word fills in the contents / list-of-figures / list-of-tables page numbers
```

`finalize` drives Microsoft Word through COM (Windows + Word required): it opens the file, refreshes
every field and saves. Without it, the contents pages stay empty until you press **Ctrl+A, F9** in Word.
A PDF is **not** produced unless you ask for one: `powershell -File finalize-docx.ps1 -Pdf out.pdf`.

If Word has the report open, the build cannot overwrite it: close it, or write elsewhere with
`THESIS_OUT=../other.docx npm run build` and pass the same path to `finalize-docx.ps1 -Docx`.

## Cover details

`thesis.config.json` holds the university, department, supervisor, head of department, session,
submission date, and the students' names and registration numbers. Anything left empty (currently
`submissionDate`) stays as a **yellow-highlighted placeholder** on the title, certificate and
declaration pages, so nothing can be missed. `font` sets the typeface for body text and headings
(code stays Consolas). Page layout is A4 with 1″ top/bottom and 0.9″ side margins, 11 pt body text
at 1.5 line spacing — see `MARGIN` / `BODY` at the top of `build-docx.cjs`.

## Writing conventions (so no code change is needed to add a figure or table)

| What | How |
|------|-----|
| Figure | `![Figure 9.1 — Title](thesis-figures/diagrams/fig-09-01-architecture.png "optional italic note")` |
| Several images as one figure | Put them in one paragraph: `![Figure 15.4 — Title](a.png)![](b.png)![](c.png)`; they are joined side by side (used for phone screens) |
| Table | A bold line directly above the table: `**Table 7.1 — Title**` |
| Callout | A Markdown blockquote (`> text`) |
| Placeholder | A name such as `*[Supervisor Name]*` is replaced from `thesis.config.json` |

If an image file does not exist yet, a clearly marked **"SCREENSHOT TO BE INSERTED"** frame is drawn in
its place, with the expected file name. Adding the screenshot later and running `npm run build` is all that
is needed. The build prints the list of placeholders that are still empty.

## Diagrams

* Every Mermaid diagram lives in `diagrams/*.mmd` (one file per figure). The layered architecture
  figure is drawn by `render-architecture.cjs` and the use-case figure by `render-usecases.cjs`.
* `npm run diagrams` renders them all to `../thesis-figures/diagrams/*.png` (Playwright's Chromium, from
  `Front-end/node_modules`) and writes `manifest.json`. The build uses the manifest to put a diagram on a
  landscape page only when that makes its text noticeably more legible.
* Figure numbers follow the report's chapter-based scheme (Figure 9.1, 12.7, 17.2 …).

## Screenshots

Screenshots go in `../thesis-figures/screens/` with the file names used in the Markdown (for example
`public-home.png`, `client-my-projects.png`, `admin-dashboard.png`; Chapter 19 lists the headline
screens and Appendix D the rest). Capture them from the running application on the demo dataset
(`npm --prefix Backend run seed:demo`) with a **throw-away or local database**, never real data. Any
width works; screenshots are scaled to the text width and framed automatically.
