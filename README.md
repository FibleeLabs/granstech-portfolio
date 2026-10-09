# granstech.com

Official website of GransTech (formerly Anugraha Castings). Plain static HTML/CSS/JS, so it runs on any web host with no server code or database.

## Structure

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | Page content (front matter: title, description, URL path) |
| `src/layout.html`, `src/partials/` | Shared `<head>`, header, footer, CTA band and SVG icons |
| `index.html`, `about-us/`, `facility/`, ... | **Generated** pages, do not edit by hand |
| `assets/css/site.css`, `assets/js/site.js` | Styles and behaviour (nav, lightbox, forms) |
| `assets/js/org-chart.js` + `org-source.js` | Organisation chart, read live from the Google Sheet |
| `assets/img/` | Web-optimised images (**generated** from `images/`) |
| `images/` | Original photos and deck slides (not published, blocked in `.htaccess`) |

Page URLs match the previous WordPress site (`/about-us/`, `/products/`, `/certifications/`, `/facility/`, `/career/`, `/contact/`, ...) so existing search rankings carry over. Old WordPress sub-URLs are 301-redirected in `.htaccess`.

## Editing

```bash
node tools/build.mjs            # rebuild all pages + sitemap.xml after editing src/
python tools/optimize_images.py # only after adding/replacing photos in images/
```

## Forms

The quote and careers forms open the visitor's email app pre-filled until a form service is connected. To receive submissions directly, create a free endpoint (e.g. Web3Forms or Formspree) and set `FORM_ENDPOINT` (and `FORM_ACCESS_KEY` for Web3Forms) at the top of `assets/js/site.js`.

## Organisation chart

Edit the Google Sheet linked in `org-source.js`. Rows with "Name Placeholder" or "Years of Exp" show the role only. For photos, put a public image URL or a Google Drive share link in `Photo_URL` (or add files under `assets/img/team/` and use `assets/img/team/name.jpg`).

## Deploying

Upload everything except `src/`, `tools/`, `images/` and `.claude/`. The site expects to be served from the domain root (`https://granstech.com/`). After launch, submit `https://granstech.com/sitemap.xml` in Google Search Console.
