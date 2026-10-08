/* Machine data checklist · Meshlock toolkit
   Renders into the element with data-tool="machine-sheet" (/toolkit/machine-data/). Styles:
   assets/toolkit/machine-sheet.css. Printing uses the helpers in assets/toolkit/print.js.
   Two paper sheets, made to be filled in with a pen at the machine:
     - the checklist: where each machine keeps its data, as a grid (rows: what to look at or ask,
       columns: the reader's machines). Tap a box when it's done, n/a when a row doesn't apply.
     - the shift log: one page per machine for one week, counter readings and every stop over 5 minutes.
   Every step can be done by an operator or team leader without IT, tools or opening anything.
   The machine data Field Note shows the same list (its text must match ITEMS, the site check
   compares them).
   Options on the element:
     data-offer-tag   the page's fallback tag, printed in the link back to this page (a stored tag wins)
   Kept on this device only (localStorage 'ml-machine-sheet', company in 'ml-org'). Nothing is sent. */
(function(){
  'use strict';
  var KEY = 'ml-machine-sheet', MAX = 6, TOOL = '/toolkit/machine-data/';
  var RULE = 'Look, don\'t open. Anything behind a cover or panel goes to maintenance. Follow your site\'s rules.';
  var ITEMS = [
    { g: 'Look at the screen', items: [
      { id: 'hist', t: 'Job or program history: is there a page listing past jobs?' },
      { id: 'count', t: 'Counters: parts made, run hours, power-on hours' },
      { id: 'alarm', t: 'Alarm history: which alarms come up most?' } ] },
    { g: 'Write it down, each shift', items: [
      { id: 'read', t: 'Counter readings at the start and end of the shift' },
      { id: 'stops', t: 'Every stop over 5 minutes: when, how long, why' },
      { id: 'photo', t: 'A photo of the history page, where phones are allowed' } ] },
    { g: 'Ask on the floor', items: [
      { id: 'op', t: 'Operators: when does it stop most, and why?', who: 'op' },
      { id: 'sup', t: 'Supplier, on the next service visit: what does the controller log, and for how long?', who: 'sup' } ] },
    { g: 'Keep the sheets', items: [
      { id: 'keep', t: 'One sheet per machine, one week. Keep the sheets together.' } ] }
  ];
  var WHO = [['op', 'Operators'], ['mt', 'Maintenance'], ['sup', 'Machine supplier']];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  window.mlMachineItems = ITEMS;   // for the site check

  function load(){
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.machines)) return s; } catch(e){}
    return null;
  }
  function fresh(){ return { machines: ['', ''], who: {}, na: {}, tick: {}, shifts: 1, days: 5 }; }

  function build(root){
    var P = window.mlPrint || null, esc = P ? P.esc : function(x){ return String(x); };
    var fb = root.getAttribute('data-offer-tag') || '';
    var S = load() || fresh();
    function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
    function named(){ return S.machines.map(function(m){ return m.trim(); }).filter(Boolean); }
    function cols(){ var n = named(); return n.length ? n : ['']; }
    var $ = function(s){ return root.querySelector(s); };

    root.innerHTML =
      '<div class="ms">' +
        '<div class="ms-head"><span class="ms-tag">Machine data checklist</span><span class="ms-sub-head">Kept on this device · nothing is sent</span></div>' +
        '<div class="ms-set">' +
          '<div class="ms-f"><label class="ms-label" for="ms-org">Company or department <span class="o">(optional, printed on the sheets)</span></label><input class="ms-in" id="ms-org" type="text" maxlength="60" autocomplete="organization" placeholder="e.g. Finishing, Line 2"></div>' +
          '<div class="ms-f"><span class="ms-label" id="ms-ml">Your machines <span class="o">(up to ' + MAX + ')</span></span><div class="ms-machines" role="group" aria-labelledby="ms-ml"></div>' +
            '<button type="button" class="ms-add">Add a machine</button></div>' +
          '<div class="ms-f"><span class="ms-label">Who to ask <span class="o">(optional, names or roles)</span></span><div class="ms-who">' +
            WHO.map(function(w){ return '<label class="ms-wf"><span>' + w[1] + '</span><input class="ms-in" data-who="' + w[0] + '" type="text" maxlength="40" autocomplete="off"></label>'; }).join('') +
          '</div></div>' +
          '<div class="ms-f ms-logset"><span class="ms-label">Shift log</span><div class="ms-chips">' +
            '<span class="ms-cl">Shifts a day</span>' + [1, 2, 3].map(function(n){ return '<button type="button" class="ms-chip" data-shifts="' + n + '">' + n + '</button>'; }).join('') +
            '<span class="ms-cl">Days</span><button type="button" class="ms-chip" data-days="5">Mon to Fri</button><button type="button" class="ms-chip" data-days="7">Mon to Sun</button>' +
          '</div></div>' +
          '<div class="ms-clear-row"><button type="button" class="ms-clear">Start a new sheet</button><span>Clears the company, machines, names and ticks on this device.</span></div>' +
        '</div>' +
        '<div class="ms-actions">' +
          '<button type="button" class="ms-print" data-what="check">Print the checklist<span>1 page</span></button>' +
          '<button type="button" class="ms-print" data-what="log">Print the shift logs<span class="ms-logn"></span></button>' +
        '</div>' +
        '<div class="ms-pv">' +
          '<div class="ms-pvh">The checklist <span>Tap a box when it\'s done. Tap n/a if a row doesn\'t apply to a machine.</span></div>' +
          '<div class="ms-scroll"><div class="ms-sheet ms-checksheet"></div></div>' +
          '<div class="ms-pvh">Shift log <span>One page per machine. Fill it in with a pen, every shift for a week.</span></div>' +
          '<div class="ms-scroll"><div class="ms-sheet ms-logsheet"></div></div>' +
        '</div>' +
      '</div>';

    // ---------- the sheets (same markup on screen and on paper)
    function top(title, sub){
      var org = P ? P.org() : '';
      return '<div class="ms-top"><div><img src="/assets/meshlock-wordmark.svg" alt="Meshlock" width="102" height="16"><div class="ms-title">' + esc(title) + '</div></div>' +
        '<div class="ms-meta">' + (org ? '<b>' + esc(org) + '</b>' : '') + esc(sub) + '</div></div>';
    }
    function foot(){ return P ? P.foot(TOOL, fb) : ''; }
    function checkSheet(live){
      var c = cols(), w = S.who || {};
      var head = '<tr><th class="ms-what">What to look at or ask</th>' + c.map(function(m, i){ return '<th class="ms-mc">' + (m ? esc(m) : 'Machine<br>______') + '</th>'; }).join('') + '</tr>';
      var body = ITEMS.map(function(g){
        return '<tr class="ms-g"><td colspan="' + (c.length + 1) + '">' + esc(g.g) + '</td></tr>' + g.items.map(function(it){
          var na = S.na[it.id] || {}, who = it.who && w[it.who] ? ' <span class="ms-whois">· ' + esc(w[it.who]) + '</span>' : '';
          return '<tr><td class="ms-what">' + esc(it.t) + who + '</td>' + c.map(function(m, i){
            var k = it.id + '|' + i, isNa = !!na[i], on = !!S.tick[k];
            if (!live) return '<td class="ms-cell' + (isNa ? ' ms-na' : '') + '">' + (isNa ? 'n/a' : '<span class="ms-box' + (on ? ' on' : '') + '"></span>') + '</td>';
            return '<td class="ms-cell' + (isNa ? ' ms-na' : '') + '"><button type="button" class="ms-tick" data-k="' + k + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + esc(it.t) + ', ' + esc(m || 'machine') + '"' + (isNa ? ' disabled' : '') + '>' + (isNa ? 'n/a' : '') + '</button>' +
              '<button type="button" class="ms-nab" data-id="' + it.id + '" data-i="' + i + '" aria-pressed="' + (isNa ? 'true' : 'false') + '">' + (isNa ? 'undo' : 'n/a') + '</button></td>';
          }).join('') + '</tr>';
        }).join('');
      }).join('');
      var mt = w.mt ? ' (' + esc(w.mt) + ')' : '';
      return top('Find your machine data', 'One week · date ____________') +
        '<div class="ms-rule"><b>Rule first</b>' + esc(RULE).replace('goes to maintenance.', 'goes to maintenance' + mt + '.') + '</div>' +
        '<table class="ms-grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' +
        '<div class="ms-tip">Got a week of readings? That\'s enough to start.</div>' + foot();
    }
    function logSheet(m){
      var days = DAYS.slice(0, S.days), rows = '';
      days.forEach(function(d){
        for (var s = 1; s <= S.shifts; s++) rows += '<tr class="' + (s === 1 ? 'ms-day1' : '') + '"><td class="ms-d">' + (s === 1 ? d : '') + '</td>' + (S.shifts > 1 ? '<td class="ms-s">' + s + '</td>' : '') + '<td></td><td></td><td class="ms-stops"></td><td></td></tr>';
      });
      return top('Shift log' + (m ? ' · ' + m : ''), (m ? '' : 'Machine __________ · ') + 'Week starting ____________') +
        '<div class="ms-how">At the start and end of every shift, write the counter from the machine screen. Note every stop over 5 minutes: when, how long, why. ' + esc(RULE.split('.')[0]) + '.</div>' +
        '<table class="ms-log' + (S.shifts > 1 ? ' ms-multi' : '') + '" style="--rowh:' + Math.min(24, Math.floor(190 / (days.length * S.shifts))) + 'mm"><thead><tr><th class="ms-d">Day</th>' + (S.shifts > 1 ? '<th class="ms-s">Shift</th>' : '') +
        '<th>Counter at start</th><th>Counter at end</th><th class="ms-stops">Stops over 5 min: when · how long · why</th><th>Initials</th></tr></thead><tbody>' + rows + '</tbody></table>' + foot();
    }

    // ---------- screen
    function inputs(){
      var box = $('.ms-machines');
      box.innerHTML = S.machines.map(function(m, i){
        return '<input class="ms-in ms-m" type="text" maxlength="24" autocomplete="off" data-i="' + i + '" value="' + esc(m) + '" placeholder="e.g. M' + (i + 1) + '" aria-label="Machine ' + (i + 1) + '">';
      }).join('');
      $('.ms-add').hidden = S.machines.length >= MAX;
    }
    function draw(){
      $('.ms-checksheet').innerHTML = checkSheet(true);
      $('.ms-logsheet').innerHTML = logSheet(cols()[0]);
      var n = named().length || 1;
      $('.ms-logn').textContent = n === 1 ? '1 page' : n + ' pages, one per machine';
      root.querySelectorAll('[data-shifts]').forEach(function(b){ b.setAttribute('aria-pressed', +b.getAttribute('data-shifts') === S.shifts ? 'true' : 'false'); });
      root.querySelectorAll('[data-days]').forEach(function(b){ b.setAttribute('aria-pressed', +b.getAttribute('data-days') === S.days ? 'true' : 'false'); });
    }
    if (P) $('#ms-org').value = P.org();
    else $('#ms-org').closest('.ms-f').hidden = true;
    WHO.forEach(function(w){ $('[data-who="' + w[0] + '"]').value = (S.who || {})[w[0]] || ''; });
    inputs(); draw();

    $('#ms-org').addEventListener('input', function(e){ if (P) P.org(e.target.value); draw(); });
    $('.ms-machines').addEventListener('input', function(e){
      var i = +e.target.getAttribute('data-i'); if (isNaN(i)) return;
      // Ticks belong to a column: keep them with the machine's position
      S.machines[i] = e.target.value; save(); draw();
    });
    $('.ms-add').addEventListener('click', function(){
      if (S.machines.length >= MAX) return;
      S.machines.push(''); save(); inputs(); draw();
      var last = root.querySelectorAll('.ms-m'); last[last.length - 1].focus();
    });
    root.querySelectorAll('[data-who]').forEach(function(f){
      f.addEventListener('input', function(){ S.who = S.who || {}; S.who[f.getAttribute('data-who')] = f.value.trim(); save(); draw(); });
    });
    root.querySelectorAll('[data-shifts]').forEach(function(b){ b.addEventListener('click', function(){ S.shifts = +b.getAttribute('data-shifts'); save(); draw(); }); });
    root.querySelectorAll('[data-days]').forEach(function(b){ b.addEventListener('click', function(){ S.days = +b.getAttribute('data-days'); save(); draw(); }); });
    $('.ms-checksheet').addEventListener('click', function(e){
      var t = e.target.closest('.ms-tick');
      if (t && !t.disabled) { var k = t.getAttribute('data-k'); S.tick[k] = !S.tick[k]; if (!S.tick[k]) delete S.tick[k]; save(); draw(); return; }
      var n = e.target.closest('.ms-nab');
      if (n) { var id = n.getAttribute('data-id'), i = n.getAttribute('data-i'); S.na[id] = S.na[id] || {}; S.na[id][i] = !S.na[id][i]; if (!S.na[id][i]) delete S.na[id][i]; save(); draw(); }
    });
    var armed = null;
    $('.ms-clear').addEventListener('click', function(){
      var b = this;
      if (!armed) { b.textContent = 'Tap again to clear everything'; b.classList.add('armed'); armed = setTimeout(function(){ armed = null; b.textContent = 'Start a new sheet'; b.classList.remove('armed'); }, 3000); return; }
      clearTimeout(armed); armed = null; b.textContent = 'Start a new sheet'; b.classList.remove('armed');
      S = fresh(); save(); if (P) P.org(''); $('#ms-org').value = ''; WHO.forEach(function(w){ $('[data-who="' + w[0] + '"]').value = ''; }); inputs(); draw();
    });

    // ---------- print: only the chosen sheets, each on its own page
    root.querySelectorAll('.ms-print').forEach(function(b){
      b.addEventListener('click', function(){
        var what = b.getAttribute('data-what'), box = document.getElementById('ms-print');
        if (!box) { box = document.createElement('div'); box.id = 'ms-print'; document.body.appendChild(box); }
        box.innerHTML = what === 'check' ? '<div class="ms-sheet ms-page">' + checkSheet(false) + '</div>'
          : cols().map(function(m){ return '<div class="ms-sheet ms-page">' + logSheet(m) + '</div>'; }).join('');
        document.body.classList.add('ms-printing');
        var off = function(){ document.body.classList.remove('ms-printing'); window.removeEventListener('afterprint', off); };
        window.addEventListener('afterprint', off);
        window.print();
        setTimeout(off, 1500);
      });
    });
  }

  function init(){ var el = document.querySelector('[data-tool="machine-sheet"]'); if (el) build(el); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
