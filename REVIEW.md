# Final publication review — October 30, 2026

## Decision

Ready for static hosting, including GitHub Pages. No server, API key, paid service or database is required to serve the guide. This is a useful original preparation resource; it is not yet an end-to-end validated training course or a guarantee that a learner will pass CKA.

## Changes made during review

- Linked Ahsan Nawaz's portfolio in the site footer, author section, printable HTML and Markdown handbook.
- Replaced the hard-coded Sites canonical URL with a portable relative URL, with absolute metadata generated from SITE_URL when available.
- Added a GitHub Pages Actions workflow that validates and publishes only dist/, supports main/master and skips deployment on pull requests.
- Added .nojekyll and detailed source-based and branch-based publishing instructions.
- Made saved/imported progress robust to duplicate lesson IDs and malformed checklist values; completion status now updates the lesson summary immediately.
- Added repeatable lab ZIP and release ZIP packaging scripts.
- Made printable mock exam approaches visible without first expanding disclosures.
- Made the handbook builder work regardless of the shell's current directory.

## Verification completed

- JavaScript syntax checks for application and curriculum.
- All 14 page rendering functions produce populated content.
- 34 modules have unique IDs, explanations, steps, commands, verification, pitfalls and documentation links.
- Five official domain weights sum to 100%; each original mock totals 100 points.
- Command filtering, search results, progress calculations, mock scoring and timer formatting pass the logic checks.
- Corrupt/duplicate progress normalization regression checks pass.
- Local asset URLs resolve below https://ahsan2000.github.io/cka-open-handbook/.
- The configured-URL build and relative-URL build both pass checks.
- Eleven YAML files parse as 21 Kubernetes documents.
- Workflow YAML parses; build/deploy dependency, permissions and dist artifact path reviewed against GitHub's official instructions.
- Online HTTP review: 57 of 57 unique linked resources returned HTTP 200, including the portfolio URL.
- All four YouTube oEmbed metadata endpoints returned HTTP 200. This confirms metadata availability, not player playback.
- Official FAQ rechecked: 2 hours, 66% passing threshold and Kubernetes v1.37 at review time; domain weights rechecked against CNCF.
- git diff --check passes.

The logic checks use a lightweight document stub, not a real browser DOM. YAML parsing checks syntax and document structure, not Kubernetes admission or runtime behavior. External HTTP success does not verify each page's accuracy or all anchors.

## Remaining verification

1. Browser QA: desktop/mobile layout, keyboard navigation, clipboard permissions, persisted progress, file import/export and actual YouTube playback. Browser access host is unavailable in this session.
2. Live Kubernetes execution: run workload, policy, controller, storage and VM recovery exercises on their documented environments. No live lab cluster was provisioned or modified in this review.
3. GitHub publication: upload or push the prepared source, enable Pages and verify the successful Actions deployment. No GitHub repository has been created or published by this session, and the Actions workflow has not run on GitHub yet.

The existing public Sites deployment can be updated independently; it is not evidence of a GitHub Pages deployment. Recheck live exam policies/version before publishing major content updates or booking the exam.

## Evidence and references

- Local scripts: scripts/check.mjs, scripts/build.mjs, scripts/package-labs.py, scripts/check-links.py.
- Local HTTP report: outputs/link-review.json (local report, not committed or included in source ZIP).
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.linuxfoundation.org/tc-docs/certification/faq-cka-ckad-cks
- https://github.com/cncf/curriculum/tree/master/cka
