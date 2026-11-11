/* 기업 목록 — 목록 화면(index)과 상세 화면(company)이 같은 표를 본다.
   key 는 로고 파일 이름(assets/logo-<key>.png)이자 상세 화면 주소의 co 값이다.
   mine 은 로그인한 주주가 주식을 들고 있는 기업으로, 상세 화면으로 들어갈 수 있다. */
window.PASS_USER = { name: '박성용' };

window.PASS_CO = [
  { key: 'kakaobank', nm: '카카오뱅크', term: '제10기 정기주주총회', status: 'live', apply: 'applied',
    date: '2026년 9월 29일 (화)', time: '오전 10:00',
    place: '서울 영등포구 카카오뱅크 본사 대강당',
    hero: ['#ffe98a', '#ffd21f'], ink: '#1a1a1a',
    video: 'assets/kakaobank.mp4',
    mine: true, kind: '보통주', shares: '1,200주', limit: '500주', dday: 'D-14' },

  { key: 'naver', nm: '네이버', term: '제27기 정기주주총회', status: 'dn', apply: 'applied',
    date: '2026년 9월 29일 (화)', time: '오전 11:00',
    place: '경기 성남시 분당구 네이버 1784 커넥트홀',
    hero: ['#b7f5c9', '#03c75a'], ink: '#0b3d20',
    mine: true, kind: '보통주', shares: '20,000주', limit: '0주', dday: 'D-2' },

  { key: 'hyundai', nm: '현대차', term: '제9기 정기주주총회', status: 'dday',
    date: '2026년 9월 29일 (화)', time: '오전 9:00',
    place: '서울 서초구 현대차 본사 대강당',
    hero: ['#7d97c8', '#0a2a66'], ink: '#fff',
    kind: '보통주', shares: '340주', limit: '0주', dday: 'D-day' },

  { key: 'kudoselectric', nm: '큐더스전자', term: '제10기 정기주주총회', status: 'live', apply: 'applied',
    date: '2026년 9월 29일 (화)', time: '오전 10:00',
    place: '서울 강남구 큐더스전자 본사 대강당',
    hero: ['#1b2a3a', '#0a0f16'], ink: '#fff', banner: 'assets/banner-kudoselectric.jpg',
    video: 'assets/kudoselectric.mp4',
    mine: true, kind: '보통주', shares: '1,200주', limit: '500주', dday: 'D-14' },

  { key: 'shinsegae', nm: '신세계', term: '제9기 정기주주총회', status: 'end',
    date: '2026년 3월 13일 (금)', time: '오전 9:00',
    place: '서울 중구 신세계빌딩 대강당',
    hero: ['#f2708f', '#e11d48'], ink: '#fff',
    mine: true, kind: '보통주', shares: '260주', limit: '0주' },

  { key: 'kia', nm: '기아', term: '제9기 정기주주총회', status: 'end',
    date: '2026년 3월 12일 (목)', time: '오전 9:00',
    place: '서울 서초구 기아 본사 대강당',
    hero: ['#6b6b6b', '#111'], ink: '#fff',
    mine: true, kind: '보통주', shares: '1,050주', limit: '120주' },

  { key: 'korea-zinc', nm: '고려아연', term: '제9기 정기주주총회', status: 'dn', d: 'D-1',
    date: '2026년 10월 13일 (화)', time: '오전 10:00',
    place: '서울 강남구 본사 대회의실',
    hero: ['#5fbf9b', '#0f7d57'], ink: '#fff',
    mine: true, kind: '보통주', shares: '85주', limit: '0주', dday: 'D-1' },

  { key: 'hanmi', nm: '한미반도체', term: '제9기 정기주주총회', status: 'dn', d: 'D-12' },
  { key: 'dalba', nm: '달바글로벌', term: '제9기 정기주주총회', status: 'end' },
  { key: 'gs', nm: 'GS', term: '제9기 정기주주총회', status: 'dn', d: 'D-12' },
  { key: 'hanwha-aero', nm: '한화에어로스페이스', term: '제9기 정기주주총회', status: 'dn', d: 'D-12' },
  { key: 'mirae-asset', nm: '미래에셋증권', term: '제9기 정기주주총회', status: 'end' },
  { key: 'nongshim', nm: '농심', term: '제9기 정기주주총회', status: 'dn', d: 'D-12' },
  { key: 'hd-hyundai', nm: 'HD현대', term: '제9기 정기주주총회', status: 'end' },
  { key: 'shinhan', nm: '신한지주', term: '제9기 정기주주총회', status: 'end' },
  { key: 'musinsa', nm: '무신사', term: '제9기 정기주주총회', status: 'dn', d: 'D-12' },
  { key: 'korean-air', nm: '대한항공', term: '제9기 정기주주총회', status: 'end' }
];

window.PASS_FIND = function (key) {
  var hit = window.PASS_CO.filter(function (c) { return c.key === key; })[0];
  return hit || window.PASS_CO[0];
};

/* 브라우저 탭 아이콘 — 기업 화면(?co=)은 그 기업 로고, 목록·마이페이지는 주주PASS 로고.
   시청 화면은 co 가 없으면 카카오뱅크로 연다(live.html 과 같은 기본값). */
(function () {
  var k = new URLSearchParams(location.search).get('co');
  if (!k && /live\.html$/.test(location.pathname)) k = 'kakaobank';
  if (k && !window.PASS_CO.some(function (c) { return c.key === k; })) k = window.PASS_CO[0].key;
  var l = document.createElement('link');
  l.rel = 'icon'; l.href = k ? 'assets/fav-' + k + '.png?v=2' : 'assets/fav-pass.png?v=4';   /* 탭 전용 정사각형(여백·그림자 없음) */
  document.head.appendChild(l);
})();
