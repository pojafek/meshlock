/* Print helper · Meshlock toolkit
   One way to print anything from a tool, on any page: only that part prints, on clean pages,
   with a Meshlock header (tool name, company or department, date) and a footer that leads back to
   the tool page with the visitor's tag (so Patryk's clients scanning a printout get his version).
   Used by the cycle time calculator, the step timer and the paper sheets in /toolkit/.

   window.mlPrint({ title, tool, fallback, html | node, mode })
     title     what is printed, e.g. "Cycle time calculator"
     tool      the tool page path, e.g. "/toolkit/cycle-time/" (printed with ?s=<tag> and as a QR code)
     fallback  the page's fallback tag (tk-<name>), used only when no tag is stored for this tab
     html/node what to print (a node is cloned)
   window.mlPrint.org() / .org(value)   company or department printed on every sheet (this device only)
   window.mlPrint.tag(fallback)         the visitor's tag, else the fallback
   window.mlPrint.foot(tool, fallback)  the footer HTML (tool link, QR code, contact) for sheet pages
   Pages with their own print layout (the paper sheets) only use org(), tag() and foot().

   Hidden elements are removed from the layout (display:none), never just made invisible, so the
   rest of the page can't turn into blank printed pages. Nothing here is sent anywhere. */
(function(){
  'use strict';
  var ORG = 'ml-org';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clean(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20); }
  function tag(fallback){
    var t = '';
    try { t = clean(new URLSearchParams(location.search).get('s')) || clean(sessionStorage.getItem('ml-src')); } catch(e){}
    return t || clean(fallback);
  }
  function pc(){ return document.documentElement.classList.contains('pc'); }
  function org(v){
    try {
      if (v === undefined) return localStorage.getItem(ORG) || '';
      v = String(v).trim().slice(0, 60);
      if (v) localStorage.setItem(ORG, v); else localStorage.removeItem(ORG);
    } catch(e){}
    return v || '';
  }
  function today(){ try { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e){ return ''; } }
  function qr(url){
    if (typeof window.qrcode !== 'function') return '';
    try {
      var q = window.qrcode(0, 'M'); q.addData(url); q.make();
      var n = q.getModuleCount(), d = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
      return '<svg class="mlp-qr" viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" role="img" aria-label="QR code to this tool"><rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/><path d="' + d + '" fill="#171A1D"/></svg>';
    } catch(e){ return ''; }
  }
  function link(tool, fallback){
    var t = tag(fallback);
    return 'meshlock.co.uk' + tool + (t ? '?s=' + t : '');
  }
  function contact(){
    return pc() ? 'Patryk Chojnacki · 07501 839466 · patryk@meshlock.co.uk' : 'hello@meshlock.co.uk';
  }
  function foot(tool, fallback){
    var l = link(tool, fallback);
    return '<div class="mlp-foot">' + qr('https://' + l) +
      '<div class="mlp-ft"><b>Free to keep. Use it again any time:</b><br><span class="mlp-url">' + esc(l) + '</span><br>' +
      'Made with a free Meshlock tool. Nothing typed into it was sent anywhere. · ' + esc(contact()) + '</div></div>';
  }

  var STYLE =
    '#ml-print{display:none;}' +
    '.mlp-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:1.5px solid #171A1D;padding:0 0 8px;margin:0 0 14px;}' +
    '.mlp-head img{display:block;height:18px;width:auto;}' +
    '.mlp-title{font:700 20px/1.2 "Space Grotesk",sans-serif;margin:8px 0 0;color:#171A1D;}' +
    '.mlp-meta{font:400 10.5px/1.5 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#565C58;text-align:right;}' +
    '.mlp-meta b{display:block;font:500 12px/1.4 "IBM Plex Sans",sans-serif;text-transform:none;letter-spacing:0;color:#171A1D;}' +
    '.mlp-foot{display:flex;align-items:center;gap:12px;border-top:1px solid #C9CDC0;margin:16px 0 0;padding:10px 0 0;break-inside:avoid;}' +
    '.mlp-qr{flex:none;width:64px;height:64px;}' +
    '.mlp-ft{font:400 10px/1.5 "IBM Plex Mono",monospace;color:#565C58;}' +
    '.mlp-ft b{font-weight:500;color:#171A1D;}' +
    '.mlp-url{font-size:11px;color:#171A1D;}' +
    '@media print{' +
      'html,body.ml-printing{background:#fff!important;}' +
      'body.ml-printing>*:not(#ml-print){display:none!important;}' +
      'body.ml-printing #ml-print{display:block;color:#171A1D;font-family:"IBM Plex Sans",sans-serif;}' +
      '#ml-print *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '@page{size:A4;margin:12mm;}' +
    '}';
  function style(){
    if (document.getElementById('ml-print-style')) return;
    var s = document.createElement('style'); s.id = 'ml-print-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  function mlPrint(o){
    o = o || {};
    style();
    var box = document.getElementById('ml-print');
    if (!box) { box = document.createElement('div'); box.id = 'ml-print'; document.body.appendChild(box); }
    var o2 = org();
    box.innerHTML = '<div class="mlp-head"><div><img src="/assets/meshlock-wordmark.svg" alt="Meshlock" width="114" height="18"><div class="mlp-title">' + esc(o.title || '') + '</div></div>' +
      '<div class="mlp-meta">' + (o2 ? '<b>' + esc(o2) + '</b>' : '') + 'Printed ' + esc(today()) + '</div></div>' +
      '<div class="mlp-body"></div>' + foot(o.tool || location.pathname, o.fallback);
    var body = box.querySelector('.mlp-body');
    if (o.node) body.appendChild(o.node.cloneNode(true)); else body.innerHTML = o.html || '';
    document.body.classList.add('ml-printing');
    var off = function(){ document.body.classList.remove('ml-printing'); window.removeEventListener('afterprint', off); };
    window.addEventListener('afterprint', off);
    window.print();
    setTimeout(off, 1500);
  }
  // Load the wordmark now, so it is ready the moment a print starts (print does not wait for images)
  try { (new Image()).src = '/assets/meshlock-wordmark.svg'; } catch(e){}
  mlPrint.org = org;
  mlPrint.tag = tag;
  mlPrint.foot = foot;
  mlPrint.esc = esc;
  window.mlPrint = mlPrint;
})();
