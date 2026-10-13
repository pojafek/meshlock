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
const PAGES = ['/', '/tools/', '/prices/', '/notes/', '/notes/doing-it-by-hand.html', '/notes/your-machines-already-know.html', '/notes/five-gates.html',
  '/toolkit/', '/toolkit/cycle-time/', '/toolkit/step-timer/', '/toolkit/worth-automating/', '/toolkit/machine-data/', '/toolkit/step-timer/sheet/', '/thanks.html', '/start/'];
const FOOTER_PAGES = PAGES.filter(p => p !== '/start/');
const TK = { '/toolkit/': 'tk-index', '/toolkit/cycle-time/': 'tk-cycle', '/toolkit/step-timer/': 'tk-timer', '/toolkit/worth-automating/': 'tk-automating', '/toolkit/machine-data/': 'tk-machine', '/toolkit/step-timer/sheet/': 'tk-timer' };
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
    ok(await cards.count() === 4, 'four cards');
    const tags = await p.locator('.tk-card .tk-tag').allInnerTexts();
    ok(tags.join(',') === 'CALCULATOR,CHECKLIST,TIMER,CHECK', 'card type tags ' + tags);
    ok(!/TOOL \d/.test(await visibleText(p)), 'no tool numbers on the cards');
    ok(await p.locator('.tk-card a.tk-paper[href="/toolkit/step-timer/sheet/"]').count() === 1, 'step timer card links its paper sheet');
    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      ok(await card.locator('.tk-q').count() === 1 && await card.locator('.tk-time').count() === 1 && await card.locator('.tk-use').count() === 1, `card ${i} question + time + use it when`);
      ok((await card.locator('.tk-note').innerText()).startsWith('From the note:'), `card ${i} From the note`);
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
    ok((await visibleText(n.p)).includes('taught us'), 'notes speak in the Meshlock voice for everyone');
    for (const path of ['/notes/doing-it-by-hand.html', '/notes/your-machines-already-know.html', '/notes/five-gates.html']) {
      const q = await open(c, path); const tx = (await q.p.locator('.article-body, .article-header').allInnerTexts()).join(' ');
      ok(!/\b(I|I'm|I've|my)\b/.test(tx.replace(/"[^"]*"|“[^”]*”/g, '').replace(/I measured it/g, '')), `${path} has no first person for any visitor (reader quotes and buttons aside)`); await q.p.close();
    }
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
    for (const q of await r.p.locator('.wa-q[data-q]').all()) await q.locator('.wa-opt').first().click();
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
    for (const path of ['/notes/your-machines-already-know.html', '/notes/doing-it-by-hand.html', '/notes/five-gates.html']) {
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

  // 14. Worth automating? v2: five results in the right order, gates, next steps, saved link, step timer hand-off, entry points
  {
    const c = await ctx(browser, { w: 390, reduce: true });
    let r = await open(c, '/toolkit/worth-automating/');
    const V = a => r.p.evaluate(a => window.mlWorthVerdict(a).v, a);
    const base = { kind: 'sort', freq: 'daily', hrs: 'c', same: 'mostly', rules: 'partly', digital: 'yes', trust: 'yes', errors: 'sometimes', person: 'yes' };
    ok(await V({ ...base, same: 'yes', rules: 'rules' }) === 'automate', 'two hours a day, one expert: automate (one person never blocks a tool)');
    ok(await V({ ...base, kind: 'export', freq: 'weekly', hrs: 'a0', same: 'yes', rules: 'rules', errors: 'rarely', person: 'no' }) === 'leave', '15 minutes a week: leave it');
    ok(await V({ ...base, kind: 'pick', freq: 'daily', hrs: 'b', trust: 'no' }) === 'data', 'stock in the wrong place: fix the data first');
    ok(await V({ ...base, kind: 'wrong', digital: 'paper', same: 'yes', rules: 'rules', errors: 'often' }) === 'paper', 'inspection on paper: get it off paper first');
    ok(await V({ ...base, same: 'no' }) === 'steps', 'everyone does it differently: write the steps down first');
    ok(await V({ ...base, rules: 'judgement' }) === 'leave', 'judgement each time: leave it');
    ok(await V({ ...base, hrs: 'a0', errors: 'often', same: 'yes', rules: 'rules' }) === 'automate', 'small but mistakes reach the customer: stays in the check');
    const pick = async (k, v) => r.p.click(`.wa-q[data-q="${k}"] .wa-opt[data-v="${v}"]`);
    await r.p.fill('.wa-in', 'Sorting job sheets');
    for (const [k, v] of Object.entries({ kind: 'pick', freq: 'daily', hrs: 'b', same: 'yes', rules: 'rules', digital: 'yes', trust: 'no', errors: 'often', person: 'yes' })) await pick(k, v);
    ok(/FIX THE DATA FIRST/.test(await r.p.locator('.wa-stamp').innerText()), 'data result shows its stamp');
    ok(await r.p.locator('.wa-g.pass').count() === 1 && await r.p.locator('.wa-g.stop[data-g="data"]').count() === 1 && await r.p.locator('.wa-g.off').count() === 3, 'gates: passed, stopped at data, rest not reached');
    ok(/Stock in the system/.test(await r.p.locator('.wa-cases').innerText()) && await r.p.locator('.wa-first .wa-w').count() === 3, 'data result has cases and first steps');
    ok(await r.p.locator('.wa-next a[href="/#contact"]').count() === 1 && await r.p.locator('.wa-go').count() === 0, 'data result leads to a call, not straight to a price');
    ok(/Only one person/.test(await r.p.locator('.wa-also').innerText()), 'also worth knowing lists the one-person risk');
    ok(/Already in place: worth the time/.test(await r.p.locator('.wa-also').innerText()), 'a fix-first result also says what is already in place');
    ok(/Task: Sorting job sheets/.test(await r.p.locator('.wa-task').innerText()), 'task name on the result');
    const h = await r.p.evaluate(() => location.hash);
    ok(/wa=pick\.daily\.b\.yes\.rules\.yes\.no\.often\.yes/.test(h) && /t=Sorting/.test(h), 'answers kept in the link ' + h);
    const again = await open(c, '/toolkit/worth-automating/' + h);
    ok(/FIX THE DATA FIRST/.test(await again.p.locator('.wa-stamp').innerText()) && await again.p.inputValue('.wa-in') === 'Sorting job sheets', 'saved link reopens the same result');
    await pick('trust', 'yes');
    ok(/^AUTOMATE$/.test(await r.p.locator('.wa-stamp').innerText()) && /\/start\/\?s=tk-automating#f=pick\.b$/.test(await r.p.locator('.wa-go').getAttribute('href')), 'automate leads to the offer with the right problem and hours');
    ok(await r.p.locator('.wa-g.go').count() === 1 && await r.p.locator('.wa-g.pass').count() === 4, 'automate passes all four gates');
    await pick('digital', 'paper');
    ok(/\/start\/.*#f=pick\.b$/.test(await r.p.locator('.wa-go').getAttribute('href')) && await r.p.locator('.wa-next a[href="/#contact"]').count() === 1, 'paper result offers to price the first step and a call');
    await pick('hrs', 'a0'); await pick('errors', 'rarely');
    ok(/LEAVE IT/.test(await r.p.locator('.wa-stamp').innerText()) && /under 25 hours a year/.test(await r.p.locator('.wa-hours').innerText()) && await r.p.locator('.wa-go').count() === 0, 'leave it shows the hours a year and no offer');
    await r.p.click('.wa-reset');
    ok(await r.p.locator('.wa-verdict').isHidden() && await r.p.inputValue('.wa-in') === '', 'check another task clears everything');
    const t = await visibleText(r.p);
    ok(!/—|–| - /.test(t) && !/\b(I|I'm|me|my)\b/.test(t.replace(/Back to top/, '')), 'check page: no dashes, no first person');
    ok(r.errs.length === 0 && again.errs.length === 0, 'check errors ' + r.errs + again.errs);
    // From the step timer: frequency and hours arrive pre-answered
    const st = await open(c, '/toolkit/worth-automating/#freq=daily&hrs=c');
    ok(await st.p.locator('.wa-q[data-q="freq"] .wa-opt[data-v="daily"]').getAttribute('aria-checked') === 'true' && await st.p.locator('.wa-q[data-q="hrs"] .wa-opt[data-v="c"]').getAttribute('aria-checked') === 'true', 'step timer link pre-answers frequency and hours');
    // Entry points
    const home = await open(c, '/');
    ok(await home.p.locator('#familiar .fam-check a[href="/toolkit/worth-automating/"]').count() === 1, 'homepage Start here links the check');
    const off = await open(c, '/start/');
    ok(await off.p.locator('#s1 .wa-hint a[href="/toolkit/worth-automating/"]').count() === 1, 'offer step 1 links the check');
    await c.close();
  }

  // 15. Gates guide: animation states, the check inside, fn-gates tags, Patryk version
  {
    const c = await ctx(browser, { w: 390 });
    const { p, errs } = await open(c, '/notes/five-gates.html');
    ok((await startTags(p)).every(t => t === 'fn-gates'), 'gates guide offer links carry fn-gates');
    // Each step: render near its end, when the task has arrived and the caption is showing
    const step = i => p.evaluate(i => { const T = window.mlGatesSteps; window.mlGatesRender((T[i + 1] || T[i] + 5) - 0.05); return { stamp: document.getElementById('gStamp').textContent, marks: [...document.querySelectorAll('#gGates g')].map(g => g.querySelector('text').textContent).join(''), cap: document.getElementById('gTxt').textContent }; }, i);
    let s1 = await step(0); ok(s1.marks === '✓' && /Passes/.test(s1.cap), 'animation: job sheets pass gate 1 ' + JSON.stringify(s1));
    s1 = await step(4); ok(s1.stamp === 'AUTOMATE' && s1.marks === '✓✓✓✓✓', 'animation: job sheets pass every gate ' + JSON.stringify(s1));
    s1 = await step(6); ok(s1.stamp === 'LEAVE IT' && s1.marks === '!', 'animation: the small task stops at gate 1 ' + JSON.stringify(s1));
    s1 = await step(9); ok(s1.stamp === 'DATA WRONG' && s1.marks === '✓!', 'animation: picking stops at gate 2 ' + JSON.stringify(s1));
    s1 = await step(14); ok(s1.stamp === 'AUTOMATE' && s1.marks === '✓✓✓✓✓', 'animation: after the data fix picking passes every gate ' + JSON.stringify(s1));
    // Words match the picture: every caption is shown with one gate state only, and the task never skips a gate
    const sync = await p.evaluate(() => {
      const seen = {}, bad = [], T = window.mlGatesSteps, end = T[T.length - 1] + 5;
      for (let t = 0; t < end; t += 0.05) {
        window.mlGatesRender(t);
        const cap = document.getElementById('gTxt').textContent, marks = [...document.querySelectorAll('#gGates g')].map(g => g.querySelector('text').textContent).join('');
        if (!cap) continue;
        if (seen[cap] === undefined) seen[cap] = marks; else if (seen[cap] !== marks) bad.push(cap.slice(0, 30) + ' ' + seen[cap] + '/' + marks);
      }
      return { bad: [...new Set(bad)], states: Object.values(seen) };
    });
    ok(sync.bad.length === 0, 'animation: caption changes with the gates, never before ' + sync.bad);
    ok(['✓', '✓!', '✓✓', '✓✓✓', '✓✓✓✓', '✓✓✓✓✓'].every(m => sync.states.includes(m)), 'animation: picking passes On screen? and One way? one at a time ' + sync.states);
    const gaps = await p.evaluate(() => window.mlGatesSteps.slice(1).map((t, i) => t - window.mlGatesSteps[i]));
    ok(gaps.filter(g => g > 2).every(g => g >= 3.99), 'every caption stays at least 4 seconds ' + gaps);
    ok(await p.locator('.gate .gr-pass').count() === 4 && await p.locator('.gate .gr-stop').count() === 4, 'each of the first four gates says when it passes and when it stops');
    ok(await p.locator('.gate').count() === 5 && await p.locator('#worth-automating [data-tool="worth-automating"] .wa').count() === 1, 'five gate cards and the check inside the note');
    ok(await p.locator('.gate a[href="/tools/#job-travellers"]').count() === 1, 'the real case links its case file');
    const t = await visibleText(p);
    ok(!/—|–| - /.test(t), 'gates guide has no dashes');
    ok(errs.length === 0, 'gates guide errors ' + errs);
    await c.close();
    const c2 = await ctx(browser, { reduce: true });
    const r = await open(c2, '/notes/five-gates.html?s=pc');
    ok(/AUTOMATE/.test(await r.p.locator('#gStamp').innerText()), 'reduced motion shows the end frame');
    const tp = await visibleText(r.p);
    ok(!/\b(I|I'm|I've|me|my)\b/.test(tp.replace(/Back to top/, '')) && /What we do with it/.test(tp), 'pc: gates guide has no first person');
    ok(await r.p.locator('.to-check').count() === 1, 'a bridge leads from the gates to the check');
    await c2.close();
  }

  // 16. One name per thing, and a calmer homepage
  {
    const c = await ctx(browser, { w: 390 });
    const NEVER = /Book a call\b|Put your numbers on it|one-day review|Here for the long run|Talk it through|Don't want to write|one-minute check/i;
    for (const path of PAGES) {
      const { p } = await open(c, path);
      const t = await visibleText(p);
      const m = t.match(NEVER);
      ok(!m, `${path} uses an old name: ${m && m[0]}`);
      if (await p.locator('nav .nav-cta').count()) ok((await p.locator('nav .nav-cta').innerText()).trim().toUpperCase() === 'BOOK A FREE CALL', `${path} nav says Book a free call`);
      await p.close();
    }
    const { p } = await open(c, '/');
    ok(await p.locator('#familiar .sym[aria-pressed="true"]').count() === 0, 'nothing is pre-ticked on the homepage');
    ok(await p.locator('#fix-list').evaluate(e => e.classList.contains('empty')), 'fix list starts empty');
    const offerLinks = await p.evaluate(() => [...document.querySelectorAll('main a[href^="/start/"], section a[href^="/start/"], .hero a[href^="/start/"]')].filter(a => !a.closest('footer') && a.offsetParent !== null).length);
    await p.click('#familiar .sym[data-fix="sort"]');
    ok(/\/start\/.*#f=sort$/.test(await p.locator('#fix-offer').getAttribute('href')) && /Get your one-page offer/i.test(await p.locator('#fix-offer').innerText()), 'ticking a tile leads to the offer with it ticked');
    ok(offerLinks <= 2, 'the homepage shows the offer link at most twice before ticking (' + offerLinks + ')');
    await c.close();
  }

  // 17. Calm homepage: one question per section, Who's behind this opens on request, short on a phone
  {
    const c = await ctx(browser, { w: 390 });
    const { p, errs } = await open(c, '/');
    const order = await p.evaluate(() => [...document.querySelectorAll('body > section')].map(s => s.id || s.className));
    ok(order.join(',') === 'hero,tools,how,about,familiar,promise,contact', 'homepage order ' + order);
    ok(await p.locator('.hero .btn-primary').count() === 1 && await p.locator('.hero a.btn-ghost[href="#familiar"]').count() === 1, 'hero: one main action and a quiet Start here link');
    ok(await p.locator('.hero-note, .callout, .dim-divider').count() === 0, 'no repeated lines, dividers or callout boxes');
    const hb = await p.evaluate(() => [document.querySelector('.hero h1').getBoundingClientRect().top, document.querySelector('.hero-lockup').getBoundingClientRect().top]);
    ok(hb[0] < hb[1] && hb[0] < 844 / 2, 'phone: the words come before the lockup ' + hb);
    ok((await p.locator('#familiar h2').innerText()).trim() === 'What slows you down?' && await p.locator('#familiar h2').count() === 1, 'Start here asks one question');
    ok(await p.locator('#familiar .fam-ways a[href="#contact"]').count() === 1, 'Start here offers a line in your own words');
    ok(/A free 30-minute call/.test(await p.locator('.next-steps').innerText()), 'what happens next says the call is free');
    ok(/ticks are already in/.test(await p.locator('.fix-offer').textContent()), 'the offer link says the ticks carry over');
    ok(!(await p.locator('#fix-list').isVisible()), 'phone: the empty fix list stays out of the way');
    ok(!/on the left/.test(await p.locator('.fix-empty').textContent()), 'fix list hint has no left or right');
    // Who's behind this: face, name and one line on top, the rest closed
    ok(await p.locator('#about .who .person-photo').isVisible() && /Kamil Pojawa/.test(await p.locator('#about .who-name').innerText()), 'About shows the face and the name');
    ok(!(await p.locator('#about-more').evaluate(d => d.open)) && !(await p.locator('#about .gears-wrap').isVisible()), 'About details start closed');
    await p.click('#about-more > summary');
    ok(await p.locator('#about .gears-wrap').isVisible() && await p.locator('#about .creds').isVisible(), 'More about Kamil opens the rig and the bio');
    await p.click('#about-more > summary');
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    ok(H <= 6400, 'phone: homepage is about seven screens (' + H + 'px)');
    const words = (await visibleText(p)).split(/\s+/).length;
    ok(words <= 650, 'homepage words ' + words);
    await p.click('nav a[href="/#about"]'); await p.waitForTimeout(200);
    ok(await p.locator('#about-more').evaluate(d => d.open), 'nav About opens the details');
    const q = await c.newPage(); await q.goto(BASE + '/tools/'); await q.goto(BASE + '/#about');
    ok(await q.locator('#about-more').evaluate(d => d.open), '/#about from another page opens the details');
    ok(errs.length === 0, 'homepage errors ' + errs);
    await c.close();
    const c2 = await ctx(browser, { w: 390 });
    const r = await open(c2, '/?s=pc');
    ok(!(await r.p.locator('#about').isVisible()) && /our job/.test(await r.p.locator('.fam-calm').innerText()), 'pc: About hidden, calm line in the Meshlock voice');
    await c2.close();
  }

  // 18. Tools in action, calmer: three short lines per case, the full story behind a tap, the price note once
  {
    const c = await ctx(browser, { w: 390 });
    const { p, errs } = await open(c, '/tools/');
    const cases = p.locator('.tool-case');
    ok(await cases.count() === 5, 'five case files');
    for (let i = 0; i < 5; i++) {
      const k = cases.nth(i);
      const labels = (await k.locator('.tc-fields .field b').allInnerTexts()).map(x => x.trim().toUpperCase()).join(',');
      ok(labels === 'BEFORE,THE TOOL,RESULT', `case ${i} labels ${labels}`);
      ok(await k.locator('details.tc-more').count() === 1 && !(await k.locator('details.tc-more').evaluate(d => d.open)), `case ${i} full story starts closed`);
      ok(/A tool like this: about £[\d,]+\.?$/.test((await k.locator('.tc-price').innerText()).trim()), `case ${i} price line is short`);
    }
    const t = await visibleText(p);
    ok((t.match(/Every quote is built around your own workflow/g) || []).length === 1, 'price note shown once');
    ok(!/DMAIC|Significant|impractical/.test(t), 'more case files in plain words');
    ok(!/—|–| - /.test(t), '/tools/ no dashes');
    ok(t.split(/\s+/).length <= 750, '/tools/ words ' + t.split(/\s+/).length);
    await cases.nth(0).locator('.tc-more > summary').click();
    ok(await cases.nth(0).locator('.tc-more p').first().isVisible(), 'the full story opens');
    ok(errs.length === 0, '/tools/ errors ' + errs);
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
