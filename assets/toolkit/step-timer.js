/* Step timer · Meshlock toolkit
   Renders into the element with data-tool="step-timer". One file, used by /toolkit/step-timer/
   and the first Field Note. Styles: assets/toolkit/step-timer.css (also the print layout).
   Time one task step by step, up to 3 runs (another person or another shift), mark steps as
   Waiting or Mistake, and see where the time goes.
   Options on the element:
     data-offer-tag   fallback tag on the offer link (a stored tag still wins, see assets/site.js)
     data-check       address of the "Worth automating?" check (default /toolkit/worth-automating/).
                      When the check is on the same page, it is filled in place (the 'ml:freq' event).
     data-sheet       address of the blank printable sheet (default /toolkit/step-timer/sheet/)
   Nothing leaves the browser. The measurement is kept in this browser only (localStorage), so a
   reload or a locked phone does not lose it. Counting (assets/stats.js): only the step names
   toolkit/step-timer/start, /finish, /again and /to-offer. Never times, labels or task names. */
(function(){
  'use strict';
  var KEY = 'ml-step-timer', MAX_RUNS = 3;
  var LINES = {
    wait: 'Most of this time is waiting, not work. Fix the flow first; a tool alone won\'t speed it up.',
    unstable: function(s, a, b){ return s + ' runs from ' + a + ' to ' + b + '. Everyone may do it their own way: agree one standard way before anything else.'; },
    mistake: 'Mistakes showed up. A check built into the step stops them before they travel.',
    big: function(s){ return s + ' takes most of the time. Start there.'; },
    hours: function(h){ return 'That\'s ' + h + ' hours a week. Worth a closer look.'; }
  };
  function track(n){ (window.mlTrack || function(x){ (window.mlq = window.mlq || []).push(x); })(n); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function clock(ms){ var t = Math.max(0, Math.round(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s); }
  function one(v){ return String(Math.round(v * 10) / 10); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(){ try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.steps) && Array.isArray(s.runs)) return s; } catch(e){} return null; }
  function fresh(){ return { task: '', steps: [], runs: [], cur: null, perWeek: '', next: 1 }; }

  function build(root){
    var tag = root.getAttribute('data-offer-tag');
    var checkUrl = root.getAttribute('data-check') || '/toolkit/worth-automating/';
    var sheetUrl = root.getAttribute('data-sheet') || '/toolkit/step-timer/sheet/';
    var S = load() || fresh(), tick = null, lock = null, clearArmed = null;
    function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
    function now(){ return Date.now(); }
    function name(i){ var s = S.steps[i]; return 'Step ' + (i + 1) + (s && s.label ? ' (' + s.label + ')' : ''); }

    // ---------- screen lock: keep the phone awake while timing, where the browser allows it
    function wake(on){
      try {
        if (on && !lock && navigator.wakeLock) navigator.wakeLock.request('screen').then(function(l){ lock = l; l.addEventListener('release', function(){ lock = null; }); }, function(){});
        if (!on && lock) { lock.release(); lock = null; }
      } catch(e){}
    }
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && S.cur) wake(true); });

    // ---------- timing
    function begin(){
      var t = now();
      if (!S.runs.length && !S.steps.length) S.steps.push({ id: S.next++, label: '' });
      S.cur = { start: t, idx: 0, stepStart: t, t: {}, w: {}, m: {} };
      save(); wake(true); render();
    }
    function close(){ var c = S.cur, id = S.steps[c.idx].id, t = now(); c.t[id] = (c.t[id] || 0) + (t - c.stepStart); c.stepStart = t; }
    function nextStep(){
      close();
      if (S.cur.idx + 1 >= S.steps.length) S.steps.push({ id: S.next++, label: '' });
      S.cur.idx++; save(); render();
    }
    function addStep(){ close(); S.steps.splice(S.cur.idx + 1, 0, { id: S.next++, label: '' }); S.cur.idx++; save(); render(); }
    function finish(){
      close(); var c = S.cur;
      S.runs.push({ t: c.t, w: c.w, m: c.m });
      // Steps nobody timed in any run (added and never reached) are dropped
      S.steps = S.steps.filter(function(s){ return S.runs.some(function(r){ return r.t[s.id] !== undefined; }); });
      S.cur = null; save(); wake(false); track('toolkit/step-timer/finish'); render();
    }

    // ---------- results across runs
    function stats(){
      var runs = S.runs, steps = S.steps.map(function(s, i){
        var times = runs.map(function(r){ return r.t[s.id]; }).filter(function(v){ return v !== undefined; });
        var avg = times.reduce(function(a, b){ return a + b; }, 0) / (times.length || 1);
        var min = Math.min.apply(null, times), max = Math.max.apply(null, times);
        return { i: i, s: s, times: runs.map(function(r){ return r.t[s.id]; }), avg: avg, min: min, max: max,
          wait: runs.some(function(r){ return r.w[s.id]; }), mistake: runs.some(function(r){ return r.m[s.id]; }),
          unstable: times.length >= 2 && max >= 2 * min && max - min >= 60000 };
      });
      // Per run: work, waiting and rework (a step marked Mistake counts as rework, even if also Waiting)
      var split = runs.map(function(r){
        var o = { work: 0, wait: 0, rework: 0 };
        Object.keys(r.t).forEach(function(id){ o[r.m[id] ? 'rework' : (r.w[id] ? 'wait' : 'work')] += r.t[id]; });
        o.total = o.work + o.wait + o.rework; return o;
      });
      var avg = function(k){ return split.reduce(function(a, o){ return a + o[k]; }, 0) / split.length; };
      var r = { steps: steps, total: avg('total'), work: avg('work'), wait: avg('wait'), rework: avg('rework'), runs: runs.length };
      var pw = parseFloat(String(S.perWeek).replace(',', '.'));
      r.perWeek = pw > 0 ? pw : null;
      r.hours = r.perWeek ? r.total * r.perWeek / 3600000 : null;
      // Feedback, most important first, at most three lines
      var fb = [];
      if (r.total > 0 && r.wait / r.total > 0.3) fb.push(LINES.wait);
      var un = steps.filter(function(x){ return x.unstable; })[0];
      if (un) fb.push(LINES.unstable(name(un.i), clock(un.min), clock(un.max)));
      if (steps.some(function(x){ return x.mistake; })) fb.push(LINES.mistake);
      var top = steps.slice().sort(function(a, b){ return b.avg - a.avg; })[0];
      if (top && steps.length > 1 && r.total > 0 && top.avg / r.total > 0.4) fb.push(LINES.big(name(top.i)));
      if (r.hours > 2) fb.push(LINES.hours(one(r.hours)));
      r.feedback = fb.slice(0, 3);
      r.freq = !r.perWeek ? '' : (r.perWeek >= 5 ? 'daily' : (r.perWeek >= 1 ? 'weekly' : 'rare'));
      r.bucket = r.hours === null ? '' : (r.hours < 1 ? 'a' : (r.hours < 5 ? 'b' : (r.hours < 15 ? 'c' : 'd')));
      return r;
    }
    function text(r){
      var L = ['Step timer · meshlock.co.uk/toolkit/step-timer/', 'Task: ' + (S.task || 'not named'), 'Runs: ' + r.runs];
      r.steps.forEach(function(x){
        var runs = x.times.map(function(t, j){ return 'run ' + (j + 1) + ' ' + (t === undefined ? 'not timed' : clock(t)); }).join(' · ');
        L.push(name(x.i) + ': ' + (r.runs > 1 ? runs + ' · average ' + clock(x.avg) + ' · range ' + clock(x.min) + ' to ' + clock(x.max) : clock(x.avg)) +
          (x.wait ? ' · waiting' : '') + (x.mistake ? ' · mistake' : '') + (x.unstable ? ' · unstable' : ''));
      });
      L.push('Total' + (r.runs > 1 ? ' (average of ' + r.runs + ' runs)' : '') + ': ' + clock(r.total));
      L.push('Work ' + clock(r.work) + ' · Waiting ' + clock(r.wait) + ' · Rework ' + clock(r.rework));
      L.push('Times per week: ' + (r.perWeek ? one(r.perWeek) + ' · ' + one(r.hours) + ' hours a week' : 'not set'));
      if (r.feedback.length) { L.push('What it shows:'); r.feedback.forEach(function(f){ L.push('- ' + f); }); }
      return L.join('\n');
    }

    // ---------- screens
    // No autofocus anywhere: on a phone the keyboard would cover the Next step button
    function render(){
      clearInterval(tick); tick = null;
      if (S.cur) return running();
      if (S.runs.length) return results();
      setup();
    }
    function frame(inner){ root.innerHTML = '<div class="st"><div class="st-head"><span class="st-tag">Step timer</span><span class="st-sub-head">Nothing leaves this browser</span></div>' + inner + '</div>'; }
    function $(s){ return root.querySelector(s); }

    function setup(){
      frame('<div class="st-body">' +
        '<label class="st-label" for="st-task">What task are you timing?</label>' +
        '<input class="st-input" id="st-task" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Placing artwork for one order" value="' + esc(S.task) + '">' +
        '<div class="st-help">Tap Start when the task starts. Tap Next step each time a new step begins. Mark a step Waiting if nothing moves, Mistake if it is fixing an error. Up to 3 runs.</div>' +
        '<button type="button" class="st-big st-start">Start</button>' +
        '<a class="st-paper" href="' + esc(sheetUrl) + '">Prefer paper? Print a blank sheet →</a>' +
      '</div>');
      $('#st-task').addEventListener('input', function(e){ S.task = e.target.value; save(); });
      $('.st-start').addEventListener('click', function(){ S.task = $('#st-task').value.trim(); track('toolkit/step-timer/start'); begin(); });
    }

    function running(){
      var c = S.cur, step = S.steps[c.idx], run = S.runs.length + 1, later = run > 1, id = step.id;
      frame('<div class="st-body st-run">' +
        '<div class="st-meta"><span>Run ' + run + ' of up to ' + MAX_RUNS + '</span>' + (S.task ? '<span class="st-task">' + esc(S.task) + '</span>' : '') + '</div>' +
        '<div class="st-clock" aria-label="Time so far" role="timer"></div>' +
        '<div class="st-step">' +
          '<div class="st-step-top"><span class="st-step-n">Step ' + (c.idx + 1) + (later ? ' of ' + S.steps.length : '') + '</span><span class="st-step-clock"></span></div>' +
          '<label class="st-label" for="st-lab">Short label <span class="o">(optional)</span></label>' +
          '<input class="st-input" id="st-lab" type="text" maxlength="40" autocomplete="off" placeholder="e.g. Find template" value="' + esc(step.label) + '">' +
          '<div class="st-toggles">' +
            '<button type="button" class="st-tog st-t-wait" aria-pressed="' + (c.w[id] ? 'true' : 'false') + '">Waiting</button>' +
            '<button type="button" class="st-tog st-t-mis" aria-pressed="' + (c.m[id] ? 'true' : 'false') + '">Mistake</button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="st-big st-next">Next step' + (later && c.idx + 1 < S.steps.length ? '<span class="st-next-name">' + esc(name(c.idx + 1)) + '</span>' : '') + '</button>' +
        '<div class="st-row">' + (later ? '<button type="button" class="st-mid st-add">Add a step here</button>' : '') + '<button type="button" class="st-mid st-finish">Finish</button></div>' +
        '<div class="st-sofar">' + S.steps.slice(0, c.idx).map(function(s, i){ return '<div class="st-done"><span>' + esc(name(i)) + '</span><span>' + clock(c.t[s.id] || 0) + (c.w[s.id] ? ' · waiting' : '') + (c.m[s.id] ? ' · mistake' : '') + '</span></div>'; }).join('') + '</div>' +
      '</div>');
      var lab = $('#st-lab');
      lab.addEventListener('input', function(){ step.label = lab.value.trim(); save(); $('.st-step-n').textContent = 'Step ' + (c.idx + 1) + (later ? ' of ' + S.steps.length : ''); });
      $('.st-t-wait').addEventListener('click', function(){ c.w[id] = !c.w[id]; this.setAttribute('aria-pressed', c.w[id] ? 'true' : 'false'); save(); });
      $('.st-t-mis').addEventListener('click', function(){ c.m[id] = !c.m[id]; this.setAttribute('aria-pressed', c.m[id] ? 'true' : 'false'); save(); });
      $('.st-next').addEventListener('click', nextStep);
      $('.st-finish').addEventListener('click', finish);
      if (later) $('.st-add').addEventListener('click', addStep);
      function show(){ var t = now(); $('.st-clock').textContent = clock(t - c.start); $('.st-step-clock').textContent = clock(t - c.stepStart) + ' this step'; }
      show(); tick = setInterval(show, 250);
    }

    function results(){
      var r = stats(), multi = r.runs > 1, T = r.total || 1;
      var bar = [['work', 'Work'], ['wait', 'Waiting'], ['rework', 'Rework']].map(function(k){
        return '<span class="st-seg st-' + k[0] + '" style="width:' + (r[k[0]] / T * 100).toFixed(2) + '%"></span>'; }).join('');
      var legend = [['work', 'Work'], ['wait', 'Waiting'], ['rework', 'Rework (Mistake)']].map(function(k){
        return '<span class="st-lg"><i class="st-' + k[0] + '"></i>' + k[1] + ' ' + clock(r[k[0]]) + ' · ' + Math.round(r[k[0]] / T * 100) + '%</span>'; }).join('');
      var rows = r.steps.map(function(x){
        var flags = (x.wait ? ' <span class="st-flag st-f-wait">WAITING</span>' : '') + (x.mistake ? ' <span class="st-flag st-f-mis">MISTAKE</span>' : '') + (x.unstable ? ' <span class="st-flag st-f-un">UNSTABLE</span>' : '');
        return '<div class="st-srow"><div class="st-sname"><span class="st-sn">' + (x.i + 1) + '</span> ' + esc(x.s.label || 'Step ' + (x.i + 1)) + flags + '</div>' +
          '<div class="st-stime">' + clock(x.avg) + (multi ? ' <span class="st-range">' + clock(x.min) + ' to ' + clock(x.max) + '</span>' : '') + '</div></div>';
      }).join('');
      var offer = '/start/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#f=export' + (r.bucket ? '.' + r.bucket : '');
      var check = checkUrl + (r.freq ? '#freq=' + r.freq : '');
      frame('<div class="st-body st-results st-print-target">' +
        '<div class="st-print-head">Step timer · meshlock.co.uk/toolkit/step-timer/</div>' +
        '<div class="st-meta"><span>' + (multi ? r.runs + ' runs · averages' : '1 run') + '</span>' + (S.task ? '<span class="st-task">' + esc(S.task) + '</span>' : '') + '</div>' +
        '<div class="st-steps"><div class="st-srow st-shead"><div>Step</div><div>' + (multi ? 'Average · shortest to longest' : 'Time') + '</div></div>' + rows + '</div>' +
        '<div class="st-total"><span class="st-tk">Total' + (multi ? ' (average)' : '') + '</span><span class="st-tv">' + clock(r.total) + '</span></div>' +
        '<div class="st-bar" role="img" aria-label="Work ' + clock(r.work) + ', waiting ' + clock(r.wait) + ', rework ' + clock(r.rework) + '">' + bar + '</div>' +
        '<div class="st-legend">' + legend + '</div>' +
        '<div class="st-week"><label class="st-label" for="st-pw">Times per week</label><div class="st-week-row"><input class="st-input st-pw" id="st-pw" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 25" value="' + esc(S.perWeek) + '">' +
          '<span class="st-hours"></span></div></div>' +
        '<div class="st-fb" aria-live="polite"></div>' +
      '</div>' +
      '<div class="st-body st-next-actions">' +
        (r.runs < MAX_RUNS ? '<button type="button" class="st-big st-again">Measure again<span class="st-next-name">Run ' + (r.runs + 1) + ' of ' + MAX_RUNS + ': another person or shift, same steps</span></button>' : '') +
        '<a class="st-act st-check" href="' + esc(check) + '">Is it worth automating? →</a>' +
        '<a class="st-act st-offer" href="' + esc(offer) + '">Put these hours into the offer →</a>' +
        '<div class="st-row"><button type="button" class="st-mid st-copy">Copy result</button><button type="button" class="st-mid st-print">Print result</button></div>' +
        '<span class="st-status" role="status"></span>' +
        '<div class="st-foot"><a class="st-paper" href="' + esc(sheetUrl) + '">Prefer paper? Print a blank sheet →</a><button type="button" class="st-clear">Start over</button></div>' +
      '</div>');
      function week(){
        var x = stats();
        $('.st-hours').textContent = x.hours !== null ? '= ' + one(x.hours) + ' hours a week' : 'Add it to see hours a week';
        var fb = $('.st-fb'); fb.innerHTML = '';
        x.feedback.forEach(function(f){ var d = document.createElement('div'); d.className = 'st-fbl'; d.textContent = f; fb.appendChild(d); });
        $('.st-check').setAttribute('href', checkUrl + (x.freq ? '#freq=' + x.freq : ''));
        $('.st-offer').setAttribute('href', '/start/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#f=export' + (x.bucket ? '.' + x.bucket : ''));
      }
      $('#st-pw').addEventListener('input', function(e){ S.perWeek = e.target.value.trim(); save(); week(); });
      week();
      if ($('.st-again')) $('.st-again').addEventListener('click', function(){ track('toolkit/step-timer/again'); begin(); });
      $('.st-check').addEventListener('click', function(e){
        var f = stats().freq, here = document.querySelector('[data-tool="worth-automating"]');
        if (!here) return;   // no check on this page: follow the link
        e.preventDefault();
        try { if (f) document.dispatchEvent(new CustomEvent('ml:freq', { detail: { freq: f } })); } catch(err){}
        here.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      $('.st-offer').addEventListener('click', function(){ track('toolkit/step-timer/to-offer'); });
      $('.st-copy').addEventListener('click', function(){
        var t = text(stats()), st = $('.st-status');
        function done(){ st.textContent = 'Copied'; setTimeout(function(){ st.textContent = ''; }, 2500); }
        function fallback(){ var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(e){ st.textContent = 'Copy not available here'; } document.body.removeChild(ta); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
      });
      $('.st-print').addEventListener('click', function(){
        document.body.classList.add('print-tool');
        var off = function(){ document.body.classList.remove('print-tool'); window.removeEventListener('afterprint', off); };
        window.addEventListener('afterprint', off);
        window.print();
        setTimeout(off, 1000);
      });
      $('.st-clear').addEventListener('click', function(){
        var b = this;
        if (!clearArmed) { b.textContent = 'Tap again to clear all runs'; clearArmed = setTimeout(function(){ clearArmed = null; b.textContent = 'Start over'; }, 3000); return; }
        clearTimeout(clearArmed); clearArmed = null;
        var task = S.task; S = fresh(); S.task = task; save(); render();
      });
    }
    if (S.cur) wake(true);
    render();
  }

  function init(){ var el = document.querySelector('[data-tool="step-timer"]'); if (el) build(el); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
