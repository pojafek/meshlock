# Site check

One browser test for the whole site. Run it before every pull request, and extend it for anything new.

## How to run it

From the repo root:

```
node tests/site-check/site-check.js
```

It needs Node and Playwright with Chromium (`npm install -g playwright`, then `npx playwright install chromium` on your own machine). It serves the repo itself on a free local port, so no other server is needed. Outside requests (Google Fonts, GoatCounter) are answered empty, so it runs offline.

It prints one `FAIL` line per problem and ends with `N passed, N failed`. It exits with 1 if anything failed. Screenshots go to your temp folder (`meshlock-site-check`), or to the folder in `SHOTS=`. To use another Chromium, set `CHROME_PATH=`.

## What it checks

1. **Layout**: every page at 390 px and 1280 px opens, nothing scrolls sideways, no script errors.
2. **No tag**: every footer links Toolkit (not in the main nav), toolkit breadcrumbs link /toolkit/, every offer link carries the page's fallback tag (`tk-index`, `tk-cycle`, `tk-timer`, `tk-automating`). The /toolkit/ cards have their type tag, question, time and note, every link on the page opens, note titles match, no first person, no dashes, manifest, OG tags and sitemap. /notes/ shows the standard line and the toolkit link.
3. **pc tag**: after opening `/?s=pc`, every page in the same tab speaks for Patryk. No "Kamil", no hello@, his email in the footer, LinkedIn hidden, every offer link carries `pc`.
4. **Slow load**: with `site.js` held back, Kamil's lines stay hidden for a `pc` visitor until the swap, and a visitor with no tag sees the page at once.
5. **stats.js blocked**: tags still carry over and Patryk's version still works.
6. **Puzzle**: solving Decode the log gives 76%, the cycle time calculator in the same article plans with it by itself, the button after the puzzle leads to the calculator, and the side window shows keep it at the calculator and the offer from What I do with it on.
7. **Tools**: the cycle time calculator works and keeps its inputs in the link, the step timer runs and links to the offer with `tk-timer`, and Worth automating? gives a verdict.
8. **Not published**: `_redirects` answers 404 for `/tests` and `/tests/*`.
9. **Print**: every print button prints only its part, on the expected number of A4 pages (calculator and step timer result 1, machine checklist 1, shift logs one per machine, paper sheet 1), with the tag and a QR code in the footer; the checklist and paper sheet keep what was typed.
10. **Checklist text**: the checklist in the machine data note matches the printable checklist item for item, and no step needs IT or opening anything. YOU GET links point to parts of the note, and tools sit in a Yours to keep frame.
11. **Kept tools**: toolkit pages put the tag in their address, keep links carry it, a tool reopened in a new tab (like a home screen icon) still speaks for Patryk, the rest of the site does not.

## Extending it

Add a page to `PAGES` (and to `TK` if it is a toolkit page with its own tag). Add a numbered block for any new behaviour. Keep each check one `ok(condition, message)` line, so a failure says exactly what broke.
