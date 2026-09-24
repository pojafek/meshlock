# CLAUDE.md

Context and rules for working on this repository. Read this before making any change.

Note: this repo is public. Do not add personal details, client names, employer names or anything confidential to this file or any other file here.

## What this is

The website for Meshlock, a UK sole trader consultancy in automation and continuous improvement for manufacturing. Live at https://meshlock.co.uk.

Plain static HTML and CSS. No framework, no build step, no package.json. Keep it that way unless explicitly asked.

## File structure

```
index.html                    Homepage (all CSS inline in <style>)
apple-touch-icon.png          180px icon
sitemap.xml                   Sitemap for /, /notes/ and each article
robots.txt                    Allows all, points to sitemap.xml
thanks.html                   Contact form landing page (noindex, not in the sitemap)
assets/
  meshlock-wordmark.svg       Wordmark used in nav and footer
  notes.css                   Shared stylesheet for Field Notes pages
  kamil-pojawa.jpg            Profile photo for "Who's behind this"
  og-image.png                1200×630 link-preview image
notes/
  index.html                  Field Notes list
  doing-it-by-hand.html       First article
```

## How changes go live

- Netlify deploys automatically from the `main` branch.
- Every push or merge to `main` is a production deploy and costs 15 credits. The Netlify account has 300 credits per month, shared with other sites.
- Pull request previews are free and unlimited.

Rules:

1. Never commit directly to `main`.
2. Work on a new branch, then open a pull request. Netlify builds a preview link for the PR.
3. Group related changes into one PR. One merge means one production deploy.
4. In the PR description, list what changed in plain language, so it can be reviewed on a phone.

## Checklist for every page (new or edited)

- `<meta name="color-scheme" content="light">` in `<head>`.
- CSS sets `html{background:var(--paper);}` on `html`, not only on `body`. Without it, iOS Safari in dark mode shows a black background.
- Field Notes pages link `/assets/notes.css`. If that file or the `assets/` folder is missing, those pages lose all styling.
- Nav and footer use the wordmark image, not typed text:
  - nav: `<img src="/assets/meshlock-wordmark.svg" alt="Meshlock" width="178" height="28">` (CSS drops it to 24px high under 640px)
  - footer: `<img src="/assets/meshlock-wordmark.svg" alt="Meshlock" width="127" height="20">`
- Test at mobile width. Nothing should scroll sideways.

## Brand

Design tokens (defined in `:root` in `index.html` and `assets/notes.css`, keep both in sync):

```
--paper:#EEF0EA  --paper-dim:#E3E6DC  --paper-card:#F6F7F2
--ink:#171A1D    --ink-soft:#565C58   --ink-faint:#8A9086
--line:#C9CDC0   --line-strong:#171A1D
--amber:#D9A441  --amber-ink:#5A4419
--green:#3F6B52  --green-bg:#E4EBE3
--steel:#37485A  --red-flag:#B5482E
--radius:3px
```

Logo palette: ink `#171A1D`, paper `#EEF0EA`, bronze `#B98A3A` (used for the magnifier lens).

Fonts (Google Fonts): Space Grotesk for headings, IBM Plex Sans for body, IBM Plex Mono for small labels.

Tagline: "Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three." Short form: `SOFTWARE · LEAN · ERP`.

Visual identity: engineering drawing and inspection language. Grid paper, dimension lines, gears, inspection stamps. Flat colour, no gradients, no drop shadows.

### Logo

- The wordmark is MESHLOCK with a gear and magnifier replacing the letter O. The gear has 8 teeth and the magnifier handle stays inside the gear ring, so it reads as O and not Q.
- The letters are outlined paths. Never retype the wordmark as live text and never edit its geometry or spacing. Use `assets/meshlock-wordmark.svg`.
- The standalone icon (favicon, avatar) is a different, related mark: 10 teeth, handle exiting the gear at 45 degrees. Do not swap one for the other.
- Any new gear graphic on the site should follow the logo's gear style: rounded teeth and a thick ring, not sharp square teeth.
- The hero rig is the logo in motion: a 12-tooth ink gear with a static magnifier meshing with an 8-tooth steel gear. The small gear turns at -12/8 of the big gear's angle so the teeth never overlap. Do not change tooth counts, radii or the ratio without redoing the mesh geometry.
- The "Who's behind this" rig is a 12-tooth ink logo gear with a static magnifier meshing with three 8-tooth steel gears at 110px centre distance (angles 210°, 330°, 90°). Outer gears turn at -12/8 of the centre gear. Do not change tooth counts, radii or positions without redoing the mesh geometry.

## Writing rules

- No em dashes or spaced dashes in any copy. Use a full stop, comma, colon or a middle dot instead.
- British English spelling (behaviour, optimise, colour) in visible copy. CSS property names stay as they are.
- Short sentences. Plain, natural language. Nothing that sounds like marketing boilerplate or AI-generated text.
- Case files and Field Notes stay anonymised: rounded results (hours, percentages, multiples) are allowed; never company names, product names, money amounts from a real client, screenshots or data charts. Describe outcomes in general terms. If a detail feels too specific, cut it rather than soften it.

## Homepage structure

Page order in `index.html`:

1. Nav
2. Hero
3. Sound familiar? (`id="familiar"`): symptom toggles and the live fix list
4. Your ERP stays (dark band)
5. Not another AI wrapper
6. Where I can help (`id="prices"`)
7. How an engagement runs
8. Case files
9. Field notes teaser
10. Who's behind this
11. Questions
12. Contact (`id="contact"`)
13. Footer

The prices in "Where I can help" are the reference price list. Change them only when asked. The "from" prices in the Sound familiar? fix list should stay in line with them.

The contact form is a Netlify Form (`name="contact"`, honeypot `bot-field`). Without JavaScript it posts to `/thanks.html`; with JavaScript it posts with fetch and shows a thank-you line in place. "Book a call" buttons link to `#contact`, not `mailto:`.

All copy stays as real HTML text. JavaScript only adds behaviour, so the page must still read fully with JavaScript off. The FAQ answers are repeated in the `FAQPage` JSON-LD in the head: keep both identical.

## Known open tasks

- Local landing pages (Swindon, Gloucestershire, Oxfordshire)
- More Field Notes articles
