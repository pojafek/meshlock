/* "Worth automating?" check · Meshlock toolkit · version 2
   Renders into every element with data-tool="worth-automating". One file, used by
   /toolkit/worth-automating/ and the first Field Note. Styles: assets/toolkit/worth-automating.css.

   One task, a name and nine taps. The result is the first thing to sort out, checked in this order:
     1. LEAVE IT          too small (under 30 minutes a week, or rare and under an hour) or it needs judgement
     2. FIX THE DATA      the information the step starts from can't be trusted
     3. GET IT OFF PAPER  the information starts on paper
     4. WRITE THE STEPS   there is no one agreed way of doing it
     5. AUTOMATE          worth a tool
   Anything else found shows under "Also worth knowing". Every result has a plain description,
   typical cases, first steps and a way forward. Mistakes that reach the customer keep a small
   task in the check instead of leaving it. One person knowing the job never blocks a tool.

   Options on the element:
     data-offer-tag   fallback tag on the offer link (a stored tag still wins, see assets/site.js)
     data-hash        keep the answers in the page link after #, so a bookmark or a copied link
                      reopens the same result (toolkit page only)
   Link format after #:  wa=<kind>.<freq>.<hrs>.<same>.<rules>.<digital>.<trust>.<errors>.<person>&t=<task name>
   Older links still work: #freq=daily|weekly|rare (from the step timer), plus &hrs=a|b|c|d.
   On the same page the step timer sends the 'ml:freq' event with detail.freq and detail.bucket.
   Counting (assets/stats.js): only the step names toolkit/worth-automating/start, /verdict, /to-offer
   and /copy. Never the answers or the task name. Nothing typed or tapped here is sent anywhere. */
(function(){
  'use strict';
  var Q = [
    // The offer's problem titles and keys, so a result hands straight over to the offer
    { k: 'kind', q: 'Which problem is it closest to?', o: [['sort', 'Sorting paperwork by hand'], ['pick', 'Picking the long way round'], ['wrong', 'Mistakes found too late'], ['reports', 'Reports you can\u2019t run the floor on'], ['machines', 'Machines nobody measures'], ['export', 'Files done one at a time'], ['custom', 'Chasing missing details'], ['guess', 'Guessing times and quotes'], ['unsure', 'Something else']] },
    { k: 'freq', q: 'How often is it done?', o: [['daily', 'Every day'], ['weekly', 'Every week'], ['rare', 'Less often']] },
    { k: 'hrs', q: 'How much time does it take in total, in a typical week? All people together.', o: [['a0', 'Under 30 minutes'], ['a', '30 minutes to 1 hour'], ['b', '1 to 5 hours'], ['c', '5 to 15 hours'], ['d', '15 hours or more']] },
    { k: 'same', q: 'Is it done the same way every time, by everyone?', o: [['yes', 'Yes'], ['mostly', 'Mostly, with exceptions'], ['no', 'No, everyone does it differently']] },
    { k: 'rules', q: 'Could you write the steps as a list anyone could follow?', o: [['rules', 'Yes, all of it'], ['partly', 'Most of it, a few odd cases'], ['judgement', 'No, it needs a judgement call each time']] },
    { k: 'digital', q: 'Where does the information start?', o: [['yes', 'On a screen: ERP, file or email'], ['partly', 'Partly on paper'], ['paper', 'On paper']] },
    { k: 'trust', q: 'Can you trust that information?', o: [['yes', 'Yes'], ['mostly', 'Mostly, with corrections'], ['no', 'No, it is often wrong or out of date']] },
    { k: 'errors', q: 'Do mistakes from this step reach later stages or the customer?', o: [['often', 'Often, the customer finds them'], ['sometimes', 'Sometimes, we catch them later'], ['rarely', 'Rarely']] },
    { k: 'person', q: 'If the usual person was off for a week, could someone else do it?', o: [['no', 'Yes, easily'], ['slow', 'Yes, but slowly'], ['yes', 'No, nobody else can']] }
  ];
  var KEYS = Q.map(function(q){ return q.k; });
  // Hours a week behind each answer, and what that is over 48 working weeks
  var YEAR = { a0: 'under 25 hours a year', a: 'about 25 to 50 hours a year', b: 'about 50 to 240 hours a year', c: 'about 240 to 720 hours a year', d: 'over 720 hours a year' };
  var OFFER_KIND = { sort: 'sort', pick: 'pick', wrong: 'wrong', reports: 'reports', machines: 'machines', export: 'export', custom: 'custom', guess: 'guess', unsure: 'unsure' };

  var V = {
    leave: { stamp: 'LEAVE IT', tone: 'leave',
      head: { small: 'Too small to be worth a tool', judgement: 'It needs a person\'s judgement' },
      what: {
        small: 'It takes so little time that a tool would cost more than it saves. That is a good answer: the effort is better spent where the hours are.',
        judgement: 'Every time, someone has to weigh things up and decide. A tool can\'t make that call. It can bring the right information together for the person who decides, but that is a different job.'
      },
      cases: { small: ['A saved filter or view in the ERP or Excel', 'A template with the fixed parts already filled in', 'A short checklist at the workstation'],
        judgement: ['Deciding which customer order goes first when two are late', 'Judging a finish or a colour by eye', 'Agreeing a price with a customer'] },
      casesHead: { small: 'Cheaper ways to make it easier', judgement: 'Typical cases' },
      first: { small: ['Come back if the hours grow, for example in the busy season.', 'Look nearby. Slow steps rarely come alone.'],
        judgement: ['Write down what the decision is based on. That list is often useful on its own.', 'Check whether the information for the decision is easy to find. That part might be worth a tool.'] }
    },
    data: { stamp: 'FIX THE DATA FIRST', tone: 'standardise',
      head: 'The information is wrong before the step even starts',
      what: 'The step itself may be fine, but the data it starts from can\'t be trusted. A tool works from that data, so it would only give the wrong answers faster. Fixing the data usually means fixing the process that feeds it, not the spreadsheet: how stock is booked in, moved and booked out, or how jobs are set up.',
      cases: ['Stock in the system that isn\'t on the shelf, or sits in another location', 'Stock counts that never match, so pickers search or short-pick', 'Part numbers, routings or customer details set up wrong in the ERP', 'The same item under two codes, or the same customer twice'],
      first: ['Take one wrong value and trace it back. Where did it go wrong?', 'Check the three moments where stock data changes: booking in, moving, booking out. Most errors start at one of them.', 'Count one small area and compare it with the system. The gap shows how big the problem is.']
    },
    paper: { stamp: 'GET IT OFF PAPER FIRST', tone: 'standardise',
      head: 'Nothing can be automated while it lives on paper',
      what: 'The information starts on paper and someone types it in later, if at all. A tool can only work with what is digital. So the first step is digitalisation: capture it where it happens, on a tablet, a PC or a scanner, instead of a sheet that travels round the building.',
      cases: ['Inspection results written on a sheet and typed into a spreadsheet at the end of the week', 'Downtime or shift notes kept in a notebook', 'Handwritten changes on printed job sheets', 'Signed delivery notes that are filed but never entered'],
      first: ['List what is written on the paper and who uses it afterwards.', 'Ask whether the same form could be filled in on a screen at the same spot.', 'Capturing it on screen at the source is often the first small tool. It can be quoted on its own.']
    },
    steps: { stamp: 'WRITE THE STEPS DOWN FIRST', tone: 'standardise',
      head: 'There is no one way of doing it yet',
      what: 'People do the task differently, or nobody can say exactly how it is done. A tool copies one way of working. Without an agreed way it copies the confusion, and everyone ends up working around it. Agree the steps first, then decide about a tool.',
      cases: ['Each shift packs or labels orders its own way', 'The real rules live in one person\'s head and are not written anywhere', 'Exceptions are handled case by case, by whoever is there'],
      first: ['Watch two people do the task and note where they differ.', 'Agree one way and write it as a short checklist anyone could follow.', 'Run it that way for a few weeks, then run this check again.']
    },
    automate: { stamp: 'AUTOMATE', tone: 'automate',
      head: 'Worth a tool',
      what: 'It happens often, takes real time, follows rules and starts from information you can trust. That is the kind of step a small tool takes off someone\'s desk, and keeps doing the same way every time.',
      cases: ['Sorting job sheets or picking lists by hand every day', 'Copying the same figures from one system into another', 'Checking files or orders against the same rules each time'],
      first: ['Time it once with the step timer, so the saving can be measured later.', 'Write down the rules the person doing it follows, even the odd ones.', 'Put your numbers into a one-page offer to see what a tool like this usually costs.']
    }
  };
  var WHY = {
    freq: { daily: 'It happens every day, so the time saved adds up fast.', weekly: 'It happens every week: enough repeats to pay back a small tool.' },
    hrs: { a: 'At under an hour a week, only a small, simple tool makes sense.', b: '1 to 5 hours a week is about 50 to 240 hours a year.', c: '5 to 15 hours a week is about 240 to 720 hours a year.', d: 'Over 15 hours a week is more than a part-time job.' },
    same: { yes: 'It is done the same way every time.', mostly: 'Mostly the same: a tool takes the usual case and flags the exceptions for a person.' },
    rules: { rules: 'The steps can be written down as rules.', partly: 'Most steps are rules. The odd cases can be flagged for a person.' },
    digital: { yes: 'The information is already on a screen, so nothing has to be typed in again.' },
    errors: { often: 'Mistakes reach the customer. A check built into the step pays for itself twice: once to make, once not to fix.', sometimes: 'Mistakes slip through sometimes. A check in the step stops them earlier.' }
  };
  // Secondary findings, shown under the main result when they are not the main result
  var ALSO = {
    trustMostly: 'The information needs correcting now and then. Note where it goes wrong and fix it at the source.',
    trustNo: 'The information is often wrong. Whatever comes next, fix that first.',
    paperPartly: 'Part of it still starts on paper. Plan to capture that part on screen too.',
    paper: 'It starts on paper. A tool needs it on screen first.',
    steps: 'Not everyone does it the same way. Agree one way before building anything.',
    personYes: 'Only one person can do it. If a tool is built, build it with them, so their rules are kept in it.',
    personSlow: 'Others can do it, but slowly. A written checklist helps either way.',
    errorsSmall: 'It is small, but mistakes reach the customer. A simple check may still be worth it.'
  };
  // The five gates, checked in this order. The result is the first gate that stops the task.
  var GATES = [['leave', 'Worth it?'], ['data', 'Data right?'], ['paper', 'On screen?'], ['steps', 'One way?'], ['automate', 'Automate']];
  var count = 0;
  function track(n){ (window.mlTrack || function(x){ (window.mlq = window.mlq || []).push(x); })(n); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cleanTag(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20); }
  function curTag(fallback){
    var t = '';
    try { t = cleanTag(new URLSearchParams(location.search).get('s')) || cleanTag(sessionStorage.getItem('ml-src')); } catch(e){}
    return t || cleanTag(fallback);
  }

  // The result: the first thing to sort out, plus anything else worth knowing
  function verdict(a){
    var small = (a.hrs === 'a0' || (a.freq === 'rare' && (a.hrs === 'a0' || a.hrs === 'a'))) && a.errors !== 'often';
    var r;
    if (a.rules === 'judgement') r = { v: 'leave', sub: 'judgement' };
    else if (small) r = { v: 'leave', sub: 'small' };
    else if (a.trust === 'no') r = { v: 'data' };
    else if (a.digital === 'paper') r = { v: 'paper' };
    else if (a.same === 'no' || (a.same === 'mostly' && a.rules === 'partly')) r = { v: 'steps' };
    else r = { v: 'automate' };
    var also = [];
    // Balance: say what is already in place before what to fix
    var PASSED = { data: ['worth the time'], paper: ['worth the time', 'data you can trust'], steps: ['worth the time', 'data you can trust', 'on screen'] }[r.v];
    if (PASSED) also.push('Already in place: ' + PASSED.join(', ') + '. That part is ready for a tool.');
    if (r.v !== 'leave' && r.v !== 'data' && a.trust === 'mostly') also.push(ALSO.trustMostly);
    if (r.v === 'leave' && a.trust === 'no') also.push(ALSO.trustNo);
    if (r.v !== 'paper' && a.digital === 'partly') also.push(ALSO.paperPartly);
    if (r.v === 'data' && a.digital === 'paper') also.push(ALSO.paper);
    if ((r.v === 'data' || r.v === 'paper') && (a.same === 'no' || (a.same === 'mostly' && a.rules === 'partly'))) also.push(ALSO.steps);
    if (a.person === 'yes') also.push(ALSO.personYes);
    if (a.person === 'slow' && r.v !== 'leave') also.push(ALSO.personSlow);
    if (r.v !== 'leave' && a.errors === 'often' && (a.hrs === 'a0' || a.hrs === 'a')) also.push(ALSO.errorsSmall);
    r.also = also;
    r.why = r.v === 'automate' ? [WHY.freq[a.freq], WHY.hrs[a.hrs], WHY.same[a.same], WHY.rules[a.rules], WHY.digital[a.digital], WHY.errors[a.errors]].filter(Boolean) : [];
    return r;
  }

  function build(root){
    var id = 'wa' + (++count), fallbackTag = root.getAttribute('data-offer-tag'), useHash = root.hasAttribute('data-hash');
    root.innerHTML =
      '<div class="wa">' +
        '<div class="wa-head"><span class="wa-tag">Worth automating?</span><span class="wa-sub-head">Two minutes · nothing is sent</span></div>' +
        '<div class="wa-q wa-name"><label class="wa-qt" for="' + id + 'name"><span class="wa-n">0</span>Which task? A few words, so the result can be shared.</label>' +
          '<div class="wa-opts"><input type="text" class="wa-in" id="' + id + 'name" maxlength="60" placeholder="e.g. Sorting job sheets for the next shift" autocomplete="off"></div></div>' +
        '<div class="wa-qs">' + Q.map(function(q, i){
          return '<div class="wa-q" data-q="' + q.k + '"><div class="wa-qt" id="' + id + q.k + '"><span class="wa-n">' + (i + 1) + '</span>' + q.q + '</div>' +
            '<div class="wa-opts" role="radiogroup" aria-labelledby="' + id + q.k + '">' + q.o.map(function(o){
              return '<button type="button" class="wa-opt" role="radio" aria-checked="false" data-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div><div class="wa-pre" hidden></div></div>';
        }).join('') + '</div>' +
        '<div class="wa-out" aria-live="polite">' +
          '<div class="wa-progress"></div>' +
          '<div class="wa-verdict" hidden>' +
            '<span class="wa-stamp"></span><div class="wa-task"></div>' +
            '<ol class="wa-path" aria-label="The five checks in order">' + GATES.map(function(g, i){ return '<li class="wa-g" data-g="' + g[0] + '" style="--i:' + i + '"><span class="wa-gd" aria-hidden="true"></span><span class="wa-gl">' + g[1] + '</span></li>'; }).join('') + '</ol>' +
            '<div class="wa-vh"></div><div class="wa-vs"></div>' +
            '<div class="wa-why"></div>' +
            '<div class="wa-block"><div class="wa-bh wa-cases-h">Typical cases</div><div class="wa-list wa-cases"></div></div>' +
            '<div class="wa-block"><div class="wa-bh">First steps</div><div class="wa-list wa-first"></div></div>' +
            '<div class="wa-block wa-also-b" hidden><div class="wa-bh">Also worth knowing</div><div class="wa-list wa-also"></div></div>' +
            '<div class="wa-hours"></div>' +
            '<div class="wa-next"></div>' +
            '<div class="wa-share"><button type="button" class="wa-mid wa-copy">Copy for an email</button><button type="button" class="wa-mid wa-link">Copy link to this result</button><span class="wa-copied" role="status"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="wa-actions"><button type="button" class="wa-reset">Check another task</button></div>' +
      '</div>';
    var $ = function(s){ return root.querySelector(s); }, ans = {}, started = false, shown = false, last = null;
    var nameIn = $('.wa-in');

    function setOpt(k, v, pre){
      ans[k] = v;
      root.querySelectorAll('.wa-q[data-q="' + k + '"] .wa-opt').forEach(function(b){ b.setAttribute('aria-checked', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      var note = $('.wa-q[data-q="' + k + '"] .wa-pre'); note.hidden = !pre; note.textContent = pre || '';
    }
    function set(k, v, pre){ setOpt(k, v, pre); render(); }
    function hashStr(){
      var h = 'wa=' + KEYS.map(function(k){ return ans[k] || '-'; }).join('.');
      if (nameIn.value.trim()) h += '&t=' + encodeURIComponent(nameIn.value.trim());
      return h;
    }
    // The offer gets the problem and hours, plus the check's result and the task name (c, t), so it can say
    // "From your check" and, for Fix the data first or Write the steps down first, start with the review
    function offerHref(kind, hrs, v){
      var tag = curTag(fallbackTag), k = OFFER_KIND[kind] || 'unsure';
      var h = k === 'unsure' || k === 'machines' ? k : k + (hrs ? '.' + (hrs === 'a0' ? 'a' : hrs) : '');   // machines are counted in machines, not hours
      var t = nameIn.value.trim().slice(0, 80);
      return '/start/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#f=' + h + (v && k !== 'unsure' ? '&c=' + v + '.' + k : '') + (t ? '&t=' + encodeURIComponent(t) : '');
    }
    function list(el, items){ el.innerHTML = items.map(function(t){ return '<div class="wa-w">' + esc(t) + '</div>'; }).join(''); }
    function render(){
      var n = KEYS.filter(function(k){ return ans[k]; }).length, box = $('.wa-verdict');
      $('.wa-progress').textContent = n < KEYS.length ? n + ' of ' + KEYS.length + ' answered. The result shows once all are in.' : '';
      $('.wa-progress').hidden = n === KEYS.length;
      if (n < KEYS.length) { box.hidden = true; last = null; return; }
      var r = verdict(ans), D = V[r.v], sub = r.sub;
      last = r;
      box.className = 'wa-verdict wa-' + D.tone; box.hidden = false;
      $('.wa-stamp').textContent = D.stamp;
      var stop = GATES.map(function(g){ return g[0]; }).indexOf(r.v);
      root.querySelectorAll('.wa-g').forEach(function(li, i){
        li.className = 'wa-g ' + (i < stop ? 'pass' : i === stop ? (r.v === 'automate' ? 'go' : 'stop') : 'off');
        li.setAttribute('aria-label', GATES[i][1] + (i < stop ? ': passed' : i === stop ? (r.v === 'automate' ? ': yes' : ': stops here') : ': not reached'));
      });
      var path = $('.wa-path'); path.classList.remove('run'); void path.offsetWidth; path.classList.add('run');
      $('.wa-task').textContent = nameIn.value.trim() ? 'Task: ' + nameIn.value.trim() : '';
      $('.wa-vh').textContent = sub ? D.head[sub] : D.head;
      $('.wa-vs').textContent = sub ? D.what[sub] : D.what;
      list($('.wa-why'), r.why); $('.wa-why').hidden = !r.why.length;
      $('.wa-cases-h').textContent = sub ? D.casesHead[sub] : 'Typical cases';
      list($('.wa-cases'), sub ? D.cases[sub] : D.cases);
      list($('.wa-first'), sub ? D.first[sub] : D.first);
      list($('.wa-also'), r.also); $('.wa-also-b').hidden = !r.also.length;
      $('.wa-hours').textContent = 'Time on it now: ' + YEAR[ans.hrs] + '.';
      var next = '';
      if (r.v === 'automate' || r.v === 'paper')
        next += '<a class="wa-go" href="' + offerHref(ans.kind, ans.hrs, r.v) + '">' + (r.v === 'paper' ? 'Price the first step: get it on screen →' : 'Get your one-page offer →') + '</a>';
      if (r.v === 'data' || r.v === 'steps')
        next += '<div class="wa-next-t">Fix this first, then the tool. Your one-page offer starts with a one-day process review: £600, credited in full against any build. This result and the task name go with it.</div><a class="wa-go" href="' + offerHref(ans.kind, ans.hrs, r.v) + '">Get your one-page offer →</a> <a class="wa-sec" href="/#contact">Or book a free call →</a>';
      if (r.v === 'paper')
        next += '<div class="wa-next-t">Not sure where to start? A free 30-minute call helps sort it out. A one-day process review is £600, credited in full against any build.</div><a class="wa-sec" href="/#contact">Book a free call →</a>';
      if (r.v === 'steps') next += ' <a class="wa-sec" href="/toolkit/step-timer/">Time how differently it is done →</a>';
      if (r.v === 'leave') next += '<div class="wa-next-t">No tool needed here, and no sale either. Got a bigger task in mind? Check that one.</div>';
      $('.wa-next').innerHTML = next;
      if (useHash) { try { history.replaceState(null, '', location.pathname + location.search + '#' + hashStr()); } catch(e){} }
      if (!shown) { shown = true; track('toolkit/worth-automating/verdict'); }
    }
    function text(){
      var r = last, D = V[r.v], L = [];
      L.push('Worth automating? · meshlock.co.uk/toolkit/worth-automating/');
      if (nameIn.value.trim()) L.push('Task: ' + nameIn.value.trim());
      L.push('Result: ' + D.stamp + '. ' + (r.sub ? D.head[r.sub] : D.head) + '.');
      L.push(r.sub ? D.what[r.sub] : D.what);
      L.push('');
      Q.forEach(function(q){ var o = q.o.filter(function(x){ return x[0] === ans[q.k]; })[0]; L.push('- ' + q.q + ' ' + (o ? o[1] : '')); });
      L.push('');
      L.push('First steps:'); (r.sub ? D.first[r.sub] : D.first).forEach(function(t){ L.push('- ' + t); });
      if (r.also.length) { L.push('Also worth knowing:'); r.also.forEach(function(t){ L.push('- ' + t); }); }
      L.push('Time on it now: ' + YEAR[ans.hrs] + '.');
      L.push('Open this result again: ' + link());
      return L.join('\n');
    }
    function link(){
      var tag = curTag(fallbackTag);
      return 'https://meshlock.co.uk/toolkit/worth-automating/' + (tag ? '?s=' + encodeURIComponent(tag) : '') + '#' + hashStr();
    }
    function copy(t, what){
      var st = $('.wa-copied');
      function done(){ st.textContent = what + ' copied'; setTimeout(function(){ st.textContent = ''; }, 2500); }
      function fallback(){ var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(e){ st.textContent = 'Copy not available here'; } document.body.removeChild(ta); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
      track('toolkit/worth-automating/copy');
    }

    root.querySelectorAll('.wa-q[data-q]').forEach(function(q){
      q.addEventListener('click', function(e){
        var b = e.target.closest('.wa-opt'); if (!b) return;
        if (!started) { started = true; track('toolkit/worth-automating/start'); }
        set(q.getAttribute('data-q'), b.getAttribute('data-v'));
      });
    });
    nameIn.addEventListener('input', function(){ if (last) render(); });
    root.addEventListener('click', function(e){
      if (e.target.closest('.wa-go')) track('toolkit/worth-automating/to-offer');
      if (e.target.closest('.wa-copy')) copy(text(), 'Result');
      if (e.target.closest('.wa-link')) copy(link(), 'Link');
    });
    $('.wa-reset').addEventListener('click', function(){
      ans = {}; shown = false; last = null; nameIn.value = '';
      root.querySelectorAll('.wa-opt').forEach(function(b){ b.setAttribute('aria-checked', 'false'); });
      root.querySelectorAll('.wa-pre').forEach(function(p){ p.hidden = true; });
      if (useHash) { try { history.replaceState(null, '', location.pathname + location.search); } catch(e){} }
      render();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Answers from the link: a saved result, or a frequency and hours from the step timer
    var FREQ_NOTE = { daily: 'From the step timer: 5 or more times a week.', weekly: 'From the step timer: 1 to 4 times a week.', rare: 'From the step timer: less than once a week.' };
    function preset(f, b){
      if (FREQ_NOTE[f]) setOpt('freq', f, FREQ_NOTE[f]);
      if (b && /^[abcd]$/.test(b)) setOpt('hrs', b, 'From the step timer.');
      render();
    }
    var h = location.hash.replace(/^#/, ''), p = new URLSearchParams(h);
    var saved = (p.get('wa') || '').split('.');
    if (saved.length === KEYS.length) {
      KEYS.forEach(function(k, i){ if (Q[i].o.some(function(o){ return o[0] === saved[i]; })) setOpt(k, saved[i]); });
      if (p.get('t')) nameIn.value = p.get('t').slice(0, 60);
      render();
    } else if (p.get('freq')) preset(p.get('freq'), p.get('hrs'));
    document.addEventListener('ml:freq', function(e){ if (e.detail) preset(e.detail.freq, e.detail.bucket); });
    render();
  }

  window.mlWorthVerdict = verdict;   // for the site check
  function init(){ document.querySelectorAll('[data-tool="worth-automating"]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
