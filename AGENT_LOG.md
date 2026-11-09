# Agent log

## 2026-11-09: Campus Atlas implementation and local review

- **Agent:** OpenAI Codex in the Codex desktop app.
- **Asked (original prompt):** “https://canvas.illinois.edu/courses/74173/assignments/1799408 完成这个任务，已经在浏览器打开，使用codex”
- **Plan approval (exact reply):** “按这个方案制作”
- **Approved plan:** An English interactive dashboard with university/city filters, median sale-price comparisons, distance-to-campus analysis, and visible data-cleaning rules.
- **Source instructions read:** `AGENTS.md` and `docs/data_description_sheet.md`, before analysis or implementation. The assignment and its Codex guide were also read in Canvas.
- **Agent produced:** A responsive static website, a reproducible compact-data script, independent validation scripts, methodology text, and this README/log. The original five data files and the GitHub Pages workflow were retained.
- **Data decisions:** The inclusive price interval is $10,000–$5,000,000. Missing values are not zero. Days on market is contract minus list date. Price per square foot requires positive living area. Repeated addresses remain separate records keyed by listing ID. No analysis relies on home type, tax, lot-size, or bathroom anomalies.
- **Checked by Codex:** 60 filter combinations × 6 summary outputs matched independent SQLite calculations; hashes confirmed every original data file was unchanged. Browser checks covered filter combinations, Illinois, no-match states, sorting, pagination, repeated-address units, CSV export, and a 390-pixel mobile layout without page-level horizontal overflow. A downloaded selection was read back and contained exactly the intended 10 distinct listings at 456 E Beaver Ave.
- **An error caught and corrected:** The initial export status said “Downloaded” immediately after preparing the CSV. During browser testing, the operating system was still waiting at a Save dialog. That wording overstated completion. The message was changed to “Prepared” and now tells the reader that the browser may ask where to save the CSV. The test download was then saved and its contents verified.
- **Other correction:** The first attempt to replace the template page used an invalid combined delete/add patch. The editing tool rejected it without changes; the file replacement was then applied correctly.
- **Human review status:** The user approved the concept. At the time of this entry, the local implementation had been checked by Codex; no claim is made that the user reviewed every calculation or line of code.
- **Publication authorization:** The user replied “只发布，暂不提交 Canvas”. This authorizes the public GitHub repository and website publication; Canvas submission is intentionally deferred. Deployment verification will be recorded after publication.

## 2026-11-09: Public release

- **User authorization (exact reply):** “只发布，暂不提交 Canvas”
- **Published:** https://bulitofo.github.io/campus-atlas/
- **Repository:** https://github.com/Bulitofo/campus-atlas — public, generated from the course starter.
- **Change history:** Implementation commit `f86c1e252d79cb745d300a4650da690363a9a2eb`, merged through [pull request #1](https://github.com/Bulitofo/campus-atlas/pull/1). The implementation commit is separate from the template's initial commit.
- **Deployment:** [GitHub Pages workflow run 42566085697](https://github.com/Bulitofo/campus-atlas/actions/runs/42566085697) succeeded. The live URL is displayed in the repository's About section.
- **Public verification:** Unauthenticated HTTP requests returned 200 for the HTML, JavaScript modules, stylesheet and derived JSON, with byte-for-byte matches to the checked local files. The browser loaded the full dataset and reproduced the Illinois filter results, without console errors.
- **Submission status:** Canvas was not submitted, as requested.
