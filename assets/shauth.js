/* shauth.js — 주주인증 모달 (Figma 11073:16157)
 * 사전 신청을 누르면 먼저 본인을 확인한다. 기업 상세·주주PASS 홈이 같이 쓴다.
 *   SHAUTH.open({ co:'카카오뱅크', term:'제10기 정기주주총회', base:'2026.08.31', name:'박성용' }, done)
 */
(function (global) {
  'use strict';
  var TERMS = [
    { k: 't1', t: '[필수] 이용약관' },
    { k: 't2', t: '[필수] 개인정보 수집·이용 동의' },
    { k: 't3', t: '[필수] 개인정보 제3자 제공 동의' }
  ];
  var OK = {}, then = null, built = false;

  var CSS = ''
    + '.sa-ovl{position:fixed;inset:0;z-index:900;background:rgba(10,12,20,.55);display:none;'
    + 'align-items:center;justify-content:center;padding:16px}'
    + '.sa-ovl.on{display:flex}'
    + '.sa{box-sizing:border-box;width:500px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);'
    + 'overflow-y:auto;background:#fff;border-radius:16px;padding:24px;display:flex;flex-direction:column;'
    + 'box-shadow:0 20px 48px rgba(16,24,40,.22);font-family:inherit}'
    + '.sa-h{display:flex;align-items:center;justify-content:space-between;gap:8px}'
    + '.sa-h b{font-size:20px;line-height:28px;font-weight:700;color:#151419}'
    + '.sa-x{width:24px;height:24px;border:0;background:none;padding:0;cursor:pointer;color:#151419}'
    + '.sa-x svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}'
    + '.sa-co{margin-top:20px;padding:16px;border-radius:12px;background:#F5F5F5;display:flex;flex-direction:column;gap:4px}'
    + '.sa-co b{font-size:16px;line-height:24px;font-weight:700;color:#151419}'
    + '.sa-co span{font-size:14px;line-height:20px;color:#8A8F99}'
    + '.sa-f{margin-top:20px;display:flex;flex-direction:column;gap:8px}'
    + '.sa-f label{font-size:14px;line-height:20px;font-weight:600;color:#151419}'
    + '.sa-f input{box-sizing:border-box;height:48px;padding:0 14px;border:1px solid #E5E5E5;border-radius:10px;'
    + 'background:#fff;font-family:inherit;font-size:15px;color:#151419;outline:none}'
    + '.sa-f input::placeholder{color:#A1A1AA}'
    + '.sa-f input:focus{border-color:#151419}'
    + '.sa-f input[readonly]{background:#F5F5F5}'
    + '.sa-rrn{display:flex;align-items:center;gap:10px}'
    + '.sa-rrn input{flex:1;min-width:0}'
    + '.sa-rrn .dash{flex:none;color:#8A8F99}'
    + '.sa-ag{display:flex;align-items:center;gap:4px;height:24px;margin-top:24px}'
    + '.sa-ag b{font-size:14px;line-height:21px;font-weight:400;letter-spacing:-.01em;color:#151419;cursor:pointer}'
    + '.sa-tms{display:flex;flex-direction:column}'
    + '.sa-tm{display:flex;align-items:center;gap:4px;height:24px}'
    + '.sa-tm .t{flex:1;min-width:0;font-size:14px;line-height:21px;letter-spacing:-.01em;color:#151419;cursor:pointer}'
    + '.sa-tm .go{flex:none;width:24px;height:24px;border:0;background:none;padding:0;cursor:pointer;color:#6B7078;'
    + 'display:flex;align-items:center;justify-content:center}'
    + '.sa-tm .go svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    /* 체크박스 — 18px 라운드 사각, 켜지면 먹색 바탕에 흰 체크 */
    + '.sa-ck{box-sizing:border-box;flex:none;width:18px;height:18px;border:1px solid #EEF0F2;border-radius:6px;'
    + 'background:#fff;position:relative;cursor:pointer;transition:.12s}'
    + '.sa-ck::after{content:"";position:absolute;left:5.6px;top:3.4px;width:4.4px;height:8.2px;'
    + 'border:1.8px solid #CBCDD2;border-left:0;border-top:0;transform:rotate(45deg);opacity:0;transition:.12s}'
    + '.sa-ck.on{border-color:#151419;background:#151419}'
    + '.sa-ck.on::after{border-color:#fff;opacity:1}'
    + '.sa-go{margin-top:28px;flex:none;height:56px;border:0;border-radius:12px;background:#151419;color:#fff;'
    + 'font-family:inherit;font-size:16px;font-weight:700;cursor:pointer}'
    + '.sa-go:disabled{background:#D4D4D8;cursor:default}'
    + '.sa-note{margin-top:14px;font-size:12.5px;line-height:1.6;color:#8A8F99;text-align:center}';

  function el(id) { return document.getElementById(id); }
  function build() {
    if (built) return; built = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var ov = document.createElement('div');
    ov.className = 'sa-ovl'; ov.id = 'saOvl';
    ov.innerHTML = '<div class="sa" role="dialog" aria-modal="true" aria-labelledby="saT">'
      + '<div class="sa-h"><b id="saT">주주인증</b>'
      + '<button class="sa-x" type="button" id="saX" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>'
      + '<div class="sa-co"><b id="saCo"></b><span id="saBase"></span></div>'
      + '<div class="sa-f"><label for="saName">이름</label><input id="saName" type="text" autocomplete="name"></div>'
      + '<div class="sa-f"><label for="saRrn2">주민등록번호</label>'
      + '<div class="sa-rrn"><input id="saRrn1" type="text" readonly><span class="dash">-</span>'
      + '<input id="saRrn2" type="password" inputmode="numeric" maxlength="7" placeholder="뒷자리 입력"></div></div>'
      + '<div class="sa-ag"><span class="sa-ck" id="saAll" role="button"></span><b id="saAllT">전체 동의</b></div>'
      + '<div class="sa-tms" id="saTerms"></div>'
      + '<button class="sa-go" type="button" id="saGo" disabled>주주 인증하기</button>'
      + '<div class="sa-note">주주명부와 대조해 본인 여부를 확인합니다.</div>'
      + '</div>';
    document.body.appendChild(ov);

    el('saX').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    function toggleAll() {
      var all = TERMS.every(function (t) { return OK[t.k]; });
      TERMS.forEach(function (t) { OK[t.k] = !all; });
      draw(); sync();
    }
    el('saAll').addEventListener('click', toggleAll);
    el('saAllT').addEventListener('click', toggleAll);
    ['saName', 'saRrn2'].forEach(function (id) { el(id).addEventListener('input', sync); });
    el('saRrn2').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 7); });
    el('saGo').addEventListener('click', function () {
      if (this.disabled) return;
      close();
      var f = then; then = null;
      if (f) setTimeout(f, 180);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('on')) close();
    });
  }
  function draw() {
    el('saAll').className = 'sa-ck' + (TERMS.every(function (t) { return OK[t.k]; }) ? ' on' : '');
    el('saTerms').innerHTML = TERMS.map(function (t) {
      return '<div class="sa-tm"><span class="sa-ck' + (OK[t.k] ? ' on' : '') + '" data-sa="' + t.k + '" role="button"></span>'
        + '<span class="t" data-sa="' + t.k + '" role="button">' + t.t + '</span>'
        + '<button class="go" type="button" data-sahelp="' + t.t + '" aria-label="약관 보기">'
        + '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button></div>';
    }).join('');
    el('saTerms').querySelectorAll('[data-sa]').forEach(function (b) {
      b.addEventListener('click', function () { OK[b.dataset.sa] = !OK[b.dataset.sa]; draw(); sync(); });
    });
    el('saTerms').querySelectorAll('[data-sahelp]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (global.say) global.say(b.dataset.sahelp, '시연용 화면입니다. 약관 전문은 제공되지 않습니다.');
      });
    });
  }
  function sync() {
    var nm = el('saName').value.trim();
    var r2 = el('saRrn2').value.replace(/\D/g, '');
    var all = TERMS.every(function (t) { return OK[t.k]; });
    el('saGo').disabled = !(nm && r2.length === 7 && all);
  }
  function close() { var o = el('saOvl'); if (o) o.classList.remove('on'); }
  function open(info, done) {
    build();
    info = info || {}; then = done || null; OK = {};
    el('saCo').textContent = (info.co || '') + (info.term ? ' · ' + info.term : '');
    el('saBase').textContent = '주주명부 기준일 ' + (info.base || '2026.08.31');
    el('saName').value = info.name || '';
    el('saRrn1').value = info.rrn || '900301';
    el('saRrn2').value = '';
    draw(); sync();
    el('saOvl').classList.add('on');
    setTimeout(function () { el('saRrn2').focus(); }, 120);
  }
  global.SHAUTH = { open: open, close: close };
})(window);
