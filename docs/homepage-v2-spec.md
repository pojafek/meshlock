# Homepage v2: implementation spec

Read `CLAUDE.md` first and follow it. This file is the complete, approved spec for this PR. Implement all of it on this branch, in this PR. When everything is done, delete this file (`docs/homepage-v2-spec.md`) in the last commit.

## Ground rules

- **Reuse the existing site.** Same `:root` tokens, `.wrap` container, fonts, hero grid background, button styles, spacing and section rhythm. New sections must look like they were always part of the page. Do not redesign the hero or the existing gear rig.
- **All copy is real HTML text in the markup.** JavaScript only adds behaviour (toggles, animation triggers). With JavaScript off, every symptom, fix, price, question and answer must still be readable. This matters for SEO.
- **Mobile first.** Check every section at 390px. Nothing scrolls sideways. Multi-column layouts stack.
- Copy below is final. Use it exactly. British English. No em dashes anywhere.
- Animations: respect `prefers-reduced-motion` (show the final state, no motion). Trigger section animations with IntersectionObserver when the section scrolls into view, once.

## Files added in this PR (already on the branch)

- `assets/kamil-pojawa.jpg`: profile photo for "Who's behind this"
- `assets/og-image.png`: 1200×630 link-preview image

## Page order

1. Nav
2. Hero
3. Sound familiar? (new, `id="familiar"`)
4. Your ERP stays (new, dark band)
5. Not another AI wrapper (replaces the "What this actually is" section, which is removed)
6. Where I can help (new, `id="prices"`)
7. How an engagement runs (existing, copy updated)
8. Case files (existing, two cards added)
9. Field notes (new teaser)
10. Who's behind this (rebuilt)
11. Questions (new)
12. Contact (existing, "What happens next" added)
13. Footer

---

## 1. Nav

- Wordmark image height: **28px** on desktop, **24px** under 640px. Update `width`/`height` attributes to match the aspect ratio (about 6.37:1).
- Next to the wordmark, a small mono label: `SOFTWARE · LEAN · ERP` (IBM Plex Mono, 11px, letter-spacing .14em, `--ink-soft`). Hide it under 640px.
- Links: `Field notes →` (existing), `Prices` (to `#prices`), `Book a call` (existing).
- Apply the same wordmark size and nav changes on the Field Notes pages (`assets/notes.css` and both notes pages).

## 2. Hero

- Eyebrow: `AUTOMATION & CONTINUOUS IMPROVEMENT · FOR MANUFACTURERS`
- H1: unchanged ("Built to fit. Not sold as a subscription.")
- Lede: Your ERP holds the data. I build the tools that make it work on the floor: sorting, checks, reports and dashboards, built around the system you already have.
- Buttons: `Book a free call` (existing) and `See what I fix ↓` (to `#familiar`, replaces "See the work").

## 3. Sound familiar? (`id="familiar"`)

Label: `DIAGNOSIS, THE SHORT VERSION`
H2: Sound familiar?
Intro: Tick what happens on your floor. You'll see what usually fixes it, and roughly what it costs.

Layout: desktop two columns. Left: a 2-column grid of symptom toggles, then one full-width "unsure" toggle, then a callout box. Right: the "Your fix list" panel. Under 820px everything stacks; the panel comes after the callout, and while the section is on screen show a compact sticky bar at the bottom of the viewport: `[n] FIXES FOUND · SEE LIST ↓`, linking to the panel. Hide the bar when nothing is ticked.

Each toggle is a real `<button type="button" aria-pressed>` with a square checkbox mark. Unticked: `--paper-card` background, 1.5px `--line` border. Ticked: `--green-bg` background, 1.5px `--green` border, filled green checkbox with a white tick. Min height about 104px desktop.

Symptoms, with the fix each one adds to the panel (fix · result · price). Pre-tick `sort` and `wrong` on load.

| id | Symptom (button text) | Fix | Result | Price |
|---|---|---|---|---|
| sort | Your ERP prints the paperwork. Then someone spends an hour sorting it by hand. | Paperwork sorted into picking order | Up to 12 hours a week saved at peak | from £1,000 |
| split | Orders with several job sheets get split up, and someone has to hunt for the rest. | Separator pages and multi-part flags | Every order stays together on the shelf | from £1,000 |
| courier | Despatch checks order numbers one by one to work out which courier it goes with. | Courier stamped on every sheet | Product-to-slip matching up to 5× faster | from £1,000 |
| wrong | Nobody knows the wrong file was loaded until the part is already made. | Quality gate and part preview on the sheet | The operator sees what it should look like | from £1,500 |
| custom | Custom orders stall while someone emails back and forth for the missing details. | Automatic request to customer service | The answer goes straight back onto the sheet | from £1,500 |
| reports | The data is all in the system, but the reports are too basic to run the floor on. | Automated reports and live dashboards | One current view, nobody compiling it by hand | from £750 |
| setup | Setting up a new product range takes hours of manual prep before anything runs. | Standardised machine files with built-in checks | Prep time down 93% in one project | from £1,500 |
| guess | Job times and quotes are based on gut feel and old averages. | Calculators and estimates from your own data | From a simple job-time or packaging calculator to a model built on your production history | from £750 |
| export | Artwork files get opened and exported to PDF one at a time. | Batch export in Adobe, folder by folder | A whole queue of files done in one click, with an error summary | from £500 |
| personal | Personalised or multi-up print files are built by hand, one order at a time. | Adobe layout automation with built-in checks | Print-ready files generated from order data, checked before export | from £2,500 |

Unsure toggle (full width, dashed `--ink-faint` border, transparent background when unticked): None of these, but something on the floor still feels slower than it should.
Its fix: **A fresh pair of eyes on your process** · A free 30-minute call, or a one-day review that finds the losses nobody sees any more · free / £600

Panel (`--paper-card`, 1px `--line` border):
- Header (mono, 12px): `YOUR FIX LIST · 2 MATCHES` (singular `1 MATCH`, updates live)
- Empty state: Tick a problem on the left to see how it's usually fixed.
- Render **all 11 fix rows in the HTML**; JavaScript shows only the ticked ones (no-JS: show all). Each row: fix name (Space Grotesk 600, 16.5px), result (14px, `--ink-soft`), price right-aligned (mono 13px, `--amber-ink`). New rows fade and slide in (.35s).
- Under the rows, right-aligned: a dashed green stamp `PASS · FIX FOUND` (mono 11.5px, rotated -7deg, pops in with a small overshoot when the first row appears).
- Then the button: `TALK IT THROUGH · FREE 30 MIN` to `#contact`.

Callout (below the unsure toggle):
- Label: `MOST PROBLEMS DON'T LOOK LIKE PROBLEMS`
- Text: Most of what I've fixed wasn't on anyone's list. It had been done the same way for years, so nobody saw it as a problem any more. If nothing above jumps out, that's normal. Spotting it is my job.
- Link: `READ: DOING IT BY HAND FOR YEARS, UNTIL SOMEONE DECIDED NOT TO →` to `/notes/doing-it-by-hand.html`

## 4. Your ERP stays (dark band)

Full-width `--ink` background, text `--paper`. Content in `.wrap`.

- Label (amber): `AROUND YOUR ERP`
- H2: Your ERP stays. I build what it can't do.
- Text: Works orders came off the ERP unsorted, with no carrier details and no picture of the part. Small tools built around it now put despatch paperwork in exact picking order, keep multi-sheet orders together, stamp the right courier and print a preview of the correct part on every sheet. The ERP provider's own consultants couldn't match it.
- Diagram: use this SVG as given (make it `width:100%; height:auto`; on narrow screens let it scroll inside an `overflow-x:auto` wrapper at a minimum width of 720px):

```html
<svg viewBox="0 0 1120 320" width="1120" height="320" role="img" aria-label="Your ERP exports reports to a small tool, which turns them into sorted, stamped works orders">
<rect x="20" y="100" width="210" height="120" rx="3" fill="none" stroke="#EEF0EA" stroke-width="1.5"></rect>
<text x="125" y="146" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="#D9A441">YOUR ERP</text>
<text x="125" y="173" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="15" fill="#EEF0EA">Sage · Epicor · others</text>
<text x="125" y="198" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="13" fill="#A7ADA3">unsorted reports</text>
<line class="flow" x1="236" y1="160" x2="444" y2="160" stroke="#D9A441" stroke-width="2"></line>
<text x="340" y="146" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.5" fill="#A7ADA3">EXPORTS &amp; REPORTS</text>
<g transform="translate(530 160)">
<path class="spin" fill="#EEF0EA" fill-rule="evenodd" stroke="#EEF0EA" stroke-width="3" stroke-linejoin="round" d="M 52.6 -6.6 L 61.5 -7.8 A 62 62 0 0 1 61.5 7.8 L 52.6 6.6 A 53 53 0 0 1 48.9 20.5 L 48.9 20.5 L 57.2 24.0 A 62 62 0 0 1 49.4 37.5 L 42.2 32.0 A 53 53 0 0 1 32.0 42.2 L 32.0 42.2 L 37.5 49.4 A 62 62 0 0 1 24.0 57.2 L 20.5 48.9 A 53 53 0 0 1 6.6 52.6 L 6.6 52.6 L 7.8 61.5 A 62 62 0 0 1 -7.8 61.5 L -6.6 52.6 A 53 53 0 0 1 -20.5 48.9 L -20.5 48.9 L -24.0 57.2 A 62 62 0 0 1 -37.5 49.4 L -32.0 42.2 A 53 53 0 0 1 -42.2 32.0 L -42.2 32.0 L -49.4 37.5 A 62 62 0 0 1 -57.2 24.0 L -48.9 20.5 A 53 53 0 0 1 -52.6 6.6 L -52.6 6.6 L -61.5 7.8 A 62 62 0 0 1 -61.5 -7.8 L -52.6 -6.6 A 53 53 0 0 1 -48.9 -20.5 L -48.9 -20.5 L -57.2 -24.0 A 62 62 0 0 1 -49.4 -37.5 L -42.2 -32.0 A 53 53 0 0 1 -32.0 -42.2 L -32.0 -42.2 L -37.5 -49.4 A 62 62 0 0 1 -24.0 -57.2 L -20.5 -48.9 A 53 53 0 0 1 -6.6 -52.6 L -6.6 -52.6 L -7.8 -61.5 A 62 62 0 0 1 7.8 -61.5 L 6.6 -52.6 A 53 53 0 0 1 20.5 -48.9 L 20.5 -48.9 L 24.0 -57.2 A 62 62 0 0 1 37.5 -49.4 L 32.0 -42.2 A 53 53 0 0 1 42.2 -32.0 L 42.2 -32.0 L 49.4 -37.5 A 62 62 0 0 1 57.2 -24.0 L 48.9 -20.5 A 53 53 0 0 1 52.6 -6.6 Z M 32.0 0.0 A 32 32 0 1 0 -32.0 0.0 A 32 32 0 1 0 32.0 0.0 Z"></path>
<line x1="3" y1="3" x2="22" y2="22" stroke="#EEF0EA" stroke-width="6" stroke-linecap="round"></line>
<circle cx="-5" cy="-5" r="12" fill="#D9A441" stroke="#EEF0EA" stroke-width="5"></circle>
</g>
<text x="530" y="258" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.5" fill="#A7ADA3">SMALL TOOL · RUNS OFFLINE</text>
<line class="flow" x1="616" y1="160" x2="800" y2="160" stroke="#D9A441" stroke-width="2"></line>
<text x="708" y="146" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.5" fill="#A7ADA3">SORTED · STAMPED</text>
<g class="sheet-c">
<rect x="868" y="58" width="160" height="200" rx="2" fill="#C9CDC0"></rect>
</g>
<g class="sheet-b">
<rect x="844" y="68" width="160" height="200" rx="2" fill="#D9A441"></rect>
<text x="924" y="96" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="1.5" fill="#171A1D">3 SHEETS · KEEP TOGETHER</text>
</g>
<g class="sheet-a">
<rect x="820" y="78" width="160" height="200" rx="2" fill="#F6F7F2"></rect>
<rect x="834" y="92" width="2" height="26" fill="#171A1D"></rect>
<rect x="839" y="92" width="4" height="26" fill="#171A1D"></rect>
<rect x="846" y="92" width="1.5" height="26" fill="#171A1D"></rect>
<rect x="850" y="92" width="3" height="26" fill="#171A1D"></rect>
<rect x="856" y="92" width="1.5" height="26" fill="#171A1D"></rect>
<rect x="860" y="92" width="4" height="26" fill="#171A1D"></rect>
<rect x="867" y="92" width="2" height="26" fill="#171A1D"></rect>
<rect x="872" y="92" width="3" height="26" fill="#171A1D"></rect>
<g transform="rotate(-8 942 105)">
<rect x="904" y="94" width="68" height="22" fill="none" stroke="#3F6B52" stroke-width="1.5" stroke-dasharray="3 2"></rect>
<text x="938" y="109" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="1" fill="#3F6B52">EXPRESS</text>
</g>
<rect x="834" y="132" width="110" height="5" fill="#C9CDC0"></rect>
<rect x="834" y="144" width="84" height="5" fill="#C9CDC0"></rect>
<rect x="834" y="156" width="98" height="5" fill="#C9CDC0"></rect>
<rect x="834" y="176" width="132" height="86" fill="none" stroke="#8A9086" stroke-width="1" stroke-dasharray="3 3"></rect>
<circle cx="900" cy="214" r="20" fill="none" stroke="#37485A" stroke-width="3"></circle>
<rect x="890" y="204" width="20" height="20" fill="none" stroke="#37485A" stroke-width="2"></rect>
<text x="900" y="254" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8.5" letter-spacing="1" fill="#565C58">PART PREVIEW</text>
</g>
<text x="924" y="306" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="1.5" fill="#A7ADA3">IN PICKING ORDER</text>
</svg>
```

CSS for it:

```css
@keyframes dash{to{stroke-dashoffset:-28}}
.flow{stroke-dasharray:6 8;animation:dash 1.1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{transform-box:fill-box;transform-origin:center;animation:spin 14s linear infinite}
@keyframes sheet{0%{opacity:0;transform:translateY(-16px)}12%{opacity:1;transform:none}82%{opacity:1;transform:none}100%{opacity:0;transform:translateY(6px)}}
.sheet-a{animation:sheet 6s ease-out infinite}
.sheet-b{animation:sheet 6s ease-out .5s infinite}
.sheet-c{animation:sheet 6s ease-out 1s infinite}
```

- Three stats in a row (stack on mobile), numbers in Space Grotesk 700 48px amber, captions 15px:
  - **12 h** a week saved at peak, sorting despatch paperwork
  - **5×** faster matching products to shipping slips
  - **0** changes to your ERP. No new licences, nothing to break at upgrade time

## 5. Not another AI wrapper

Remove the whole "What this actually is" section. In its place, between section 4 and section 6, a compact band:

- Heading (H2, smaller than other H2s): Not another AI wrapper.
- Three columns (stack on mobile). In each, a struck-through line in `--ink-faint` with a `--red-flag` strike, then the replacement in `--ink`:
  - ~~A chatbot bolted onto your workflow~~ → A working tool, where your team already works
  - ~~A template built for a hundred companies~~ → Built for one process: yours
  - ~~A subscription you renew and hope keeps working~~ → Yours to keep. No licence, no renewal

## 6. Where I can help (`id="prices"`)

- Label: `WHERE I CAN HELP`
- H2: Pick the problem. Know the price.
- Side text: Fixed prices, agreed in writing before any work starts. Starting points below, your exact quote after a free call.

Four cards (4 columns desktop, 2 at tablet, 1 on mobile). Each card: an inspection-tag style label (1.5px border, mono 12px, rotated -3deg) reading `FROM £…`, H3, one line, then rows separated by 1px dashed lines with the price right-aligned in mono.

**Data & reporting** · tag `FROM £600` · The numbers are already there. Make them useful.
- One-off data analysis with findings · £600
- Automated report from fixed data · £750
- Live dashboard from your data · £1,500

**Process automation** · tag `FROM £500` · Stop retyping, re-sorting and re-exporting.
- File, email and export automation · £750
- Document sorting and generation · £1,000
- Adobe batch export or simple script · £500
- Adobe personalisation or multi-up layout tool · £2,500

**Quality & error-proofing** · tag `FROM £1,000` · Catch the mistake before it costs material.
- Digital checklist or traceability log · £1,000
- Quality gate before production · £1,500
- DMAIC improvement project · £2,000

**Around your ERP** (dark card: `--ink` background, `--paper` text, amber tag and prices) · tag `FROM £750` · Fill the gaps your system can't.
- Paperwork sorting and sequencing · £1,000
- Picking routes and order sequence · £2,000
- Job-time, packaging or material calculator · £750
- Prediction model on your production history · £2,500
- Full workflow application · £5,000+

Under the cards, a box with a 1.5px `--ink` border:
- Label: `ALWAYS INCLUDED`
- Five items with a green tick icon: Fixed price in writing, before any work starts · You own the tool. No licence, no subscription · Documentation and training for your team · 30 days of fixes after handover · First job: you pay when it works
- Last line, separated by a dashed rule: Not sure where to start? A one-day process review is £600, credited in full against any build.

## 7. How an engagement runs

Keep the existing layout. Replace the three step texts:

- **Diagnose.** A free 30-minute call, or a one-day process review for £600, credited in full against any build. You get a clear answer either way, even if the answer is that you don't need a tool.
- **Build.** A fixed price in writing, then the tool the diagnosis calls for: software, automation or a change to the workflow. Built around your process and the systems you already have.
- **Embed.** Set up where your team already works, with training and documentation. 30 days of fixes included. On a first job, you pay when it works.

## 8. Case files

Keep the four existing cards. Add two more in the same card format (6 cards, 2×3 on desktop):

**Standardising machine files**
- Challenge: Every new product range needed hours of manual file preparation before anything could run.
- Approach: Replaced one-off files with a standard set and built-in alignment checks.
- Outcome: The prep step disappeared completely. Time to test a new range down 93%.

**Smarter picking**
- Challenge: Pickers walked the warehouse in whatever order the paperwork came out.
- Approach: A tool that maps efficient routes and sequences orders to match.
- Outcome: Picking rate up by about 40%.

## 9. Field notes (teaser)

A short band, one card:
- Label: `FIELD NOTES`
- Title (link): Doing it by hand for years, until someone decided not to
- Line: A job everyone accepted as normal, what changed, and what it took.
- Link: `Read the note →` to `/notes/doing-it-by-hand.html`

## 10. Who's behind this (rebuilt)

- Label: `WHO'S BEHIND THIS`
- H2: Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three.

Desktop two columns: left the gears diagram, right the person. Stack on mobile (diagram first, max width 100%).

Diagram SVG, as given:

```html
<svg viewBox="0 0 800 560" width="640" height="448" role="img" aria-label="Three separate specialists, the floor, the code and the data, come together around one central gear that meshes with all three">
<text class="cap-out" x="400" y="40" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" letter-spacing="2" fill="#B5482E">THREE SPECIALISTS · THREE INVOICES</text>
<text class="cap-in" x="400" y="40" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" letter-spacing="2" fill="#3F6B52">ONE PERSON · MESHES WITH ALL THREE</text>
<text x="196" y="200" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="#37485A">THE FLOOR</text>
<text x="196" y="223" text-anchor="end" font-family="IBM Plex Sans, sans-serif" font-size="16" fill="#171A1D">Lean &amp; CI consultant</text>
<text x="196" y="244" text-anchor="end" font-family="IBM Plex Sans, sans-serif" font-size="13.5" fill="#565C58">Doesn't write code</text>
<text x="604" y="200" text-anchor="start" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="#37485A">THE CODE</text>
<text x="604" y="223" text-anchor="start" font-family="IBM Plex Sans, sans-serif" font-size="16" fill="#171A1D">Software developer</text>
<text x="604" y="244" text-anchor="start" font-family="IBM Plex Sans, sans-serif" font-size="13.5" fill="#565C58">Doesn't know your floor</text>
<text x="400" y="502" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="#37485A">THE DATA</text>
<text x="400" y="525" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="16" fill="#171A1D">ERP partner</text>
<text x="400" y="546" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="13.5" fill="#565C58">Every change billed by the hour</text>
<g class="center-in">
<path class="spin-c" fill="#171A1D" fill-rule="evenodd" stroke="#171A1D" stroke-width="3" stroke-linejoin="round" d="M 460.5 262.4 L 470.4 261.1 A 71 71 0 0 1 470.4 278.9 L 460.5 277.6 A 61 61 0 0 1 456.2 293.6 L 456.2 293.6 L 465.5 297.5 A 71 71 0 0 1 456.6 312.9 L 448.6 306.9 A 61 61 0 0 1 436.9 318.6 L 436.9 318.6 L 442.9 326.6 A 71 71 0 0 1 427.5 335.5 L 423.6 326.2 A 61 61 0 0 1 407.6 330.5 L 407.6 330.5 L 408.9 340.4 A 71 71 0 0 1 391.1 340.4 L 392.4 330.5 A 61 61 0 0 1 376.4 326.2 L 376.4 326.2 L 372.5 335.5 A 71 71 0 0 1 357.1 326.6 L 363.1 318.6 A 61 61 0 0 1 351.4 306.9 L 351.4 306.9 L 343.4 312.9 A 71 71 0 0 1 334.5 297.5 L 343.8 293.6 A 61 61 0 0 1 339.5 277.6 L 339.5 277.6 L 329.6 278.9 A 71 71 0 0 1 329.6 261.1 L 339.5 262.4 A 61 61 0 0 1 343.8 246.4 L 343.8 246.4 L 334.5 242.5 A 71 71 0 0 1 343.4 227.1 L 351.4 233.1 A 61 61 0 0 1 363.1 221.4 L 363.1 221.4 L 357.1 213.4 A 71 71 0 0 1 372.5 204.5 L 376.4 213.8 A 61 61 0 0 1 392.4 209.5 L 392.4 209.5 L 391.1 199.6 A 71 71 0 0 1 408.9 199.6 L 407.6 209.5 A 61 61 0 0 1 423.6 213.8 L 423.6 213.8 L 427.5 204.5 A 71 71 0 0 1 442.9 213.4 L 436.9 221.4 A 61 61 0 0 1 448.6 233.1 L 448.6 233.1 L 456.6 227.1 A 71 71 0 0 1 465.5 242.5 L 456.2 246.4 A 61 61 0 0 1 460.5 262.4 Z M 437.0 270.0 A 37 37 0 1 0 363.0 270.0 A 37 37 0 1 0 437.0 270.0 Z"></path>
<line x1="407.2" y1="277.2" x2="431.8" y2="301.8" stroke="#171A1D" stroke-width="9.5" stroke-linecap="round"></line>
<circle cx="393.8" cy="263.8" r="15.6" fill="#D6C29B" stroke="#171A1D" stroke-width="6.6"></circle>
</g>
<g class="in-l"><path class="spin-o" fill="#37485A" fill-rule="evenodd" stroke="#37485A" stroke-width="3" stroke-linejoin="round" d="M 343.7 212.8 L 353.7 212.2 A 49 49 0 0 1 351.3 230.4 L 341.8 227.2 A 39 39 0 0 1 333.9 240.9 L 333.9 240.9 L 341.3 247.6 A 49 49 0 0 1 326.8 258.8 L 322.3 249.8 A 39 39 0 0 1 307.0 253.9 L 307.0 253.9 L 307.6 263.9 A 49 49 0 0 1 289.4 261.5 L 292.5 252.0 A 39 39 0 0 1 278.8 244.1 L 278.8 244.1 L 272.1 251.6 A 49 49 0 0 1 261.0 237.0 L 269.9 232.5 A 39 39 0 0 1 265.8 217.2 L 265.8 217.2 L 255.8 217.8 A 49 49 0 0 1 258.2 199.6 L 267.7 202.8 A 39 39 0 0 1 275.6 189.1 L 275.6 189.1 L 268.2 182.4 A 49 49 0 0 1 282.7 171.2 L 287.2 180.2 A 39 39 0 0 1 302.5 176.1 L 302.5 176.1 L 301.9 166.1 A 49 49 0 0 1 320.1 168.5 L 317.0 178.0 A 39 39 0 0 1 330.7 185.9 L 330.7 185.9 L 337.3 178.4 A 49 49 0 0 1 348.5 193.0 L 339.6 197.5 A 39 39 0 0 1 343.7 212.8 Z M 328.7 215.0 A 24 24 0 1 0 280.7 215.0 A 24 24 0 1 0 328.7 215.0 Z"></path><circle cx="304.7" cy="215.0" r="5" fill="#37485A"></circle></g>
<g class="in-r"><path class="spin-o" fill="#37485A" fill-rule="evenodd" stroke="#37485A" stroke-width="3" stroke-linejoin="round" d="M 477.7 249.8 L 473.2 258.8 A 49 49 0 0 1 458.7 247.6 L 466.1 240.9 A 39 39 0 0 1 458.2 227.2 L 458.2 227.2 L 448.7 230.4 A 49 49 0 0 1 446.3 212.2 L 456.3 212.8 A 39 39 0 0 1 460.4 197.5 L 460.4 197.5 L 451.5 193.0 A 49 49 0 0 1 462.7 178.4 L 469.3 185.9 A 39 39 0 0 1 483.0 178.0 L 483.0 178.0 L 479.9 168.5 A 49 49 0 0 1 498.1 166.1 L 497.5 176.1 A 39 39 0 0 1 512.8 180.2 L 512.8 180.2 L 517.3 171.2 A 49 49 0 0 1 531.8 182.4 L 524.4 189.1 A 39 39 0 0 1 532.3 202.8 L 532.3 202.8 L 541.8 199.6 A 49 49 0 0 1 544.2 217.8 L 534.2 217.2 A 39 39 0 0 1 530.1 232.5 L 530.1 232.5 L 539.0 237.0 A 49 49 0 0 1 527.9 251.6 L 521.2 244.1 A 39 39 0 0 1 507.5 252.0 L 507.5 252.0 L 510.6 261.5 A 49 49 0 0 1 492.4 263.9 L 493.0 253.9 A 39 39 0 0 1 477.7 249.8 Z M 519.3 215.0 A 24 24 0 1 0 471.3 215.0 A 24 24 0 1 0 519.3 215.0 Z"></path><circle cx="495.3" cy="215.0" r="5" fill="#37485A"></circle></g>
<g class="in-b"><path class="spin-o" fill="#37485A" fill-rule="evenodd" stroke="#37485A" stroke-width="3" stroke-linejoin="round" d="M 378.6 347.4 L 373.1 339.0 A 49 49 0 0 1 390.1 332.0 L 392.1 341.8 A 39 39 0 0 1 407.9 341.8 L 407.9 341.8 L 409.9 332.0 A 49 49 0 0 1 426.9 339.0 L 421.4 347.4 A 39 39 0 0 1 432.6 358.6 L 432.6 358.6 L 441.0 353.1 A 49 49 0 0 1 448.0 370.1 L 438.2 372.1 A 39 39 0 0 1 438.2 387.9 L 438.2 387.9 L 448.0 389.9 A 49 49 0 0 1 441.0 406.9 L 432.6 401.4 A 39 39 0 0 1 421.4 412.6 L 421.4 412.6 L 426.9 421.0 A 49 49 0 0 1 409.9 428.0 L 407.9 418.2 A 39 39 0 0 1 392.1 418.2 L 392.1 418.2 L 390.1 428.0 A 49 49 0 0 1 373.1 421.0 L 378.6 412.6 A 39 39 0 0 1 367.4 401.4 L 367.4 401.4 L 359.0 406.9 A 49 49 0 0 1 352.0 389.9 L 361.8 387.9 A 39 39 0 0 1 361.8 372.1 L 361.8 372.1 L 352.0 370.1 A 49 49 0 0 1 359.0 353.1 L 367.4 358.6 A 39 39 0 0 1 378.6 347.4 Z M 424.0 380.0 A 24 24 0 1 0 376.0 380.0 A 24 24 0 1 0 424.0 380.0 Z"></path><circle cx="400.0" cy="380.0" r="5" fill="#37485A"></circle></g>
</svg>
```

Its CSS. Important: on the live site the animation must start when the section scrolls into view, not on load. Scope every animation rule under a `.run` class that IntersectionObserver adds to the SVG (for example `.run .in-l{...}`), and before `.run` show the start state (outer gears offset, centre gear at opacity .16, first caption visible, second hidden):

```css
@keyframes inL{0%,30%{transform:translate(-43.3px,-25px)}65%,100%{transform:translate(0,0)}}
@keyframes inR{0%,30%{transform:translate(43.3px,-25px)}65%,100%{transform:translate(0,0)}}
@keyframes inB{0%,30%{transform:translate(0,50px)}65%,100%{transform:translate(0,0)}}
.in-l{animation:inL 2.4s cubic-bezier(.5,0,.2,1) both}
.in-r{animation:inR 2.4s cubic-bezier(.5,0,.2,1) both}
.in-b{animation:inB 2.4s cubic-bezier(.5,0,.2,1) both}
@keyframes centerIn{0%,50%{opacity:.16}85%,100%{opacity:1}}
.center-in{animation:centerIn 2.4s ease-out both}
@keyframes cw{to{transform:rotate(360deg)}}
@keyframes ccw{to{transform:rotate(-360deg)}}
.spin-c{transform-box:fill-box;transform-origin:center;animation:cw 12s linear 2.4s infinite}
.spin-o{transform-box:fill-box;transform-origin:center;animation:ccw 8s linear 2.4s infinite}
@keyframes capOut{0%,40%{opacity:1}55%,100%{opacity:0}}
@keyframes capIn{0%,80%{opacity:0}100%{opacity:1}}
.cap-out{animation:capOut 2.4s ease both}
.cap-in{animation:capIn 2.8s ease both}
```

Under the diagram, three short items in a row (mono numbers in green):
- 01 I find the waste on the floor.
- 02 I write the code that removes it.
- 03 I work with the data your ERP already has.

Right column:
- Photo `/assets/kamil-pojawa.jpg`, 132×132, `object-fit: cover`, radius 3px, 1px `--line` border, `alt="Kamil Pojawa"`, `loading="lazy"`.
- Name: Kamil Pojawa (Space Grotesk 700, 24px). Under it, mono: `ONE PERSON · DIAGNOSIS TO DEPLOY`
- Paragraph 1: I'm Kamil Pojawa. I run a production floor for a living, with over eight years in high-volume manufacturing. Alongside that I build the tools that make it run better: quality gates, paperwork and sorting tools around the ERP, prediction models, dashboards.
- Paragraph 2 (`--ink-soft`): Everything on this page was diagnosed, built and deployed by one person and tested on real production data. No team of consultants between you and the person who actually understands your process.
- Keep the existing credential chips.
- Link: `CONNECT ON LINKEDIN →` to the LinkedIn URL given in the task prompt (`target="_blank" rel="noopener"`).

## 11. Questions

- Label: `QUESTIONS`
- H2: Straight answers
- Use `<details><summary>` for each (first one open). Keyboard accessible, plus/minus indicator.

1. **Do I need to know what the problem is?** No. Most of what I've fixed wasn't on anyone's list. Tell me what feels slow or keeps going wrong, and I'll find where the time goes.
2. **Will it work with our ERP?** Yes. I work from the exports and reports your system already produces, whether that's Sage, Epicor or something else. Nothing inside your ERP changes, so upgrades and support stay exactly as they are.
3. **Who owns what you build?** You do. The tool, the code and the documentation. No licence fees, no subscription.
4. **Where does our data go?** Nowhere. Tools run on your own machines and most work fully offline. I don't keep copies of your data once the job is done.
5. **What if something breaks later?** The first 30 days of fixes are included. After that, you ask for changes only when you need them, priced before any work starts. No retainer.
6. **How long does it take?** Small tools usually take one to two weeks, larger ones three to six. You get a date with the quote.

## 12. Contact

Keep the heading and paragraph. Add a "What happens next" list above the button:

1. Send a line about what's slowing you down. I reply within one working day.
2. A 30-minute call, remote, no preparation needed.
3. A written proposal with a fixed price, or an honest "you don't need a tool for this".

## 13. Footer

- Wordmark at **20px** height.
- Replace the footer tagline with: Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three.

---

## SEO (index.html)

- `<title>`: Meshlock · Automation & Continuous Improvement for Manufacturers
- `<meta name="description">`: Automation and continuous improvement for manufacturers. Tools built around your ERP, with fixed prices from £500. Based in Swindon, working UK-wide.
- `<link rel="canonical" href="https://meshlock.co.uk/">`
- Open Graph and Twitter: `og:type` website, `og:site_name` Meshlock, `og:title` "Meshlock · One person who meshes all three", `og:description` (same as meta description), `og:url` https://meshlock.co.uk/, `og:image` https://meshlock.co.uk/assets/og-image.png with width 1200, height 630 and `og:image:alt`; `twitter:card` summary_large_image.
- Exactly one H1 (the hero). Section titles are H2, card titles H3.
- JSON-LD in the head:
  - `ProfessionalService`: name Meshlock, url, image (the OG image), description (meta description), `priceRange` "£500-£5,000+", `areaServed` Swindon, Wiltshire, Gloucestershire, Oxfordshire, United Kingdom; `founder` a `Person` named Kamil Pojawa with `sameAs` the LinkedIn URL.
  - `FAQPage` with the six questions and answers from section 11, text identical to the page.
- Field Notes pages: add canonical, `og:title`, `og:description`, `og:url` and the same `og:image`. Use each page's own title and a one-line description.
- Add `sitemap.xml` at the root listing `/`, `/notes/` and `/notes/doing-it-by-hand.html` (lastmod today), and `robots.txt` allowing all with a `Sitemap:` line.

## CLAUDE.md updates

- File structure: add `assets/kamil-pojawa.jpg`, `assets/og-image.png`, `sitemap.xml`, `robots.txt`.
- Writing rules: replace "no exact figures" with: rounded results (hours, percentages, multiples) are allowed; never company names, product names, money amounts from a real client, screenshots or data charts.
- Add a "Homepage structure" section listing the page order above, and note that the prices in section 6 are the reference price list: change them only when asked.
- Add under Brand: the tagline "Software engineer, Lean consultant or ERP specialist? You don't have to choose. I mesh all three." and the short form `SOFTWARE · LEAN · ERP`.
- Add under Logo: the "Who's behind this" rig is a 12-tooth ink logo gear with a static magnifier meshing with three 8-tooth steel gears at 110px centre distance (angles 210°, 330°, 90°). Outer gears turn at -12/8 of the centre gear. Do not change tooth counts, radii or positions without redoing the mesh geometry.
- Known open tasks: remove the homepage Field Notes teaser task (done). Add: "Local landing pages (Swindon, Gloucestershire, Oxfordshire)" and "More Field Notes articles".

## When done

In the PR description, list each section with what changed, so it can be reviewed on a phone. Then check the Netlify deploy preview at 390px and 1280px wide and fix anything that scrolls sideways or overlaps.
