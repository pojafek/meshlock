# CLAUDE.md

Context and rules for working on this repository. Read this before making any change.

Note: this repo is public. Do not add personal details, client names, employer names or anything confidential to this file or any other file here.

## What this is

The website for Meshlock, a UK sole trader consultancy in automation and continuous improvement for manufacturing. Live at https://meshlock.co.uk.

Plain static HTML and CSS. No framework, no build step, no package.json. Keep it that way unless explicitly asked.

## File structure

```
index.html                    Homepage (all CSS inline in <style>)
tools/index.html              Tools in action: ERP intro with stats, four full-width live animations (Full screen button), more case files
prices/index.html             Price list, Always included, FAQ (FAQPage JSON-LD lives here)
apple-touch-icon.png          180px icon
sitemap.xml                   Sitemap for /, /notes/ and each article
robots.txt                    Allows all, points to sitemap.xml
thanks.html                   Contact form landing page (noindex, not in the sitemap)
assets/
  meshlock-wordmark.svg       Wordmark used in nav and footer
  notes.css                   Base stylesheet (tokens, nav, footer) for every page except the homepage
  site.css                    Extra styles for /tools/ and /prices/, loaded after notes.css
  kamil-pojawa.jpg            Profile photo for "Who's behind this"
  og-image.png                1200×630 link-preview image (gear lockup, "Lean, software and ERP. One person."). Pages link it as og-image.png?v=2; bump the number whenever the image changes so LinkedIn fetches the new one
  email/meshlock-signature.png  360×56 wordmark on white for the email signature (shown at 180×28). Linked from Gmail, so never rename or remove it
  anim/                       Case file animations (self-contained HTML, noindex)
    picking-route.html        Smarter picking
    dxf-check.html            Pre-production quality gate
    job-travellers.html       Job traveller tool (ERP band)
    machine-data.html         Machine run data and cut time model
    thumbs/*.webp             960x540 still frames for the homepage tiles
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

Main line: "Lean, software and ERP. One person." Used under the wordmark in the hero lockup, in the footer and in link previews.
Longer line, used as the About heading where there is room to explain the name: "Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three." Short form: `SOFTWARE · LEAN · ERP`.

Visual identity: engineering drawing and inspection language. Grid paper, dimension lines, gears, inspection stamps. Flat colour, no gradients, no drop shadows.

### Logo

- The wordmark is MESHLOCK with a gear and magnifier replacing the letter O. The gear has 8 teeth and the magnifier handle stays inside the gear ring, so it reads as O and not Q.
- The letters are outlined paths. Never retype the wordmark as live text and never edit its geometry or spacing. Use `assets/meshlock-wordmark.svg`.
- The standalone icon (favicon, avatar) is a different, related mark: 10 teeth, handle exiting the gear at 45 degrees. Do not swap one for the other.
- Any new gear graphic on the site should follow the logo's gear style: rounded teeth and a thick ring, not sharp square teeth.
- The hero lockup is the logo in motion: the same 12-tooth ink gear and three 8-tooth steel gears as the About rig, already meshed, labelled LEAN, SOFTWARE and ERP, turning slowly (centre 24s, outer 16s, so the 12:8 ratio holds). It stops with reduced motion. The About rig tells the story (three specialists come together); the hero shows the result. Keep both.
- The "Who's behind this" rig is a 12-tooth ink logo gear with a static magnifier meshing with three 8-tooth steel gears at 110px centre distance (angles 210°, 330°, 90°). Outer gears turn at -12/8 of the centre gear. Do not change tooth counts, radii or positions without redoing the mesh geometry.

## Case file animations

- Each file in `assets/anim/` is one self-contained page: inline SVG and script, fonts from Google Fonts, no other requests. Keep them `noindex` and out of the sitemap.
- The homepage opens them in the `#anim-dialog` viewer from any `a.watch` link, adding `?embed=1&v=0|1` (v=1 is the portrait layout for phones). Without JavaScript the link opens the page itself.
- Inside a page, all motion comes from one `render(t)` function. With reduced motion the page shows one still frame of the result.
- On-screen parts, orders, machine names and times are illustrative and say so in the footer line. Results shown must match the case file text.
- Say "machine", never the specific machine type, in site copy and animations. Specific process words make the source easy to guess.

## Writing rules

- No em dashes or spaced dashes in any copy. Use a full stop, comma, colon or a middle dot instead.
- British English spelling (behaviour, optimise, colour) in visible copy. CSS property names stay as they are.
- Short sentences. Plain, natural language. Nothing that sounds like marketing boilerplate or AI-generated text.
- Case files and Field Notes stay anonymised: rounded results (hours, percentages, multiples) are allowed; never company names, product names, money amounts from a real client, screenshots or data charts. Describe outcomes in general terms. If a detail feels too specific, cut it rather than soften it.

## Homepage structure

Keep the homepage short. Detail lives on its own page.

Page order in `index.html`:

1. Nav
2. Hero: H1 "Your ERP stays. I build what it can't do.", one benefit sentence, Book a free call + Watch four fixes run; on the right the full lockup (gears, wordmark, main line). On phones the lockup comes first
3. Sound familiar? (`id="familiar"`): symptom toggles and the live fix list
4. Tools in action strip (`id="tools"`): four tiles that open the animation viewer, link to /tools/
5. How an engagement runs
6. Who's behind this (`id="about"`)
7. Contact (`id="contact"`)
8. Footer

Nav on every page: Tools in action · Prices · About (/#about) · Field notes, plus Book a call. Under 640px the links show short labels (`.nl-short`): Tools · Prices · About · Notes.

The prices on /prices/ are the reference price list. Change them only when asked. The "from" prices in the Sound familiar? fix list should stay in line with them.

The contact form is a Netlify Form (`name="contact"`, honeypot `bot-field`). Without JavaScript it posts to `/thanks.html`; with JavaScript it posts with fetch and shows a thank-you line in place. "Book a call" buttons link to `#contact`, not `mailto:`.

All copy stays as real HTML text. JavaScript only adds behaviour, so the page must still read fully with JavaScript off. The FAQ on /prices/ is repeated in that page's `FAQPage` JSON-LD: keep both identical.

## Known open tasks

- Local landing pages (Swindon, Gloucestershire, Oxfordshire)
- More Field Notes articles
