/* Meshlock visit counts · GoatCounter (meshlock.goatcounter.com)
   No cookies, no personal data, nothing from the offer link after # is ever sent.
   Counts only on meshlock.co.uk, so previews and local tests stay out of the numbers.
   Pages call mlTrack('offer/result/kp') for named steps. Calls made before the counter
   has loaded wait in window.mlq.
   Counting only: the source tag and Patryk's version live in assets/site.js, so blocking
   this file stops the counting and nothing else. */
(function(){
  var q = window.mlq = window.mlq || [];
  var live = location.hostname === 'meshlock.co.uk';
  var tag = (new URLSearchParams(location.search).get('s') || '').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20);

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
