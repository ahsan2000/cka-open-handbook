# CKA Open Handbook

An original, free static CKA preparation website by [Ahsan Nawaz](https://ahsan2000.github.io/portfolio).

- 34 modules across prerequisites and all five official exam domains
- Concepts, guided exercises, commands, verification criteria and pitfalls
- Embedded free videos, dated source links and official documentation per module
- Browser-local progress, export/import, search, filters and light/dark appearance
- Six-week study plan and two original weighted, timed mock exams
- Printable HTML, Markdown handbook and downloadable YAML practice pack

## Publish on GitHub Pages

Ready to host on GitHub Pages. Follow [GITHUB-PAGES.md](GITHUB-PAGES.md) for the included automatic deployment workflow or the simple static-files option. A GitHub repository has not been created or published by this session.

## Run locally

No npm install or framework build is required.

    python3 -m http.server 8080 --directory dist

Open http://localhost:8080. Serve over HTTPS on a public host for clipboard access. All study content is static and can be hosted on GitHub Pages, Cloudflare Pages, Netlify or another static server. Videos and optional Google Fonts require internet access; system fonts provide a fallback. Study progress stays in the visitor's browser and can be exported. No application backend or account system is included.

## Edit

- `dist/content.js`: curriculum, reference data, video metadata and mocks
- `dist/app.js`: client behavior and page rendering
- `dist/style.css`: responsive design
- `labs/`: original standalone manifests and their environment prerequisites
- `scripts/build.mjs`: regenerate printable HTML and `HANDBOOK.md`

After content edits:

    node scripts/build.mjs
    python3 scripts/package-labs.py
    node --check dist/content.js
    node --check dist/app.js
    node scripts/check.mjs

The packager regenerates `dist/labs.zip` from `labs/`. Set `SITE_URL` when building for a known public URL; otherwise canonical metadata remains relative for host portability. GitHub Actions sets it automatically. Never put credentials in source files.

## Accuracy and limits

Research reviewed October 30, 2026. The live official LF FAQ lists Kubernetes v1.37 at that review time. Recheck before booking; exam versions and policies change. Original mocks use the official domain split but are not recalled exam questions or an official score predictor. Finishing this guide cannot guarantee a pass. The official certification exam is paid.

Commands intentionally include templates, fragments and environment-dependent procedures, all marked in the lessons. Review before running. NetworkPolicy requires an enforcing CNI; Gateway/Ingress require controllers; HPA needs metrics; storage features require supporting drivers; host-level recovery needs disposable VMs. No Kubernetes cluster was created automatically by this website.

## License

Code: MIT. Original teaching content and exercises: CC BY 4.0. External videos, documentation and marks retain their owners' rights. See LICENSE and ATTRIBUTION.md.

## Release packages

    python3 scripts/package-release.py

Creates `outputs/github-source.zip` (complete portable source including the hidden GitHub Actions workflow) and `outputs/github-pages-static.zip` (website files at archive root for simple branch publishing). The source ZIP omits Git history, local reports and Sites hosting identity.

Optional online resource review (requires network access):

    node scripts/collect-links.mjs
    python3 scripts/check-links.py

This checks HTTP responses and YouTube metadata, not actual player playback or documentation accuracy. See [REVIEW.md](REVIEW.md) for the final review evidence and remaining checks.
