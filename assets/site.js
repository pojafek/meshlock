/* Meshlock site behaviour · the visitor's source tag (?s=) and Patryk's version of the site.
   Kept apart from assets/stats.js (visit counts), so an ad blocker that stops the counting
   never stops this. Loaded with defer on every page, after the snippet at the top of <head>.
   The tag is kept for the browser tab on every host, every link to /start/ carries it, and a
   tag starting "pc" switches every page to Patryk's version (see CLAUDE.md). */
(function(){
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
  // The snippet at the top of each page's <head> hides data-pc lines (class pc-wait) until they are swapped
  function reveal(){ document.documentElement.classList.remove('pc-wait'); }
  if (/^pc/.test(kept)) {
    document.documentElement.classList.add('pc');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ pcMode(); reveal(); }); else { pcMode(); reveal(); }
  } else reveal();

  if (kept) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', retagAll); else retagAll();
    // Links a page or a toolkit tool adds or rewrites later carry the tag too, as soon as they appear
    if (window.MutationObserver) {
      new MutationObserver(function(list){
        list.forEach(function(m){
          if (m.type === 'attributes') { if (m.target.tagName === 'A') retag(m.target); return; }
          m.addedNodes.forEach(function(n){
            if (n.nodeType !== 1) return;
            if (n.tagName === 'A' && n.hasAttribute('href')) retag(n);
            n.querySelectorAll && n.querySelectorAll('a[href]').forEach(retag);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }
    // And on the way out, in case a link changed in between (the homepage fix list)
    ['click', 'auxclick', 'contextmenu'].forEach(function(t){
      document.addEventListener(t, function(e){ var a = e.target.closest && e.target.closest('a[href]'); if (a) retag(a); }, true);
    });
  }
})();
