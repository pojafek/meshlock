# CLAUDE.md

Context and rules for working on this repository. Read this before making any change.

Note: this repo is public. Do not add personal details, client names, employer names or anything confidential to this file or any other file here.

## What this is

The website for Meshlock, a UK sole trader consultancy in automation and continuous improvement for manufacturing. Live at https://meshlock.co.uk.

Plain static HTML and CSS. No framework, no build step, no package.json. Keep it that way unless explicitly asked.

## File structure

```
index.html                    Homepage (all CSS inline in <style>)
tools/index.html              Tools in action: ERP intro with stats, five full-width live animations (Full screen button), each with a price line and a link to the offer, more case files
prices/index.html             How a price is set, example prices, how you pay, Always included, FAQ (FAQPage JSON-LD lives here)
apple-touch-icon.png          180px icon
sitemap.xml                   Sitemap for /, /tools/, /prices/, /notes/, each article and each /toolkit/ page
robots.txt                    Allows all, points to sitemap.xml
thanks.html                   Contact form landing page (noindex, not in the sitemap)
start/index.html              One-page offer: tick problems, add rough hours, get an offer with the current cost next to example tool prices (noindex, not in the sitemap)
assets/
  meshlock-wordmark.svg       Wordmark used in nav and footer
  notes.css                   Base stylesheet (tokens, nav, footer, Field Notes title block) for every page except the homepage
  site.css                    Extra styles for /tools/ and /prices/, loaded after notes.css
  kamil-pojawa.jpg            Profile photo for "Who's behind this"
  site.js                     Site behaviour, loaded with defer on every page: keeps the visitor's source tag for the tab, puts it on every link to /start/ (on every host) and switches every page to Patryk's version for `pc` tags. Kept apart from stats.js so an ad blocker never stops it
  stats.js                    Visit counts only (GoatCounter, no cookies), loaded with defer on every page, counts only on meshlock.co.uk. If an ad blocker stops it, counting stops and nothing else
  qrcode.js                   QR code generator (MIT, Kazuhiko Arase), used only by /start/ for the PDF
  og-image.png                1200×630 link-preview image (gear lockup, "Lean, software and ERP. One person."). Pages link it as og-image.png?v=2; bump the number whenever the image changes so LinkedIn fetches the new one
  email/meshlock-signature.png  360×56 wordmark on white for the email signature (shown at 180×28). Linked from Gmail, so never rename or remove it
  anim/                       Case file animations (self-contained HTML, noindex)
    job-travellers.html       Job orders (file name kept so old links work)
    picking-route.html        Picking routes
    dxf-check.html            Cut file check, a digital quality gate
    machine-data.html         Machine data: downtime made visible, 80% to 91%
    batch-export.html         Batch export (Adobe), on /tools/ only
    thumbs/*.webp             960x540 still frames for the tiles
notes/
  index.html                  Field Notes list
  doing-it-by-hand.html       First article (Case story)
  your-machines-already-know.html  Machine data guide (Guide) with the Decode the log puzzle (puzzle CSS and JS inline, example data only) and the cycle time calculator embedded
toolkit/
  cycle-time/index.html       Cycle time calculator on its own page (indexable, in the sitemap). Keeps its inputs in the link after # so a bookmark or home screen icon reopens the same numbers
  cycle-time/manifest.webmanifest  Home screen name and icon for that page
assets/toolkit/
  cycle-calc.js               The cycle time calculator. Renders into every element with data-tool="cycle-time". One file for every page that shows it. Shows the ceiling at 100% and, once the visitor adds a real running % (measured, guessed with a GUESS stamp, or the puzzle's result in the article), the planned numbers. Options on the element: data-hash (keep inputs in the link), data-puzzle (article: offer the puzzle's %, sent by the puzzle as the 'ml:puzzle' event), data-where, data-note, data-offer-tag (see the top of the file). Nothing typed is ever sent
  cycle-calc.css              Its styles (same look as the puzzle), linked in <head> next to the script
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
- Every page has three pieces, all the same on every page:
  - Right after `<meta charset="UTF-8">`, the Patryk snippet below. For `pc` visitors it hides every `data-pc` line and every `data-pc-hide` element before first paint; `assets/site.js` swaps them and reveals the page (fallback: window load). Without it, Kamil's lines flash before the swap.
  - `<script src="/assets/site.js" defer></script>` (all tag and Patryk logic lives here, never in the page or in stats.js)
  - `<script src="/assets/stats.js" defer></script>` (counting only)
  ```html
  <script>/* Patryk's visitors (pc tag): hide Kamil's lines until assets/site.js swaps them. Keep at the top of <head> on every page. */(function(){try{var t=(new URLSearchParams(location.search).get('s')||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20)||sessionStorage.getItem('ml-src')||'';if(!/^pc/.test(t))return;var h=document.documentElement,c=document.createElement('style');h.classList.add('pc','pc-wait');c.textContent='html.pc [data-pc-hide]{display:none!important}html.pc-wait [data-pc]{visibility:hidden!important}';document.head.appendChild(c);addEventListener('load',function(){h.classList.remove('pc-wait');});}catch(e){}})();</script>
  ```
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
The main line is Kamil's only. For Patryk's visitors (`pc` tags) the hero lockup and every footer show "Automation & continuous improvement for manufacturers." instead (`data-pc`).
Longer line, used as the About heading where there is room to explain the name: "Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three." Short form: `SOFTWARE · LEAN · ERP`.

Three layers, kept apart:
- Values: how we think and decide. Internal only, never on the site or print: respect what isn't ours, fit the work not a template, say the price and keep it, leave clients stronger not dependent, look closer, here for the long run.
- Our promise: what every client always gets. Public, same words, order and icons everywhere (site, cards, flyers, sheets), always labelled "Our promise", never "values": Your ERP stays (database in a dashed ring) · Bespoke build (caliper) · Fixed price (price tag with £) · You own it (key). One line each: "We work around it. Never inside it." / "Made for your process. Not bent to fit it." / "Agreed in writing before we start." / "The tool and its documentation stay with you." Icons are line drawings with round caps, each in a box with corner marks, one accent detail (amber on ink, green on paper). Place the promise band at the end of a page, not under the hero, because the hero already says "Your ERP stays". It appears on the homepage (before Contact), /prices/ and /tools/ (both just before the closing call band). Homepage styles are inline in `index.html`; the subpages use the same rules in `assets/site.css`. Keep both in sync.
- Offer: what we give now, to start. "Your first tool is paid for only when it works as agreed." Sales materials and the offer page only, never presented as a promise, because it covers the first tool only.

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
- Every animation runs before and after: the job by hand (a drawn hand, a clock or counter), then the same job with the tool, then the result and the gear sting. Each works at 16:9 and 9:16.
- Never write "despatch" or the old tool names in copy. Use "job orders" (not job travellers) and "picking routes". The cut time model stays out of public copy.
- The homepage shows four tiles (job orders, picking routes, cut file check, machine data). Batch export lives on /tools/ only.

## One-page offer (/start/)

- Answers live only in the link after `#` (`#f=key.hours,...&rate=..&erp=..&own=..&d=YYYYMMDD&p=price.price...`). Nothing is stored on the site until the visitor presses Send, which posts the Netlify Form `name="offer"` (or `offer-pc` for Patryk's tags, see below).
- A saved offer never changes. When step 3 first shows, the page stamps the date (`d`) and freezes the tool prices of that day (`p`, one per key in `f`, same order). A link or PDF with `d` and `p` always shows the same answers, cost and prices, even after /prices/ changes, with a "Your saved offer from …" note above the sheet. Changing any answer (ticks, hours, rate, system) makes a new offer with today's prices. Never remove this, and if the cost maths (`HRS`, `WEEKS`, `CAP`) ever changes, keep the old values for links dated before the change.
- Copy link, the form's `link` field and the PDF always carry the source tag (`?s=`). The printed PDF ends with "Open this offer again": a QR code (`assets/qrcode.js`, MIT, vendored) and a clickable link with `pdf=1` added (without it, print to PDF turns a link to the same page into an internal link).
- Step 1 and the homepage Sound familiar? show the same nine problem families, a short title plus one grey line of examples, never a description of a finished tool. The offer then shows what was done before as proof.
- Family keys: `sort`, `pick`, `wrong`, `reports`, `machines`, `export`, `custom`, `guess`, `unsure`. They must match the homepage `data-fix` keys and must never be renamed, or old links break. Older keys still work through `ALIAS`: `courier` opens `sort`, `personal` and `setup` open `export`.
- Step 2 asks each family its own question (`q` in `FIX`). Time problems ask hours a week; reports also allow "None. We just don't have them". Machines are a visibility problem: the question is how many machines, and they never add to the red cost. The offer lists them as "not in hours".
- Tool prices come from the examples on /prices/. Keep them in line. Problems without an example show "priced after the call".
- The current cost is the visitor's own cost, shown in red-flag. The tool price sits beside it in green, so the two are never confused.
- Save as PDF and Copy link sit only inside "Not yet · pass it on", for someone who has to show the offer to whoever decides. After sending, the thank-you screen offers one "Save as PDF" link. Save as PDF uses the browser's print dialog (print CSS lays out the offer as one page). With "Not yet" picked there is no send button, only a note in the bar; the privacy line shows only for Call me back and Email me back.
- The form sends a full clickable link to the offer (field `link`) and the offer as the client saw it (field `shown`: cost now, where to start with its example price and weeks to cover it, and every other item). If submissions land in spam, mark them verified in Netlify.
- Printed QR codes open `/start/?s=<source>` (`kp` Kamil's card, `kps` Kamil's one-pager, `kpf` Kamil's A5 flyer, `pc` Patryk's card, `pcs` Patryk's sell sheet, `pcf` Patryk's A5 flyer). The tag is kept for the browser tab in `sessionStorage` (`ml-src`), so it survives a detour through the site. Both the offer and the homepage contact form send it in a hidden `source` field, `site` when there is none. The hidden `subject` field sets the notification email subject: "Meshlock offer · <source> · Call me back|Email me back". Never rename a tag already printed.
- Digital Field Notes tags also open `/start/?s=<source>`: `fn-data` (machine data article closing links), `fn-data-puzzle` (side window after the puzzle), `fn-data-pdf` (printed checklist). Toolkit pages tag their closing offer link the same way with `tk-<name>`: `tk-cycle` (/toolkit/cycle-time/). Same rule: never rename one once published.
- The visitor's stored tag beats a tag written in a page link. `assets/site.js` saves any `?s=` tag to `ml-src` (same cleaning: lower case, a to z, 0 to 9 and hyphen, 20 characters max) on every host, previews and local tests included. Counting (`assets/stats.js`) is live-only and separate, so blocking it changes nothing else. After DOMContentLoaded it sets `s=` on every link to `/start/` (relative or `https://meshlock.co.uk/start/`) to the stored tag, and again on click for links a page changes later. A tag written in the page (like `fn-data`) is only the fallback when nothing is stored. Everything after `#` is left alone. No page needs its own code for this. /start/ and the homepage contact form read the tag as before: URL first, then the stored tag.
- Tags for shared links (messages, posts) follow person-channel-content, 20 characters max, all lower case: `kp-` for Kamil, `pc-` for Patryk (so the offer speaks for him), then the channel (`mail`, `li` for LinkedIn), then the content (`data` for the machine data article). Examples: `pc-mail-data`, `pc-li-data`, `kp-li-data`, `kp-mail-data`. Never rename a tag once shared.
- Counting (assets/stats.js, dashboard meshlock.goatcounter.com): every page opened with `?s=` counts `in/<tag>/<page>`. The offer counts steps as events, each with the tag: `offer/open`, `offer/result` (step 3 first shown), `offer/problem/<key>`, `offer/not-yet`, `offer/pdf`, `offer/copy-link`, `offer/reopen` (`/pdf` when opened from a PDF), `offer/sent-call`, `offer/sent-mail`. Only step names and tags are sent, never answers, hours, prices or anything after `#`. Every new page links `/assets/site.js` and `/assets/stats.js`, both with `defer`, in `<head>`.
- Tags starting with `pc` belong to Patryk Chojnacki (Business Development Lead). With such a tag the offer speaks for him: his name and phone in the sheet footer and PDF, "Send to Patryk", "Patryk rings you", "Where to start", "This is not our price", and no first person. Static lines carry the alternative in `data-pc`, script lines use `V(kamil, patryk)`. His contact email is patryk@meshlock.co.uk (Cloudflare Email Routing to his own mailbox). With a `pc` tag the offer posts to a second Netlify form, `offer-pc` (same fields, a hidden copy in the HTML so Netlify registers it), whose email notification goes to Patryk; all other tags post to `offer`. Keep both forms' fields identical. Kamil's name never shows to his clients. Any new line in first person needs its Patryk version.
- With a pc tag the whole site speaks for Patryk; any new first-person line on any page needs its data-pc version; any new contact point needs its Patryk version. `assets/site.js` switches every page when the stored tag starts with `pc`, so it holds after any detour. Attributes: `data-pc` (text, in Meshlock's voice: "Meshlock builds", "we", never "I"; `{tag}` becomes the visitor's tag), `data-pc-href`, `data-pc-copy` (Copy button), `data-pc-value` (form fields), `data-pc-hide`, `data-pc-show` (element starts `hidden`; give it class `pc-only` if its class sets `display`). Put `data-pc` on the smallest element that holds only first-person text, wrapping a sentence in a `<span>` when the rest of the paragraph has links or markup. In Patryk's version: contact details are "Patryk Chojnacki · Business Development Lead", 07501 839466, patryk@meshlock.co.uk (contact section, Copy button, error message, every footer), no LinkedIn link anywhere, "Who's behind this" is hidden and About links go to `/#promise` (`data-pc-goto` on the hidden section handles an opened `/#about`). The homepage contact form posts as `contact-pc` (hidden copy of the form in `index.html`, same fields as `contact`; keep both identical), source field unchanged. With JavaScript off every page shows Kamil's version. The FAQPage JSON-LD on /prices/ keeps the default text.

## Field Notes

Every Field Note is one of two types, and says so in the same places:
- **Guide** (`Practical guide`): how to do something yourself, with a takeaway (checklist, puzzle, template).
- **Case story** (`Case story`): one fix from the floor, told without names.

Under the title, in place of a date line, every article has a title block styled like the one in the corner of an engineering drawing (`.title-block` in `assets/notes.css`: 1.5px ink border, thin ink cell rules, IBM Plex Mono labels in ink-soft, values in the body font). Cells, in this order: TYPE · TIME · YOU'LL LEARN · YOU GET. Items inside a cell are separated by a middle dot. A small dashed green stamp cell is optional (`has-stamp` on the block, then `<div class="tb-cell tb-stamp"><span>NO IT NEEDED</span></div>` after TIME). Copy the block from an existing article. Keep its text free of first person, so it needs no `data-pc` version.

Every Field Note carries one small practical tool tied to its topic, living in /toolkit/<name>/ and embedded in the article from the same file; built from scratch, no data from any employer. The tool is a component in `assets/toolkit/<name>.js` and `.css` that renders into `data-tool="<name>"`, so the article and the toolkit page never hold copies. Inside the article it sits under its own `h2`, followed by a small "Open it on its own page →" link, and the title block's YOU GET names it. The toolkit page has the head snippet, `site.js`, `stats.js`, breadcrumb "Meshlock / Toolkit", one short intro, the tool, a link back to the article and the usual way forward (Book a free call, one-page offer with the fallback tag `tk-<name>`, used only when no tag is stored). With JavaScript off the element shows one `<noscript>` line saying the tool needs JavaScript. Tool copy has no first person and never names a specific machine type (say cutting, printing or moulding, or just "machine").

On /notes/ each row shows, above its title, a type chip (`.note-type`: GUIDE or CASE STORY, dashed green tag) and a short mono line (`.note-len`, e.g. `8 min + puzzle · checklist · calculator` or `4 min`). Newest first.

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
7. Our promise (`id="promise"`): dark band, the four promises with icons
8. Contact (`id="contact"`)
9. Footer

Nav on every page: Tools in action · Prices · About (/#about) · Field notes, plus Book a call. Under 640px the links show short labels (`.nl-short`): Tools · Prices · About · Notes.

Subpages open with a breadcrumb label (`.crumbs`: "Meshlock / Page") whose first part links home. Every subpage ends with a way forward: Book a free call and the one-page offer (/start/). The footer on every page links the offer.

Pricing works by method, not a price list: each quote is based on the work involved and how complex it is, as one fixed price in writing. The site never shows a day rate or hourly rate. The example prices on /prices/ are the reference. Change them only when asked. Each case file on /tools/ shows the matching example price ("A tool like this: about £…"), so keep the two in line. The Sound familiar? fix list shows no prices, only one line under the list linking to /prices/.

The contact form is a Netlify Form (`name="contact"`, honeypot `bot-field`; `contact-pc` for Patryk's visitors, see One-page offer). Without JavaScript it posts to `/thanks.html`; with JavaScript it posts with fetch and shows a thank-you line in place. "Book a call" buttons link to `#contact`, not `mailto:`.

All copy stays as real HTML text. JavaScript only adds behaviour, so the page must still read fully with JavaScript off. The FAQ on /prices/ is repeated in that page's `FAQPage` JSON-LD: keep both identical.

## Known open tasks

- Local landing pages (Swindon, Gloucestershire, Oxfordshire)
- More Field Notes articles
