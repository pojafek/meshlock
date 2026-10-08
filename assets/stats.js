/* Meshlock visit counts · GoatCounter (meshlock.goatcounter.com)
   No cookies, no personal data, nothing from the offer link after # is ever sent.
   Counts only on meshlock.co.uk, so previews and local tests stay out of the numbers.
   Pages call mlTrack('offer/result/kp') for named steps. Calls made before the counter
   has loaded wait in window.mlq.
   The source tag (?s=) is kept for the browser tab on every host, and every link to
   /start/ carries it, so the offer opens in the right person's version. */
(function(){
  var q = window.mlq = window.mlq || [];
  var live = location.hostname === 'meshlock.co.uk';

  // Source tag from the link this page was opened with, kept for the tab in 'ml-src'
  var tag = (new URLSearchParams(location.search).get('s') || '').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20);
  var kept = tag;
  try { if (tag) sessionStorage.setItem('ml-src', tag); else kept = sessionStorage.getItem('ml-src') || ''; } catch(e){}

  // The visitor's tag beats a tag written in a page link (fn-data stays the fallback).
  // Only the part before # changes; the offer answers after # are never touched.
  function retag(a){
    var href = a.getAttribute('href');
    if (!kept || !href) return;
    var u; try { u = new URL(href, location.href); } catch(e){ return; }
    if (!/^\/start\/(index\.html)?$/.test(u.pathname)) return;
    if (u.origin !== location.origin && u.hostname !== 'meshlock.co.uk' && u.hostname !== 'www.meshlock.co.uk') return;
    var i = href.indexOf('#'), hash = i < 0 ? '' : href.slice(i), head = i < 0 ? href : href.slice(0, i);
    var j = head.indexOf('?'), path = j < 0 ? head : head.slice(0, j);
    var p = new URLSearchParams(j < 0 ? '' : head.slice(j + 1));
    if (p.get('s') === kept) return;
    p.set('s', kept);
    a.setAttribute('href', path + '?' + p.toString() + hash);
  }
  function retagAll(){ document.querySelectorAll('a[href]').forEach(retag); }

  // Tags starting with "pc" are Patryk's: the whole site speaks for him (see CLAUDE.md).
  // data-pc: text · data-pc-href · data-pc-copy · data-pc-value · data-pc-hide · data-pc-show (starts hidden)
  // {tag} in a data-pc text becomes the visitor's tag. With JavaScript off, pages show Kamil's version.
  function pcMode(){
    var each = function(sel, fn){ document.querySelectorAll(sel).forEach(fn); };
    each('[data-pc]', function(e){ e.textContent = e.getAttribute('data-pc').replace(/\{tag\}/g, kept); });
    each('[data-pc-href]', function(e){ e.setAttribute('href', e.getAttribute('data-pc-href')); });
    each('[data-pc-copy]', function(e){ e.setAttribute('data-copy', e.getAttribute('data-pc-copy')); });
    each('[data-pc-value]', function(e){ e.value = e.getAttribute('data-pc-value'); });
    each('[data-pc-hide]', function(e){ e.hidden = true; e.style.setProperty('display', 'none', 'important'); });
    each('[data-pc-show]', function(e){ e.hidden = false; });
    // Opened on a hidden section (/#about): go to the section named in data-pc-goto
    var t = location.hash && document.getElementById(location.hash.slice(1));
    var g = t && t.hasAttribute('data-pc-hide') && document.getElementById(t.getAttribute('data-pc-goto'));
    if (g) g.scrollIntoView();
  }
  if (/^pc/.test(kept)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pcMode); else pcMode();
  }

  if (kept) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', retagAll); else retagAll();
    // Links a page rewrites later (the homepage fix list) are fixed on the way out
    ['click', 'auxclick', 'contextmenu'].forEach(function(t){
      document.addEventListener(t, function(e){ var a = e.target.closest && e.target.closest('a[href]'); if (a) retag(a); }, true);
    });
  }

  function send(name){
    try { window.goatcounter.count({path: name, title: name, event: true}); } catch(e){}
  }
  window.mlTrack = function(name){
    if (!live) return;
    if (window.goatcounter && window.goatcounter.count) send(name); else q.push(name);
  };
  if (!live) { q.length = 0; return; }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://meshlock.goatcounter.com/count');
  document.head.appendChild(s);

  // Any page opened from a tagged link (QR code, LinkedIn message): in/<tag>/<page>
  if (tag) q.push('in/' + tag + location.pathname.replace(/index\.html$/,''));

  var tries = 0;
  (function flush(){
    if (window.goatcounter && window.goatcounter.count) { while (q.length) send(q.shift()); return; }
    if (++tries < 40) setTimeout(flush, 250);
  })();
})();
