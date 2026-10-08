/* "Worth automating?" check · Meshlock toolkit
   Renders into every element with data-tool="worth-automating". One file, used by
   /toolkit/worth-automating/ and the first Field Note. Styles: assets/toolkit/worth-automating.css.
   Options on the element:
     data-offer-tag   fallback tag on the offer link (a stored tag still wins, see assets/site.js)
   A frequency can be passed in, so the check opens with that question answered:
     - in the page link: #freq=daily | weekly | rare   (the step timer links here like that)
     - on the same page: the 'ml:freq' event with detail.freq (the step timer sends it)
   Counting (assets/stats.js): only the step names toolkit/worth-automating/start, /verdict and
   /to-offer. Never the answers. Nothing typed or tapped here is sent anywhere. */
(function(){
  'use strict';
  var Q = [
    { k: 'freq', q: 'How often does it happen?', o: [['daily', 'Daily'], ['weekly', 'Weekly'], ['rare', 'Less often']] },
    { k: 'same', q: 'Same steps every time?', o: [['yes', 'Yes'], ['mostly', 'Mostly'], ['no', 'No']] },
    { k: 'rules', q: 'Can the steps be written as rules, or do they need judgement?', o: [['rules', 'Rules'], ['partly', 'Partly'], ['judgement', 'Judgement']] },
    { k: 'digital', q: 'Is the input already digital?', o: [['yes', 'Yes: files, ERP export, email'], ['partly', 'Partly'], ['paper', 'No: paper']] },
    { k: 'errors', q: 'Do mistakes slip through to later stages?', o: [['often', 'Often'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely']] },
    { k: 'person', q: 'Does it depend on one person\'s know-how?', o: [['yes', 'Yes'], ['no', 'No']] }
  ];
  // One short "why" line per answer that can drive a verdict
  var WHY = {
    freq: { daily: 'It happens every day, so the time saved adds up fast.', weekly: 'It happens every week: enough repeats to pay back a small tool.', rare: 'It happens less than weekly. A tool would take longer to build than it saves.' },
    same: { yes: 'Same steps every time: exactly what a tool does best.', mostly: 'Mostly the same steps: a tool can take the usual case and flag the rest.', no: 'The steps change from one time to the next. One agreed way has to come first.' },
    rules: { rules: 'The steps can be written down as rules.', partly: 'Most steps are rules. The rest can be flagged for a person.', judgement: 'It needs judgement each time. A tool can\'t make that call for you.' },
    digital: { yes: 'The input is already digital, so nothing has to be typed in again.', partly: 'Some of the input is digital already. The rest can follow.', paper: 'The input arrives on paper. It has to reach a file or the ERP before a tool can touch it.' },
    errors: { often: 'Mistakes slip through often. A tool checks every one before it travels.', sometimes: 'Mistakes slip through sometimes. A check built into the step stops them.' },
    person: { yes: 'It lives in one person\'s head. Get it written down before anything else.', no: 'It doesn\'t depend on one person, so the way of working is already shared.' }
  };
  var VERDICT = {
    automate: { stamp: 'AUTOMATE', head: 'Strong candidate', sub: 'Frequent, repeatable and rule-based. This is the kind of step a small tool removes.' },
    standardise: { stamp: 'STANDARDISE FIRST', head: 'Write the steps down, then automate', sub: 'A tool copies the way the work is done. Agree one way first, or the tool copies the confusion.' },
    leave: { stamp: 'LEAVE IT', head: 'Too rare or too much judgement', sub: 'Not every slow step needs a tool. Spend the effort where it pays back.' }
  };
  var FREQ_NOTE = { daily: 'Pre-answered from the step timer: 5 or more times a week.', weekly: 'Pre-answered from the step timer: 1 to 4 times a week.', rare: 'Pre-answered from the step timer: less than once a week.' };
  var count = 0;
  function track(n){ (window.mlTrack || function(x){ (window.mlq = window.mlq || []).push(x); })(n); }

  function verdict(a){
    var why = function(keys){ return keys.map(function(k){ return WHY[k][a[k]]; }).filter(Boolean); };
    var leave = [];
    if (a.freq === 'rare') leave.push('freq');
    if (a.rules === 'judgement') leave.push('rules');
    if (leave.length) return { v: 'leave', why: why(leave) };
    var std = [];
    if (a.same === 'no') std.push('same');
    if (a.same === 'mostly' && a.rules === 'partly') std.push('same', 'rules');
    if (a.digital === 'paper') std.push('digital');
    if (a.person === 'yes') std.push('person');
    if (std.length) return { v: 'standardise', why: why(std) };
    return { v: 'automate', why: why(['freq', 'same', 'rules', 'digital', 'errors', 'person']) };
  }

  function build(root){
    var id = 'wa' + (++count), tag = root.getAttribute('data-offer-tag');
    var offer = '/start/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#f=export';
    root.innerHTML =
      '<div class="wa">' +
        '<div class="wa-head"><span class="wa-tag">Worth automating?</span><span class="wa-sub-head">Six taps · nothing is sent</span></div>' +
        '<div class="wa-qs">' + Q.map(function(q, i){
          return '<div class="wa-q" data-q="' + q.k + '"><div class="wa-qt" id="' + id + q.k + '"><span class="wa-n">' + (i + 1) + '</span>' + q.q + '</div>' +
            '<div class="wa-opts" role="radiogroup" aria-labelledby="' + id + q.k + '">' + q.o.map(function(o){
              return '<button type="button" class="wa-opt" role="radio" aria-checked="false" data-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div><div class="wa-pre" hidden></div></div>';
        }).join('') + '</div>' +
        '<div class="wa-out" aria-live="polite">' +
          '<div class="wa-progress"></div>' +
          '<div class="wa-verdict" hidden><span class="wa-stamp"></span><div class="wa-vh"></div><div class="wa-vs"></div><div class="wa-why"></div>' +
            '<a class="wa-go" href="' + offer + '" hidden>Put your numbers on it →</a></div>' +
        '</div>' +
        '<div class="wa-actions"><button type="button" class="wa-reset">Start again</button></div>' +
      '</div>';
    var $ = function(s){ return root.querySelector(s); }, ans = {}, started = false, shown = false;

    function set(k, v, pre){
      ans[k] = v;
      root.querySelectorAll('.wa-q[data-q="' + k + '"] .wa-opt').forEach(function(b){ b.setAttribute('aria-checked', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      var note = $('.wa-q[data-q="' + k + '"] .wa-pre'); note.hidden = !pre; note.textContent = pre || '';
      render();
    }
    function render(){
      var n = Q.filter(function(q){ return ans[q.k]; }).length, box = $('.wa-verdict');
      $('.wa-progress').textContent = n < Q.length ? n + ' of 6 answered. The verdict shows once all six are in.' : '';
      $('.wa-progress').hidden = n === Q.length;
      if (n < Q.length) { box.hidden = true; return; }
      var r = verdict(ans), V = VERDICT[r.v];
      box.className = 'wa-verdict wa-' + r.v; box.hidden = false;
      $('.wa-stamp').textContent = V.stamp; $('.wa-vh').textContent = V.head; $('.wa-vs').textContent = V.sub;
      $('.wa-why').innerHTML = '';
      r.why.forEach(function(t){ var d = document.createElement('div'); d.className = 'wa-w'; d.textContent = t; $('.wa-why').appendChild(d); });
      $('.wa-go').hidden = r.v !== 'automate';
      if (!shown) { shown = true; track('toolkit/worth-automating/verdict'); }
    }
    root.querySelectorAll('.wa-q').forEach(function(q){
      q.addEventListener('click', function(e){
        var b = e.target.closest('.wa-opt'); if (!b) return;
        if (!started) { started = true; track('toolkit/worth-automating/start'); }
        set(q.getAttribute('data-q'), b.getAttribute('data-v'));
      });
    });
    $('.wa-go').addEventListener('click', function(){ track('toolkit/worth-automating/to-offer'); });
    $('.wa-reset').addEventListener('click', function(){
      ans = {}; shown = false;
      root.querySelectorAll('.wa-opt').forEach(function(b){ b.setAttribute('aria-checked', 'false'); });
      root.querySelectorAll('.wa-pre').forEach(function(p){ p.hidden = true; });
      render();
    });
    // A frequency from the step timer: in the link (#freq=) or as an event on the same page
    function preset(f){ if (FREQ_NOTE[f]) set('freq', f, FREQ_NOTE[f]); }
    var m = location.hash.match(/(?:^#|&)freq=(daily|weekly|rare)\b/); if (m) preset(m[1]);
    document.addEventListener('ml:freq', function(e){ if (e.detail) preset(e.detail.freq); });
    render();
  }

  function init(){ document.querySelectorAll('[data-tool="worth-automating"]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
