# Publish on GitHub Pages

This is a static HTML/CSS/JavaScript website. GitHub Pages can host it without a server, database or API key. All local asset URLs are relative and section navigation uses hashes, so it works below a project path.

## Recommended: source repository + GitHub Actions

1. Create a **public** repository on your GitHub account, for example `cka-open-handbook`.
2. Put the **contents of this project directory** in the repository root. The root should contain `.github/`, `dist/`, `labs/`, `scripts/` and `README.md`. Do not put the entire project inside a second `cka-open-handbook/` directory.
3. Push the source on `main` (or `master`). Include the hidden `.github/workflows/pages.yml` file. The prepared source ZIP includes it.
4. Open the repository’s **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
5. Open **Actions → Validate and deploy CKA handbook → Run workflow** if the initial push ran before Pages was enabled.
6. Wait for the build and deploy jobs to succeed. The deployment environment displays the actual public URL.

For account `ahsan2000` and repository `cka-open-handbook`, the expected URL is:

`https://ahsan2000.github.io/cka-open-handbook/`

That is an expected URL only; this project has not yet been published to that GitHub repository by this session. Use the URL returned by the successful Actions deployment.

The workflow regenerates the printable handbook and lab ZIP, validates JavaScript and application behavior, then uploads **only `dist/`** to Pages. It sets canonical metadata from GitHub’s actual Pages base URL. No secrets or personal access token are needed. Pull requests run checks without deploying. It supports `main` and `master`; change the workflow branch filters if your default branch has a different name.

Do not select “Deploy from a branch” with `/dist`: GitHub’s branch publishing picker supports only repository root or `/docs`. Use the supplied Actions workflow for this source layout.

## Alternative: upload the ready-made static files

If you want the same simple branch-based setup as a static portfolio:

1. Unzip `github-pages-static.zip` and upload **its contents**, including `index.html`, directly to a new repository’s root.
2. In **Settings → Pages**, choose **Deploy from a branch**, select `main`, and choose **/(root)**.
3. Save and wait for GitHub’s deployment.

That ZIP contains only website assets and a `.nojekyll` file. It does not include the source workflow. Future changes must be copied into that root again. The relative canonical URL works at the deployed directory; when building source manually, set `SITE_URL` to the final root URL for an absolute canonical link.

## Verify after publication

- Open the deployed site, refresh a section such as `#storage/pv-pvc`, and confirm it opens correctly.
- Check the mobile menu and text at a narrow viewport.
- Open a lesson video and test actual playback (not merely an iframe being present).
- Test search, copy code, progress persistence, export/import and the mock timer.
- Open `handbook.html` and download `labs.zip`.
- Click Ahsan Nawaz’s portfolio link in the footer.

Code/structure checks passed locally. Browser preview was unavailable in this session, and Kubernetes labs have not been executed against a live cluster. This verification still matters before presenting the guide as fully tested.

Official references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
