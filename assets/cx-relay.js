/* cx-relay.js — 기기 사이 시연 상태 중계
 *
 *  localStorage 는 기기 밖으로 나가지 않는다. 노트북 CONEXUS 화면과 현장의 휴대폰 앱이
 *  같은 상태를 보려면 중간에 거쳐 갈 곳이 하나 필요하다.
 *  ntfy.sh(오픈소스 pub/sub 공개 인스턴스)의 토픽 하나를 통로로 쓴다. 계정·키가 없다.
 *
 *  나르는 값 (localStorage 칸 그대로)
 *    cx.live    주총 현장 제어 → 투표 앱 · 시청 페이지   (표결 진행 상태)
 *    cx.collect 의결권 수집 앱 → CONEXUS                (위임 완료 주주)
 *    cx.app.px  의결권 수집 앱 → CONEXUS                (위임한 의안별 의향)
 *    cx.onsite  현장투표 앱   → CONEXUS                (현장 표결 결과)
 *    cx.att     현장 참석 등록
 *
 *  어느 페이지든 이 파일만 불러 두면 된다. 페이지 코드는 손댈 것이 없다 —
 *  위 칸이 바뀌면 알아서 내보내고, 받은 값은 localStorage 에 써 넣은 뒤
 *  storage 이벤트를 흉내 내므로 기존 구독 코드가 그대로 동작한다.
 *  연결이 안 되면 조용히 포기하고 같은 기기 안의 localStorage 경로로만 동작한다.
 *
 *  토픽 바꾸기 — ?relay=<이름> 또는 페이지에서 window.CX_RELAY_TOPIC 지정
 */
(function () {
  if (window.cxRelay) return;

  var KEYS = ['cx.live', 'cx.collect', 'cx.app.px', 'cx.onsite', 'cx.att'];
  var HOST = 'https://ntfy.sh';
  var topic = (location.search.match(/[?&]relay=([A-Za-z0-9_-]{4,64})/) || [])[1]
    || window.CX_RELAY_TOPIC || 'cx-kudos-live-9f73a2c4';
  var SELF = Math.random().toString(36).slice(2);   /* 내가 보낸 것은 되받지 않는다 */

  var seen = {};        /* 칸별로 마지막에 내보냈거나 받아들인 내용 */
  var stamp = {};       /* 칸별로 마지막에 받아들인 시각 — 오래된 것은 버린다 */
  KEYS.forEach(function (k) { seen[k] = read(k); stamp[k] = 0; });

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* 받은 값을 로컬에 반영 */
  function apply(k, txt, t) {
    if (KEYS.indexOf(k) < 0 || txt == null) return;
    if (t && stamp[k] && t <= stamp[k]) return;       /* 늦게 도착한 옛 값 */
    if (read(k) === txt) { seen[k] = txt; return; }
    stamp[k] = t || Date.now();
    seen[k] = txt;                                     /* 이걸 다시 내보내지 않도록 */
    try { localStorage.setItem(k, txt); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: txt })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cx-relay', { detail: { key: k, value: txt } })); } catch (e) {}
  }

  /* 사람별로 쌓이는 칸은 통째로 보내면 위임이 늘수록 매번 전부 다시 나간다.
     바뀐 항목만 추려 보내고 받는 쪽에서 합친다. */
  var PATCH = { 'cx.app.px': 1 };
  function obj(t) { try { var o = JSON.parse(t); return (o && typeof o === 'object' && !(o instanceof Array)) ? o : null; } catch (e) { return null; } }
  function diff(oldT, newT) {
    var a = obj(oldT), b = obj(newT);
    if (!a || !b) return null;
    var put = {}, del = [], n = 0, k;
    for (k in b) if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) { put[k] = b[k]; n++; }
    for (k in a) if (!(k in b)) { del.push(k); n++; }
    if (!n) return { put: {}, del: [] };
    return { put: put, del: del };
  }
  function merge(k, d) {
    var cur = obj(read(k)) || {};
    Object.keys(d.put || {}).forEach(function (x) { cur[x] = d.put[x]; });
    (d.del || []).forEach(function (x) { delete cur[x]; });
    var txt = JSON.stringify(cur);
    seen[k] = txt;
    try { localStorage.setItem(k, txt); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: txt })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cx-relay', { detail: { key: k, value: txt } })); } catch (e) {}
  }

  /* ntfy 한 건은 4KB 를 넘지 못한다 — 큰 값(신분증 사진 등)은 조각으로 나눠 보낸다 */
  var MAX = 2400;
  function post(obj) {
    try {
      fetch(HOST + '/' + topic, { method: 'POST', body: JSON.stringify(obj) }).catch(function () {});
    } catch (e) {}
  }
  function send(k, txt, prev) {
    seen[k] = txt;
    var t = Date.now();
    /* 바뀐 항목만 추려 보낼 수 있으면 그렇게 한다 — 사진이 쌓여도 새 건만 나간다 */
    if (PATCH[k] && prev != null) {
      var d = diff(prev, txt);
      if (d) {
        var pt = JSON.stringify({ from: SELF, k: k, p: d.put, x: d.del, t: t });
        if (pt.length < txt.length) { sendText(k, pt, t, d); return; }
      }
    }
    if (txt.length <= MAX) { post({ from: SELF, k: k, v: txt, t: t }); return; }
    var id = SELF + '-' + t, n = Math.ceil(txt.length / MAX);
    for (var i = 0; i < n; i++) {
      (function (i) {
        /* 한꺼번에 쏘면 받는 쪽에서 밀리므로 조금씩 띄워 보낸다 */
        setTimeout(function () {
          post({ from: SELF, k: k, id: id, i: i, n: n, c: txt.substr(i * MAX, MAX), t: t });
        }, i * 150);
      })(i);
    }
  }
  /* 패치 한 건 — 작으면 그대로, 크면 조각으로 */
  function sendText(k, body, t, d) {
    if (body.length <= MAX) { post(JSON.parse(body)); return; }
    var id = SELF + '-' + t + '-p', n = Math.ceil(body.length / MAX);
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          post({ from: SELF, k: k, id: id, i: i, n: n, c: body.substr(i * MAX, MAX), t: t, pw: 1 });
        }, i * 150);
      })(i);
    }
  }
  /* 조각 모으기 — 다 모이면 한 값으로 합쳐 반영한다 */
  var BUF = {};
  function take(p) {
    if (!p || p.from === SELF) return;
    if (p.id) {
      var b = BUF[p.id] || (BUF[p.id] = { k: p.k, n: p.n, t: p.t, got: 0, parts: [], pw: p.pw });
      if (b.parts[p.i] == null) { b.parts[p.i] = p.c; b.got++; }
      if (b.got >= b.n) {
        var whole = b.parts.join('');
        if (b.pw) { try { take(JSON.parse(whole)); } catch (e) {} }
        else apply(b.k, whole, b.t);
        delete BUF[p.id];
      }
      return;
    }
    if (p.k && p.p) { merge(p.k, { put: p.p, del: p.x }); return; }   /* 바뀐 항목만 온 경우 */
    if (p.k) { apply(p.k, p.v, p.t); return; }
    if (p.s) apply('cx.live', JSON.stringify(p.s), p.t);   /* 예전 형식 */
  }
  /* 예전 방식 호출 호환 — cxRelay.publish(상태객체) 또는 publish('cx.live', 값) */
  function publish(a, b) {
    if (typeof a === 'string') { send(a, typeof b === 'string' ? b : JSON.stringify(b)); return; }
    if (a && typeof a === 'object') send('cx.live', JSON.stringify(a));
  }

  /* 로컬에서 값이 바뀌면 내보낸다 — 페이지마다 코드를 고칠 필요가 없다 */
  function watch() {
    KEYS.forEach(function (k) {
      var now = read(k);
      if (now === seen[k]) return;
      /* 지운 것도 빈 값으로 알려야 다른 기기에 남은 옛 기록이 지워진다 */
      var prev = seen[k];
      if (now == null) { send(k, '{}'); seen[k] = null; return; }
      send(k, now, prev);
    });
  }
  setInterval(watch, 700);
  window.addEventListener('storage', function (e) {     /* 같은 기기의 다른 탭 */
    if (KEYS.indexOf(e.key) >= 0) watch();
  });

  var es = null, wait = 0;
  function connect() {
    try { if (es) es.close(); } catch (e) {}
    try {
      es = new EventSource(HOST + '/' + topic + '/sse');
      es.onopen = function () { wait = 0; window.cxRelay.ok = true; };
      es.onmessage = function (ev) {
        try {
          var m = JSON.parse(ev.data);
          if (m.event !== 'message' || !m.message) return;
          take(JSON.parse(m.message));
        } catch (e) {}
      };
      es.onerror = function () {
        window.cxRelay.ok = false;
        try { es.close(); } catch (e) {}
        wait = Math.min(30000, (wait || 1000) * 2);
        setTimeout(connect, wait);
      };
    } catch (e) {}
  }

  /* 늦게 들어온 기기 — 최근에 지나간 값을 칸마다 한 번씩 받아 둔다 */
  function catchUp() {
    try {
      fetch(HOST + '/' + topic + '/json?poll=1&since=12h')
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var last = {}, groups = {}, patches = [];
          t.split('\n').forEach(function (l) {
            if (!l.trim()) return;
            try {
              var m = JSON.parse(l);
              if (m.event !== 'message' || !m.message) return;
              var p = JSON.parse(m.message);
              if (p.k && p.p) { patches.push(p); return; }  /* 바뀐 항목만 — 나중에 순서대로 */
              if (p.id) {                                   /* 조각난 값 — 먼저 모은다 */
                var g = groups[p.id] || (groups[p.id] = { k: p.k, n: p.n, t: p.t || 0, got: 0, parts: [] });
                if (g.parts[p.i] == null) { g.parts[p.i] = p.c; g.got++; }
                return;
              }
              var k = p.k || (p.s ? 'cx.live' : null);
              var v = p.k ? p.v : (p.s ? JSON.stringify(p.s) : null);
              if (!k || v == null) return;
              if (!last[k] || (p.t || 0) > last[k].t) last[k] = { v: v, t: p.t || 0 };
            } catch (e) {}
          });
          Object.keys(groups).forEach(function (id) {
            var g = groups[id];
            if (g.got < g.n) return;                         /* 덜 온 묶음은 버린다 */
            var v = g.parts.join('');
            if (!last[g.k] || g.t > last[g.k].t) last[g.k] = { v: v, t: g.t };
          });
          Object.keys(last).forEach(function (k) { apply(k, last[k].v, last[k].t); });
          patches.sort(function (a, b) { return (a.t || 0) - (b.t || 0); })
                 .forEach(function (p) { merge(p.k, { put: p.p, del: p.x }); });
        })
        .catch(function () {});
    } catch (e) {}
  }

  window.cxRelay = { topic: topic, keys: KEYS, ok: false, publish: publish, connect: connect };
  connect();
  catchUp();
  /* 화면으로 돌아왔을 때 끊겨 있으면 다시 잇고 밀린 값을 받아온다 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!window.cxRelay.ok) connect();
    catchUp();
  });
})();
