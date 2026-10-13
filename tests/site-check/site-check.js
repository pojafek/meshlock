// Meshlock site check. Run from anywhere: node tests/site-check/site-check.js
// Serves the repo on a free local port, drives Chromium with Playwright and prints one line per failure.
// See README.md next to this file for what it checks and how to extend it.
const fs = require('fs'), http = require('http'), path = require('path'), os = require('os');
let pw;
try { pw = require('playwright'); } catch (e) {
  pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'));
}
const { chromium } = pw;
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'meshlock-site-check') + path.sep;
fs.mkdirSync(SHOTS, { recursive: true });
let BASE;

// A tiny static server for the repo: /dir/ serves /dir/index.html, anything missing is a 404
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('not found'); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, '127.0.0.1', () => { BASE = 'http://127.0.0.1:' + s.address().port; res(s); });
  });
}
const PAGES = ['/', '/tools/', '/prices/', '/notes/', '/notes/doing-it-by-hand.html', '/notes/your-machines-already-know.html',
  '/toolkit/', '/toolkit/cycle-time/', '/toolkit/step-timer/', '/toolkit/worth-automating/', '/toolkit/machine-data/', '/toolkit/anonymise/', '/toolkit/step-timer/sheet/', '/thanks.html', '/start/'];
const FOOTER_PAGES = PAGES.filter(p => p !== '/start/');
const TK = { '/toolkit/': 'tk-index', '/toolkit/cycle-time/': 'tk-cycle', '/toolkit/step-timer/': 'tk-timer', '/toolkit/worth-automating/': 'tk-automating', '/toolkit/machine-data/': 'tk-machine', '/toolkit/anonymise/': 'tk-anonymise', '/toolkit/step-timer/sheet/': 'tk-timer' };
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } };

async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ viewport: { width: opts.w || 1280, height: 900 }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
  // External hosts (fonts, GoatCounter) are not part of the test: answer them empty so pages load offline
  await c.route(u => !u.href.startsWith(BASE), r => r.fulfill({ status: 200, body: '' }));
  if (opts.blockStats) await c.route('**/assets/stats.js', r => r.abort());
  if (opts.slow) await c.route('**/assets/site.js', async r => { await new Promise(x => setTimeout(x, opts.slow)); r.continue(); });
  return c;
}
async function open(c, path, tab) {
  const p = tab || await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const r = await p.goto(BASE + path, { waitUntil: 'load' });
  await p.waitForTimeout(150);
  return { p, errs, status: r.status() };
}
const window_parse = l => { const r = []; let f = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"') { if (l[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; } else if (ch === '"') q = true; else if (ch === ',') { r.push(f); f = ''; } else f += ch; } r.push(f); return r; };
const visibleText = p => p.evaluate(() => document.body.innerText);
const startTags = p => p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /\/start\//.test(h)).map(h => { const u = new URL(h, location.href); return u.searchParams.get('s'); }));

(async () => {
  const server = await serve();
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

  // 1. Layout at 390 and 1280: no sideways scroll, no script errors, every page loads
  for (const w of [390, 1280]) {
    const c = await ctx(browser, { w });
    for (const path of PAGES) {
      const { p, errs, status } = await open(c, path);
      ok(status === 200, `${path} status ${status}`);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, `${path} @${w} scrolls sideways by ${over}px`);
      ok(errs.length === 0, `${path} @${w} errors: ${errs.join(' | ')}`);
      if (['/toolkit/', '/notes/', '/toolkit/step-timer/sheet/', '/toolkit/cycle-time/', '/toolkit/machine-data/'].includes(path))
        await p.screenshot({ path: SHOTS + (path.replace(/\//g, '_') || '_') + w + '.png', fullPage: true });
      await p.close();
    }
    await c.close();
  }

  // 2. No tag: fallback tags, footer, breadcrumbs, cards, links
  {
    const c = await ctx(browser);
    for (const path of FOOTER_PAGES) {
      const { p } = await open(c, path);
      ok(await p.locator('footer .foot-links a[href="/toolkit/"]', { hasText: 'Toolkit' }).count() === 1, `${path} footer Toolkit link`);
      ok(await p.locator('nav a[href="/toolkit/"]').count() === 0, `${path} Toolkit not in main nav`);
      if (TK[path]) {
        const tags = await startTags(p);
        ok(tags.length > 0 && tags.every(t => t === TK[path]), `${path} offer tags ${tags} want ${TK[path]}`);
        if (path !== '/toolkit/') ok(await p.locator('.crumbs a[href="/toolkit/"]', { hasText: 'Toolkit' }).count() === 1, `${path} breadcrumb Toolkit links /toolkit/`);
        else ok(/Meshlock \/ Toolkit/i.test(await p.locator('.crumbs').innerText()), '/toolkit/ breadcrumb');
      }
      await p.close();
    }
    const { p } = await open(c, '/toolkit/');
    const cards = p.locator('.tk-card');
    ok(await cards.count() === 5, 'five cards');
    const tags = await p.locator('.tk-card .tk-tag').allInnerTexts();
    ok(tags.join(',') === 'CALCULATOR,CHECKLIST,TIMER,CHECK,ANONYMISER', 'card type tags ' + tags);
    ok(!/TOOL \d/.test(await visibleText(p)), 'no tool numbers on the cards');
    ok(await p.locator('.tk-card a.tk-paper[href="/toolkit/step-timer/sheet/"]').count() === 1, 'step timer card links its paper sheet');
    for (let i = 0; i < 5; i++) {
      const card = cards.nth(i);
      ok(await card.locator('.tk-q').count() === 1 && await card.locator('.tk-time').count() === 1 && await card.locator('.tk-use').count() === 1, `card ${i} question + time + use it when`);
      const note = await card.locator('.tk-note').innerText();
      ok(i < 4 ? note.startsWith('From the note:') : /never uploaded/.test(note), `card ${i} note line: ${note}`);
    }
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('main, .tk-index, footer, .crumbs')].flatMap(e => [...e.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'))));
    for (const h of new Set(hrefs.map(h => h.split('#')[0].split('?')[0]))) {
      const r = await p.request.get(BASE + h); ok(r.status() === 200, `/toolkit/ link ${h} -> ${r.status()}`);
    }
    // Card notes match the note titles they link to
    for (const a of await p.locator('.tk-note a').all()) {
      const t = await a.innerText(), h = await a.getAttribute('href');
      const q = await c.newPage(); await q.goto(BASE + h); ok((await q.locator('h1').innerText()).trim() === t.trim(), `note title for ${h}`); await q.close();
    }
    const txt = await visibleText(p);
    ok(!/\b(I|I'm|I've|me|my|mine)\b/.test(txt.replace(/Back to top/, '')), '/toolkit/ has no first person');
    ok(!/—|–| - /.test(txt), '/toolkit/ no dashes');
    ok(await p.locator('link[rel="manifest"][href="/toolkit/manifest.webmanifest"]').count() === 1, 'manifest linked');
    ok(await p.locator('meta[property="og:url"][content="https://meshlock.co.uk/toolkit/"]').count() === 1, 'og:url');
    ok(await p.locator('meta[name="robots"]').count() === 0, '/toolkit/ indexable');
    const mf = await (await p.request.get(BASE + '/toolkit/manifest.webmanifest')).json();
    ok(mf.start_url === '/toolkit/' && mf.short_name === 'Toolkit', 'manifest content');
    const sm = await (await p.request.get(BASE + '/sitemap.xml')).text();
    ok(sm.includes('<loc>https://meshlock.co.uk/toolkit/</loc>'), 'sitemap has /toolkit/');
    await p.close();
    const n = await open(c, '/notes/');
    ok((await n.p.locator('.notes-standard').innerText()) === 'Every note: a problem worth seeing, a way to measure it yourself, and a free tool to keep.', 'notes standard line');
    ok(await n.p.locator('.notes-header a[href="/toolkit/"]', { hasText: 'Free tools from these notes' }).count() === 1, 'notes toolkit link');
    ok((await visibleText(n.p)).includes('taught me'), 'notes no tag shows Kamil voice');
    await c.close();
  }

  // 3. pc tag: stored tag carries across pages, whole site speaks for Patryk
  {
    const c = await ctx(browser);
    const tab = (await open(c, '/?s=pc')).p;
    for (const path of PAGES) {
      const { p, errs } = await open(c, path, tab);
      const t = await visibleText(p);
      ok(!/Kamil/.test(t), `pc ${path} shows Kamil`);
      ok(!/hello@meshlock/.test(t), `pc ${path} shows hello@`);
      ok(await p.evaluate(() => document.documentElement.classList.contains('pc') && !document.documentElement.classList.contains('pc-wait')), `pc ${path} class`);
      const tags = await startTags(p);
      ok(tags.every(x => x === 'pc'), `pc ${path} offer tags ${tags}`);
      if (FOOTER_PAGES.includes(path)) {
        ok(/patryk@meshlock\.co\.uk/.test(await p.locator('footer').innerText()), `pc ${path} footer email`);
        ok(!(await p.locator('footer a[href*="linkedin"]').isVisible()), `pc ${path} LinkedIn hidden`);
      }
      ok(errs.length === 0, `pc ${path} errors ${errs}`);
      if (path === '/notes/') ok(t.includes('taught us'), 'pc notes h1 swapped');
      tab.removeAllListeners('pageerror'); tab.removeAllListeners('console');
    }
    await c.close();
    // pc tag straight on /toolkit/
    const c2 = await ctx(browser, { w: 390 });
    const { p } = await open(c2, '/toolkit/?s=pc');
    ok((await startTags(p)).every(x => x === 'pc'), 'pc direct /toolkit/ tags');
    await p.screenshot({ path: SHOTS + 'toolkit_pc_390.png', fullPage: true });
    await c2.close();
  }

  // 4. Slow site.js: Kamil's lines never show to a pc visitor; no-tag pages show at once
  for (const path of ['/toolkit/', '/notes/', '/toolkit/step-timer/']) {
    const c = await ctx(browser, { slow: 2500 });
    const p = await c.newPage();
    await p.goto(BASE + path + '?s=pc', { waitUntil: 'commit' });
    await p.waitForSelector('footer', { state: 'attached' }); await p.waitForTimeout(800);
    const early = await p.evaluate(() => ({
      swapped: !document.documentElement.classList.contains('pc-wait'),
      hidden: [...document.querySelectorAll('[data-pc]')].every(e => getComputedStyle(e).visibility === 'hidden'),
      li: [...document.querySelectorAll('[data-pc-hide]')].every(e => getComputedStyle(e).display === 'none')
    }));
    ok(!early.swapped && early.hidden && early.li, `slow pc ${path} hides Kamil lines before swap ${JSON.stringify(early)}`);
    await p.waitForTimeout(3200);
    ok(/patryk@/.test(await p.locator('footer').innerText()) && await p.evaluate(() => !document.documentElement.classList.contains('pc-wait')), `slow pc ${path} swapped after load`);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('footer [data-pc]')).visibility) === 'visible', `slow pc ${path} revealed`);
    await c.close();
    const c2 = await ctx(browser, { slow: 2500 });
    const q = await c2.newPage();
    await q.goto(BASE + path, { waitUntil: 'commit' });
    await q.waitForSelector('footer', { state: 'attached' }); await q.waitForTimeout(800);
    ok(await q.evaluate(() => getComputedStyle(document.querySelector('footer [data-pc]')).visibility === 'visible'), `slow no tag ${path} visible at once`);
    await c2.close();
  }

  // 5. stats.js blocked: tags and Patryk's version still work
  {
    const c = await ctx(browser, { blockStats: true });
    let r = await open(c, '/toolkit/?s=kp-li-data');
    ok((await startTags(r.p)).every(x => x === 'kp-li-data'), 'blocked stats: kp tag applied');
    ok(r.errs.length === 0, 'blocked stats: no errors ' + r.errs);
    r = await open(c, '/toolkit/cycle-time/', r.p);
    ok((await startTags(r.p)).every(x => x === 'kp-li-data'), 'blocked stats: tag carried to cycle-time');
    await c.close();
    const c2 = await ctx(browser, { blockStats: true });
    r = await open(c2, '/toolkit/?s=pc');
    ok(/patryk@/.test(await r.p.locator('footer').innerText()), 'blocked stats: pc still swaps');
    await c2.close();
  }

  // 6. Puzzle: 76% and the calculator picks it up
  {
    const c = await ctx(browser, { reduce: true });
    const { p, errs } = await open(c, '/notes/your-machines-already-know.html');
    await p.click('#lockGuess');
    for (let i = 0; i < 4; i++) await p.click('#hint');
    for (const label of ['Job start', 'Job end', 'Job end', 'Next job start', 'Fault on', 'Fault cleared'])
      await p.locator('.pz .block', { hasText: new RegExp('^' + label + '$') }).click();
    await p.click('#run');
    await p.waitForSelector('#stats:not(.hidden)');
    ok((await p.locator('#stats').innerText()).includes('76%'), 'puzzle result 76%');
    const btn = p.locator('[data-tool="cycle-time"] .cc-mode[data-m="puzzle"]');
    ok(await btn.isVisible() && (await btn.innerText()).includes('76%'), 'calculator offers the puzzle 76%');
    ok(await btn.getAttribute('aria-pressed') === 'true', 'calculator uses the puzzle 76% by itself');
    ok(/76%/.test(await p.locator('[data-tool="cycle-time"] [data-o="planh"]').innerText()), 'planned row at 76% without a click');
    ok(await p.locator('#s5 a[href="#cycle-time"]').count() === 1 && await p.locator('#s5 a[href="#what-i-build"]').count() === 0, 'after the puzzle the button leads to the calculator, not past it');
    // Side window follows the reader: calculator = keep it, What I do with it = the offer
    await p.locator('#cycle-time').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 200)); await p.waitForTimeout(200);
    ok(/yours/i.test(await p.locator('#tsHead').innerText()) && /\/toolkit\/cycle-time\//.test(await p.locator('#tsGo').getAttribute('href')), 'side window at the calculator: keep it');
    await p.evaluate(() => document.getElementById('what-i-build').scrollIntoView()); await p.waitForTimeout(200);
    ok(/\/start\/\?s=fn-data-puzzle/.test(await p.locator('#tsGo').getAttribute('href')), 'side window at What I do with it: the offer with fn-data-puzzle');
    ok(errs.length === 0, 'puzzle errors ' + errs);
    await c.close();
  }

  // 7. Tools on their own pages
  {
    const c = await ctx(browser, { w: 390 });
    let r = await open(c, '/toolkit/cycle-time/');
    await r.p.locator('[data-k="c"]').fill('43:39'); await r.p.locator('[data-k="n"]').fill('36');
    await r.p.waitForTimeout(200);
    const v = await r.p.locator('[data-o="hour"]').innerText();
    ok(/49/.test(v), 'cycle time parts per hour ' + v);
    ok(/c=/.test(await r.p.evaluate(() => location.hash)), 'cycle time keeps inputs in the link');
    r = await open(c, '/toolkit/step-timer/');
    await r.p.click('.st-start'); await r.p.waitForTimeout(300); await r.p.click('.st-next'); await r.p.waitForTimeout(300); await r.p.click('.st-next'); await r.p.waitForTimeout(300);
    await r.p.click('.st-finish');
    await r.p.locator('#st-pw').fill('25');
    ok(/\/start\/\?s=tk-timer#f=export/.test(await r.p.locator('.st-offer').getAttribute('href')), 'step timer offer link');
    ok(await r.p.locator('.st-results').isVisible(), 'step timer results');
    r = await open(c, '/toolkit/worth-automating/');
    for (const q of await r.p.locator('.wa-q').all()) await q.locator('.wa-opt').first().click();
    ok(await r.p.locator('.wa-verdict').isVisible(), 'worth automating verdict');
    ok(r.errs.length === 0, 'tools errors ' + r.errs);
    await c.close();
  }

  // 9. Print: every print button prints only its part, on clean A4 pages (no blank pages from the rest)
  {
    const c = await ctx(browser, { reduce: true });
    const pages = async (p, cls) => {
      if (cls) await p.evaluate(x => document.body.classList.add(x), cls);
      await p.emulateMedia({ media: 'print' });
      const buf = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
      await p.emulateMedia({ media: 'screen' });
      return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    };
    const stub = p => p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    let r = await open(c, '/notes/your-machines-already-know.html'); await stub(r.p);
    await r.p.click('#cycle-time .cc-print');
    ok(await r.p.evaluate(() => window.__printed === 1), 'calculator Print result calls print');
    ok(await pages(r.p, 'ml-printing') === 1, 'calculator result prints on 1 page');
    ok(/toolkit\/cycle-time\/\?s=fn-data/.test(await r.p.locator('#ml-print .mlp-url').innerText()), 'printout links back to the tool with the tag');
    ok(await r.p.locator('#ml-print .mlp-qr').count() === 1, 'printout has a QR code');
    ok(await r.p.locator('#checklist a[href^="/toolkit/machine-data/"]').count() === 1, 'article checklist leads to the printable sheet');
    r = await open(c, '/toolkit/step-timer/'); await stub(r.p);
    await r.p.click('.st-start'); await r.p.waitForTimeout(200); await r.p.click('.st-next'); await r.p.waitForTimeout(200); await r.p.click('.st-finish');
    await r.p.click('.st-print');
    ok(await pages(r.p, 'ml-printing') === 1, 'step timer result prints on 1 page');
    r = await open(c, '/toolkit/machine-data/'); await stub(r.p);
    for (const [i, m] of ['M1', 'M2', 'M3'].entries()) { if (i > 1) await r.p.click('.ms-add'); await r.p.locator('.ms-m').nth(i).fill(m); }
    await r.p.locator('#ms-org').fill('Line 2');
    await r.p.click('.ms-tick[data-k="hist|0"]');
    await r.p.click('.ms-print[data-what="check"]');
    ok(await pages(r.p, 'ms-printing') === 1, 'machine checklist prints on 1 page');
    ok(/Line 2/.test(await r.p.locator('#ms-print').innerText()), 'company printed on the sheet');
    await r.p.click('.ms-print[data-what="log"]');
    ok(await pages(r.p, 'ms-printing') === 3, 'shift logs print one page per machine');
    await r.p.click('[data-shifts="3"]'); await r.p.click('[data-days="7"]'); await r.p.click('.ms-print[data-what="log"]');
    ok(await pages(r.p, 'ms-printing') === 3, 'shift logs with 3 shifts, 7 days still one page per machine');
    r = await open(c, '/toolkit/machine-data/');
    ok(await r.p.locator('.ms-m').nth(2).inputValue() === 'M3' && await r.p.locator('.ms-tick[data-k="hist|0"]').getAttribute('aria-pressed') === 'true', 'checklist remembers machines and ticks');
    r = await open(c, '/toolkit/step-timer/sheet/');
    await r.p.locator('#spTask').fill('Pack one order'); await r.p.locator('#spSteps').fill('Pick\nPack\nLabel');
    ok((await r.p.locator('.sheet td.what').first().innerText()) === 'Pick' && /Line 2/.test(await r.p.locator('#shOrg').innerText()), 'paper sheet takes task, steps and company');
    ok(await pages(r.p) === 1, 'paper sheet prints on 1 page');
    ok(r.errs.length === 0, 'print errors ' + r.errs);
    await c.close();
  }

  // 10. The checklist in the article matches the printable checklist, item for item
  {
    const c = await ctx(browser);
    const a = await open(c, '/notes/your-machines-already-know.html');
    const art = await a.p.$$eval('#checklist .checklist li', l => l.map(x => x.textContent.trim()));
    const t = await open(c, '/toolkit/machine-data/');
    const tool = await t.p.evaluate(() => window.mlMachineItems.flatMap(g => g.items.map(i => i.t)));
    ok(JSON.stringify(art) === JSON.stringify(tool), 'article checklist = toolkit checklist');
    const groups = await a.p.$$eval('#checklist .checklist .grp', l => l.map(x => x.textContent.trim()));
    ok(JSON.stringify(groups) === JSON.stringify(await t.p.evaluate(() => window.mlMachineItems.map(g => g.g))), 'checklist groups match');
    ok(!/USB|clamp|cabinet|ERP/i.test(art.join(' ')), 'checklist steps need no IT and open nothing');
    // YOU GET links go to their part of each note
    for (const path of ['/notes/your-machines-already-know.html', '/notes/doing-it-by-hand.html']) {
      const { p } = await open(c, path);
      const ids = await p.$$eval('.title-block .tb-v a[href^="#"]', l => l.map(x => x.getAttribute('href').slice(1)));
      ok(ids.length >= 2 && (await p.evaluate(ids => ids.every(i => document.getElementById(i)), ids)), `${path} You get links ${ids}`);
      ok(await p.locator('.keep .keep-stamp').count() >= 1, `${path} tools sit in a Yours to keep frame`);
    }
    await c.close();
  }

  // 11. Kept tools keep Patryk's version: address, keep links, and a reopened tool on the same device
  {
    const c = await ctx(browser);
    let r = await open(c, '/?s=pc-mail-data');
    r = await open(c, '/toolkit/cycle-time/', r.p);
    ok(/[?&]s=pc-mail-data/.test(await r.p.evaluate(() => location.search)), 'toolkit page puts the tag in its address for bookmarks');
    r = await open(c, '/notes/doing-it-by-hand.html', r.p);
    ok(/\?s=pc-mail-data/.test(await r.p.locator('#step-timer .tool-own a').getAttribute('href')), 'keep link carries the tag');
    const fresh = await open(c, '/toolkit/step-timer/');   // a new tab: like a home screen icon
    ok(await fresh.p.evaluate(() => document.documentElement.classList.contains('pc')) && /patryk@/.test(await fresh.p.locator('footer').innerText()), 'reopened tool keeps Patryk version');
    ok((await startTags(fresh.p)).every(x => x === 'pc-mail-data'), 'reopened tool offer links keep the tag');
    const home = await open(c, '/');                      // the rest of the site keeps the tab-only rule
    ok(!(await home.p.evaluate(() => document.documentElement.classList.contains('pc'))), 'new tab outside the toolkit is not Patryk mode');
    await c.close();
    const c2 = await ctx(browser);
    r = await open(c2, '/toolkit/cycle-time/');
    ok(!/[?&]s=/.test(await r.p.evaluate(() => location.search)), 'no tag: toolkit address unchanged');
    await c2.close();
  }


  // 12. File anonymiser: nothing leaves the browser, same stand-ins across files, leak check, Excel kept, key reused
  {
    const c = await ctx(browser);
    const { p, errs } = await open(c, '/toolkit/anonymise/');
    const xlsx = Buffer.from(await p.evaluate(async () => {
      const wb = new ExcelJS.Workbook(); wb.creator = 'Jane Boss';
      const ws = wb.addWorksheet('Customers');
      ws.addRow(['Customer list']); ws.addRow(['Customer', 'Postcode', 'Phone', 'Joined']);
      ws.addRow(['Acme Ltd', 'SN1 4AB', '07700 900123', new Date(Date.UTC(2026, 9, 12))]);
      ws.addRow(['Bolt & Co', 'OX2 6GG', '07700 900456', new Date(Date.UTC(2026, 8, 1))]);
      ws.getCell('A3').note = 'Ask John';
      let s = ''; new Uint8Array(await wb.xlsx.writeBuffer()).forEach(x => s += String.fromCharCode(x)); return btoa(s);
    }), 'base64');
    const csv = '﻿Order No,Customer,Email,Order Date,Unit Price,Qty,Notes,Rep\r\n' +
      'SO-48213,Acme Ltd,buyer@acme.co.uk,12/10/2026,"£1,250.00",3,Call Acme Ltd first,Tom\r\n' +
      'SO-48214,Bolt & Co,ann@bolt.com,13/10/2026,£80.50,10,,Tom\r\n' +
      'SO-48215,Acme Ltd,buyer@acme.co.uk,14/10/2026,£100.00,1,ok,Ann\r\n';
    // Suggestions for typical ERP export headers (camelCase, quantities, descriptions with numbers in them)
    const sug = await p.evaluate(() => [['PartDescription', 'Puzzle 12 pieces'], ['OrderQty', '3'], ['ShipToAddress', '12 High St'], ['Postcode', 'SN1 4AB'], ['Phone', '07700 900123'], ['Comments', 'Ring first']]
      .map(([h, v]) => { const k = window.mlAnon.kindOf(v, 'dmy'); return window.mlAnon.suggest(h, { top: k, share: 1, distinct: 9, avgLen: 9 })[0]; }).join(','));
    ok(sug === 'name,keep,name,code,code,clear', 'suggestions for ERP headers ' + sug);
    ok(await p.evaluate(() => window.mlAnon.labelFrom('ShipToAddress')) === 'Ship to address', 'stand-in label from a camelCase header');
    let reqs = 0; p.on('request', () => reqs++);
    await p.setInputFiles('.an-file', [{ name: 'orders.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) }, { name: 'customers.xlsx', mimeType: 'application/octet-stream', buffer: xlsx }]);
    await p.waitForSelector('.an-tb');
    const acts = await p.$$eval('.an-sel[data-act^="0|"]', l => l.map(s => s.value));
    ok(acts.join(',') === 'code,name,email,keep,scale,keep,clear,name', 'anonymiser suggestions ' + acts);
    await p.locator('input[data-hdr="1"]').fill('2'); await p.locator('input[data-hdr="1"]').dispatchEvent('change');
    const xacts = await p.$$eval('.an-sel[data-act^="1|"]', l => l.map(s => s.value));
    ok(xacts.join(',') === 'name,code,code,keep', 'anonymiser Excel suggestions after header row 2 ' + xacts);
    await p.selectOption('.an-sel[data-act="0|6"]', 'keep');     // keep the notes, so the check has something to find
    await p.selectOption('.an-sel[data-act="0|3"]', 'date');
    await p.selectOption('.an-sel[data-act="0|7"]', 'remove');
    await p.click('.an-run'); await p.waitForSelector('.an-check');
    ok(await p.locator('.an-check-bad').count() === 1 && /Call Acme Ltd first/.test(await p.locator('.an-hits').innerText()), 'leak check finds a real name in a kept column');
    await p.click('.an-fix');
    ok(await p.locator('.an-check-ok').count() === 1, 'leak check clear after swapping there too');
    const dl = async sel => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(sel)]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
    const a = await dl('[data-save="0"]'), x = await dl('[data-save="1"]'), k = await dl('.an-keybtn'), n = await dl('.an-note');
    const out = a.buf.toString('utf8'), lines = out.replace(/^﻿/, '').trim().split('\r\n');
    ok(a.name === 'orders-anon.csv' && out.charCodeAt(0) === 0xfeff, 'CSV saved with its BOM and -anon name');
    ok(!/Acme|Bolt|acme\.co|bolt\.com|SO-482|Tom|Ann\b/.test(out), 'CSV holds no real values');
    ok(lines[0] === 'Order No,Customer,Email,Order Date,Unit Price,Qty,Notes', 'CSV header kept, removed column gone: ' + lines[0]);
    const rows = lines.slice(1).map(l => window_parse(l));
    ok(rows[0][1] === rows[2][1] && rows[0][1] !== rows[1][1] && /^Customer \d{3}$/.test(rows[0][1]), 'same customer, same stand-in');
    ok(rows[2][6] === 'ok' && rows[0][6] === 'Call ' + rows[0][1] + ' first', 'name swapped inside the kept note');
    ok(/^[A-Z]{2}-\d{5}$/.test(rows[0][0]) && rows[0][0] !== 'SO-48213', 'code keeps its pattern');
    const dd = s => { const [d, m, y] = s.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
    const shift = (dd('12/10/2026') - dd(rows[0][3])) / 864e5;
    ok(shift > 0 && shift % 7 === 0 && (dd('13/10/2026') - dd(rows[1][3])) / 864e5 === shift, 'dates move by whole weeks ' + shift);
    const f1 = Number(rows[0][4].replace(/[£,]/g, '')) / 1250, f3 = Number(rows[2][4].replace(/[£,]/g, '')) / 100;
    ok(Math.abs(f1 - f3) < 0.001 && Math.abs(f1 - 1) > 0.1 && rows[2][5] === '1', 'prices scaled by one factor, qty kept');
    const xr = await p.evaluate(async b64 => {
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.buffer); const ws = wb.worksheets[0];
      return { creator: wb.creator, a1: ws.getCell('A1').value, a2: ws.getCell('A2').value, b2: ws.getCell('B2').value, c2: ws.getCell('C2').value, d2: ws.getCell('D2').value instanceof Date, note: ws.getCell('A2').note || '' };
    }, x.buf.toString('base64'));
    ok(xr.a1 === 'Customer' && xr.a2 === rows[0][1], 'Excel: title row gone, same stand-in as the CSV');
    ok(/^[A-Z]{2}\d \d[A-Z]{2}$/.test(xr.b2) && xr.b2 !== 'SN1 4AB' && /^07\d{3} \d{6}$/.test(xr.c2) && xr.c2 !== '07700 900123', 'Excel: postcode and phone keep their pattern ' + xr.b2 + ' ' + xr.c2);
    ok(xr.d2 && !/Jane/.test(xr.creator || '') && !xr.note, 'Excel: dates stay dates, author and notes cleared');
    const key = k.buf.toString('utf8');
    ok(/^﻿meshlock-anonymiser-key/.test(key) && /Acme Ltd,Customer \d{3}/.test(key) && /date-shift-weeks/.test(key), 'key lists real values and settings');
    ok(!/Acme|Bolt|Tom/.test(n.buf.toString()) && /Rep: removed/.test(n.buf.toString()), 'note for the recipient has no real values');
    ok(reqs === 0, 'anonymiser made no requests after the page loaded: ' + reqs);
    ok(errs.length === 0, 'anonymiser errors ' + errs);
    // A later run with the key: the same customer gets the same stand-in again
    await p.click('.an-reset');
    await p.setInputFiles('.an-file', [{ name: 'anonymiser-key-keep-private.csv', mimeType: 'text/csv', buffer: k.buf }, { name: 'more.csv', mimeType: 'text/csv', buffer: Buffer.from('Customer,Qty\nBolt & Co,4\nNew Firm,2\n') }]);
    await p.waitForSelector('.an-tb'); await p.click('.an-run'); await p.waitForSelector('.an-check');
    const m = (await dl('[data-save="0"]')).buf.toString('utf8').trim().split('\n');
    ok(m[1].split(',')[0] === rows[1][1] && m[2].split(',')[0] !== rows[1][1] && /^Customer \d{3}$/.test(m[2].split(',')[0]), 'key reused: same stand-in next time, new value gets a new one');
    await c.close();
  }

  // 8. /tests/ is never published: the Netlify rule answers 404 for it
  {
    const rules = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split('\n').map(l => l.trim().split(/\s+/));
    ok(rules.some(r => r[0] === '/tests/*' && r[2] === '404!'), '_redirects hides /tests/*');
    ok(rules.some(r => r[0] === '/tests' && r[2] === '404!'), '_redirects hides /tests');
  }

  await browser.close();
  server.close();
  console.log('Screenshots: ' + SHOTS);
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
