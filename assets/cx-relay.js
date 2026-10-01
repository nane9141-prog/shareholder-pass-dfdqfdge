/* cx-relay.js — 기기 사이 표결 상태 중계
 *
 *  localStorage 는 기기 밖으로 나가지 않는다. 노트북 제어 화면에서 바꾼 상태를
 *  현장의 휴대폰 앱이 보려면 중간에 거쳐 갈 곳이 하나 필요하다.
 *  ntfy.sh(오픈소스 pub/sub 공개 인스턴스)의 토픽 하나를 통로로 쓴다. 계정·키가 없다.
 *
 *  받은 상태는 그대로 localStorage 'cx.live' 에 써 넣고 storage 이벤트를 흉내 내므로,
 *  기존 코드(cxSync.on / vote.js 의 1초 폴링)는 손댈 것이 없다.
 *  연결이 안 되면 조용히 포기하고 같은 기기 안의 localStorage 경로로만 동작한다.
 *
 *  토픽 바꾸기 — ?relay=<이름> 또는 페이지에서 window.CX_RELAY_TOPIC 지정
 */
(function () {
  if (window.cxRelay) return;
  var KEY = 'cx.live';
  var HOST = 'https://ntfy.sh';
  var topic = (location.search.match(/[?&]relay=([A-Za-z0-9_-]{4,64})/) || [])[1]
    || window.CX_RELAY_TOPIC || 'cx-kudos-live-9f73a2c4';
  var SELF = Math.random().toString(36).slice(2);   /* 내가 보낸 것은 되받지 않는다 */

  function cur() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }

  /* 받은 상태를 로컬에 반영 — 더 오래된 것은 버린다 */
  function apply(s) {
    if (!s || !s.ts) return;
    if ((cur().ts || 0) >= s.ts) return;
    var txt = JSON.stringify(s);
    try { localStorage.setItem(KEY, txt); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: txt })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('cx-relay', { detail: s })); } catch (e) {}
  }

  function publish(s) {
    if (!s || !s.ts) return;
    try {
      fetch(HOST + '/' + topic, {
        method: 'POST',
        body: JSON.stringify({ from: SELF, s: s })
      }).catch(function () {});
    } catch (e) {}
  }

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
          var p = JSON.parse(m.message);
          if (p.from === SELF) return;
          apply(p.s);
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

  /* 늦게 들어온 기기 — 최근에 지나간 상태를 한 번 받아 둔다 */
  function catchUp() {
    try {
      fetch(HOST + '/' + topic + '/json?poll=1&since=12h')
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var last = null;
          t.split('\n').forEach(function (l) {
            if (!l.trim()) return;
            try {
              var m = JSON.parse(l);
              if (m.event !== 'message' || !m.message) return;
              var p = JSON.parse(m.message);
              if (p.s && p.s.ts && (!last || p.s.ts > last.ts)) last = p.s;
            } catch (e) {}
          });
          if (last) apply(last);
        })
        .catch(function () {});
    } catch (e) {}
  }

  window.cxRelay = { topic: topic, ok: false, publish: publish, connect: connect };
  connect();
  catchUp();
  /* 화면으로 돌아왔을 때 끊겨 있으면 다시 잇고 밀린 상태를 받아온다 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!window.cxRelay.ok) connect();
    catchUp();
  });
})();
