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
  '/toolkit/', '/toolkit/cycle-time/', '/toolkit/step-timer/', '/toolkit/worth-automating/', '/toolkit/step-timer/sheet/', '/thanks.html', '/start/'];
const FOOTER_PAGES = PAGES.filter(p => p !== '/start/');
const TK = { '/toolkit/': 'tk-index', '/toolkit/cycle-time/': 'tk-cycle', '/toolkit/step-timer/': 'tk-timer', '/toolkit/worth-automating/': 'tk-automating', '/toolkit/step-timer/sheet/': 'tk-timer' };
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
      if (['/toolkit/', '/notes/', '/toolkit/step-timer/sheet/', '/toolkit/cycle-time/'].includes(path))
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
    ok(await cards.count() === 3, 'three cards');
    const tags = await p.locator('.tk-card .tk-tag').allInnerTexts();
    ok(tags.join(',') === 'CALCULATOR,TIMER,CHECK', 'card type tags ' + tags);
    ok(!/TOOL \d/.test(await visibleText(p)), 'no tool numbers on the cards');
    for (let i = 0; i < 3; i++) {
      const card = cards.nth(i);
      ok(await card.locator('.tk-q').count() === 1 && await card.locator('.tk-time').count() === 1, `card ${i} question + time`);
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
    await p.locator('[data-tool="cycle-time"] [data-k="c"]').fill('43:39');
    await p.locator('[data-tool="cycle-time"] [data-k="n"]').fill('36');
    await btn.click();
    ok(await p.locator('[data-tool="cycle-time"] [data-row="plan"]').isVisible(), 'planned row at 76%');
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
