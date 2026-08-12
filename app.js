const PRODUCTS = [
  {
    id: 'kun',
    name: 'お香くん',
    tag: '整える・集中',
    short: 'すっきり気持ちを切り替えたい日に。',
    price: 1200,
    visual: 'kun',
    emoji: '🌿',
    strengths: { mood: 3, energy: 4, fatigue: 2, focus: 5 },
  },
  {
    id: 'chan',
    name: 'お香ちゃん',
    tag: 'ゆるめる・休息',
    short: '力を抜いて、自分のペースに戻りたい日に。',
    price: 1200,
    visual: 'chan',
    emoji: '🌙',
    strengths: { mood: 5, energy: 2, fatigue: 5, focus: 2 },
  },
];

const DAILY_QUESTIONS = [
  { q: '今日は、どんな時間を一番ほしい？', a: ['集中する時間', 'ゆっくりする時間', '気持ちを切り替える時間', '何もしない時間'] },
  { q: '今の自分に一番近い言葉は？', a: ['前向き', '少し疲れた', '考えごとが多い', '穏やか'] },
  { q: '今日の夜、どう過ごせたらうれしい？', a: ['静かに休む', '好きなことに没頭', '早めに眠る', '誰かと話す'] },
];

const KEY = 'incenseMockV001';
const DEFAULT_STATE = {
  view: 'home',
  checkin: { mood: 4, energy: 3, fatigue: 4, focus: 3 },
  dailyAnswer: null,
  recommendation: 'chan',
  records: [
    { date: '2026-08-06', mood: 3, energy: 3, fatigue: 4, focus: 2 },
    { date: '2026-08-07', mood: 4, energy: 4, fatigue: 3, focus: 4 },
    { date: '2026-08-08', mood: 3, energy: 2, fatigue: 4, focus: 2 },
    { date: '2026-08-09', mood: 4, energy: 3, fatigue: 3, focus: 3 },
    { date: '2026-08-10', mood: 4, energy: 3, fatigue: 2, focus: 4 },
    { date: '2026-08-11', mood: 3, energy: 3, fatigue: 4, focus: 3 },
  ],
  usage: [
    { date: '2026-08-07 21:10', productId: 'chan', before: '少し疲れた', after: '落ち着いた' },
    { date: '2026-08-09 20:40', productId: 'chan', before: '考えごとが多い', after: '気持ちがゆるんだ' },
    { date: '2026-08-10 10:05', productId: 'kun', before: '集中したい', after: '切り替えられた' },
  ],
  stock: { kun: 55, chan: 35 },
  qty: { kun: 1, chan: 2 },
  streak: 6,
};

let state = loadState();
const main = document.getElementById('appMain');
const navItems = [...document.querySelectorAll('.nav-item')];
const toast = document.getElementById('toast');
const backdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? { ...structuredClone(DEFAULT_STATE), ...saved } : structuredClone(DEFAULT_STATE);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState() { localStorage.setItem(KEY, JSON.stringify(state)); }
function yen(n) { return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n); }
function todayISO() {
  const d = new Date();
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function showToast(msg) {
  toast.textContent = msg; toast.classList.add('show');
  clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 1800);
}
function product(id) { return PRODUCTS.find(p => p.id === id); }

function setView(view) {
  state.view = view; saveState();
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === view));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function productVisual(p, small=false) {
  if (small) return `<div class="mini-visual ${p.visual === 'chan' ? 'warm' : ''}">${p.emoji}</div>`;
  return `<div class="product-visual ${p.visual}"><span class="smoke">〰</span><div class="face"></div></div>`;
}

function flowStrip() {
  return `
    <div class="flow-strip" aria-label="利用フロー">
      <div class="flow-step"><div class="flow-icon">✎</div><span>質問・記録</span></div>
      <div class="flow-step"><div class="flow-icon">🌱</div><span>おすすめ提案</span></div>
      <div class="flow-step"><div class="flow-icon">♨</div><span>使用履歴</span></div>
      <div class="flow-step"><div class="flow-icon">☷</div><span>おすすめ<br>ブラッシュアップ<br>＆数量調整</span></div>
      <div class="flow-step"><div class="flow-icon">▢</div><span>購入</span></div>
    </div>`;
}

function renderHome() {
  const rec = product(state.recommendation);
  const q = DAILY_QUESTIONS[new Date().getDate() % DAILY_QUESTIONS.length];
  const avg = state.records.length ? Math.round(state.records.slice(-7).reduce((s,r)=>s+r.mood,0) / Math.min(7,state.records.length) * 10) / 10 : '-';
  return `
    <section class="hero">
      <div class="eyebrow">TODAY</div>
      <h1>今日のわたしに、<br>ちょうどいい香りを。</h1>
      <p>気分を少しだけ記録すると、今の状態に合うお香を提案します。使った履歴は、次回購入のおすすめにも反映されます。</p>
      <div class="hero-actions">
        <button class="btn primary" data-go="checkin">今日の記録をする</button>
        <button class="btn secondary" data-go="purchase">次回おすすめ</button>
      </div>
    </section>

    <section class="section">
      <div class="grid-2">
        <div class="card metric"><div class="label">7日間の気分</div><div class="value">${avg}</div><div class="caption">5段階の平均</div></div>
        <div class="card metric"><div class="label">連続記録</div><div class="value">${state.streak}<small style="font-size:14px">日</small></div><div class="caption">少しずつ続いています</div></div>
      </div>
      <div class="streak">${['月','火','水','木','金','土','日'].map((d,i)=>`<i class="${i < Math.min(state.streak,7) ? 'done':''}">${d}</i>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><div class="section-title">今日の一問</div><div class="section-note">お香を使わない日も、30秒で。</div></div></div>
      <div class="card daily-question">
        <div class="bubble">☁</div>
        <div style="flex:1"><h3>${q.q}</h3><p>答えは任意です。今の自分を知るヒントとして記録されます。</p>
          <div class="chips">${q.a.map(x=>`<button class="chip ${state.dailyAnswer===x?'active':''}" data-daily="${x}">${x}</button>`).join('')}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><div class="section-title">今日のおすすめ</div><div class="section-note">現在の記録から仮提案</div></div><button class="link-btn" data-go="checkin">記録を更新</button></div>
      <div class="card recommendation">
        <div class="reco-head">
          <div class="reco-icon">${rec.emoji}</div>
          <div><h3>${rec.name}</h3><p>${rec.short}<br>使用履歴が増えるほど、おすすめが自分向けに調整されます。</p></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn primary small" data-use="${rec.id}">今日使う</button>
          <button class="btn ghost small" data-go="purchase">次回購入をみる</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div class="section-title">商品</div><div class="section-note">2種類</div></div>
      ${PRODUCTS.map(p=>`<div class="card product-card">${productVisual(p)}<div class="product-meta"><h3>${p.name}</h3><p>${p.short}</p><span class="tag ${p.id==='chan'?'warm':''}">${p.tag}</span><div class="progress-wrap"><div class="progress-label"><span>推定残量</span><b>${state.stock[p.id]}%</b></div><div class="progress"><i style="width:${state.stock[p.id]}%"></i></div></div></div></div>`).join('')}
    </section>

    <section class="section"><div class="card card-soft"><div class="section-title" style="font-size:14px">このモックの利用イメージ</div>${flowStrip()}</div></section>
  `;
}

function renderCheckin() {
  const fields = [
    ['mood','今日の気分',['😣','😕','😐','🙂','😊']],
    ['energy','心の元気',['1','2','3','4','5']],
    ['fatigue','身体の疲れ',['1','2','3','4','5']],
    ['focus','集中度',['1','2','3','4','5']],
  ];
  return `
    <section class="hero">
      <div class="eyebrow">DAILY CHECK-IN</div>
      <h1>今日の状態を<br>少しだけ教えてください。</h1>
      <p>全部埋めなくても構いません。モックでは4項目の回答からおすすめを切り替えます。</p>
    </section>
    <section class="section">
      <div class="card">
        ${fields.map(([key,label,vals])=>`<div class="score-row"><div class="score-label">${label}</div><div class="scale">${vals.map((v,i)=>`<button class="${state.checkin[key]===i+1?'active':''}" data-score-key="${key}" data-score="${i+1}" aria-label="${label}${i+1}">${v}</button>`).join('')}</div></div>`).join('')}
        <button class="btn primary full" style="margin-top:16px" id="saveCheckinBtn">記録しておすすめを見る</button>
      </div>
    </section>
    <section class="section">
      <div class="card card-soft insight"><strong>設計意図</strong><span>毎日の入力負担を小さくするため、基本は4タップ程度。将来的には「気分だけ記録」も可能にする想定です。</span></div>
    </section>`;
}

function renderReport() {
  const records = state.records.slice(-7);
  const kunCount = state.usage.filter(x=>x.productId==='kun').length;
  const chanCount = state.usage.filter(x=>x.productId==='chan').length;
  const best = chanCount >= kunCount ? product('chan') : product('kun');
  return `
    <section class="hero">
      <div class="eyebrow">REPORT</div>
      <h1>振り返ると、<br>香りとの相性が見えてくる。</h1>
      <p>コンディションと使用履歴を合わせて、次回おすすめを少しずつブラッシュアップします。</p>
    </section>
    <section class="section">
      <div class="section-head"><div class="section-title">今週の気分</div><div class="section-note">5段階</div></div>
      <div class="card">
        <div class="report-chart">${records.map((r,i)=>`<div class="bar-wrap"><div class="bar" style="--h:${Math.max(18,r.mood/5*108)}px"></div><span>${['月','火','水','木','金','土','日'][i] || ''}</span></div>`).join('')}</div>
      </div>
    </section>
    <section class="section">
      <div class="grid-2">
        <div class="card metric"><div class="label">よく使う香り</div><div class="value" style="font-size:22px">${best.name}</div><div class="caption">直近の使用履歴から</div></div>
        <div class="card metric"><div class="label">使用記録</div><div class="value">${state.usage.length}<small style="font-size:14px">回</small></div><div class="caption">モック内の累計</div></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div class="section-title">今週の気づき</div></div>
      <div class="card insight"><strong>${best.name}との相性が良さそうです</strong><span>${best.id==='chan'?'疲れが高めの日に「落ち着いた」という履歴が続いています。':'集中したい日に「切り替えられた」という履歴があります。'} 次回おすすめにも反映します。</span></div>
    </section>
    <section class="section">
      <div class="section-head"><div class="section-title">使用履歴</div><button class="link-btn" data-go="home">今日使う</button></div>
      <div class="card">
        ${state.usage.length ? state.usage.slice().reverse().map(u=>{ const p=product(u.productId); return `<div class="timeline"><div class="dot"></div><div class="content"><div class="date">${u.date}</div><div class="title">${p.name}</div><div class="text">${u.before} → ${u.after}</div></div></div>`; }).join('') : `<div class="empty"><div class="emoji">♨</div>まだ使用履歴がありません。</div>`}
      </div>
    </section>`;
}

function renderPurchase() {
  const totalQty = state.qty.kun + state.qty.chan;
  const total = PRODUCTS.reduce((sum,p)=>sum + state.qty[p.id]*p.price,0);
  return `
    <section class="hero">
      <div class="eyebrow">NEXT ORDER</div>
      <h1>次回購入は、<br>今の自分に合う組合せで。</h1>
      <p>質問・記録・使用履歴をもとに仮の数量を提案。数量はお客様自身で自由に調整できます。</p>
    </section>
    <section class="section">
      <div class="card recommendation">
        <div class="reco-head"><div class="reco-icon">✦</div><div><h3>今回のおすすめ理由</h3><p>休息系の使用頻度が高く、${state.stock.chan}%まで減っているため「お香ちゃん」を少し多めに提案しています。</p></div></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div class="section-title">おすすめ組合せ</div><div class="section-note">数量変更OK</div></div>
      <div class="card">
        ${PRODUCTS.map(p=>`<div class="purchase-item">${productVisual(p,true)}<div><h3>${p.name}</h3><p>${p.tag}・${yen(p.price)} / 個</p></div><div class="stepper"><button data-qty="${p.id}" data-delta="-1">−</button><b>${state.qty[p.id]}</b><button data-qty="${p.id}" data-delta="1">＋</button></div></div>`).join('')}
        <div class="summary-row"><div><div class="sum-label">合計 ${totalQty}個</div><div class="section-note">数量は購入前に調整できます</div></div><div class="sum-value">${yen(total)}</div></div>
        <button class="btn primary full" style="margin-top:16px" id="purchaseBtn">この内容で購入する</button>
      </div>
    </section>
    <section class="section"><div class="card card-soft"><div class="section-title" style="font-size:14px">購入後も学習</div><p style="margin:8px 0 0;color:var(--muted);font-size:12px;line-height:1.7">購入数量を新しい残量として反映し、その後の使用ペースとコンディション記録から次回おすすめを更新する想定です。</p>${flowStrip()}</div></section>`;
}

function render() {
  const views = { home: renderHome, checkin: renderCheckin, report: renderReport, purchase: renderPurchase };
  main.innerHTML = (views[state.view] || renderHome)();
  bindDynamicEvents();
}

function computeRecommendation() {
  const c = state.checkin;
  // fatigue and lower energy favor chan; focus and higher energy favor kun.
  const chanScore = (c.fatigue * 1.4) + ((6-c.energy) * 1.1) + ((6-c.mood) * .7);
  const kunScore = (c.focus * 1.4) + (c.energy * .8) + (c.mood * .4);
  state.recommendation = chanScore >= kunScore ? 'chan' : 'kun';
  const p = product(state.recommendation);
  // Purchase suggestion also nudges toward lower stock / more-used product.
  if (state.recommendation === 'chan') state.qty = { kun: Math.max(1,state.qty.kun), chan: Math.max(2,state.qty.chan) };
  else state.qty = { kun: Math.max(2,state.qty.kun), chan: Math.max(1,state.qty.chan) };
  return p;
}

function logUsage(productId) {
  const p = product(productId);
  const c = state.checkin;
  const before = c.fatigue >= 4 ? '少し疲れた' : c.focus >= 4 ? '集中したい' : '気持ちを整えたい';
  const after = productId === 'chan' ? '落ち着いた' : '切り替えられた';
  state.usage.push({ date: `${todayISO()} ${new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`, productId, before, after });
  state.stock[productId] = Math.max(0, state.stock[productId] - 5);
  saveState();
  showToast(`${p.name}の使用を記録しました`);
  setTimeout(()=>setView('report'), 500);
}

function bindDynamicEvents() {
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
  document.querySelectorAll('[data-daily]').forEach(b=>b.addEventListener('click',()=>{
    state.dailyAnswer = b.dataset.daily; saveState(); render(); showToast('今日の一問を記録しました');
  }));
  document.querySelectorAll('[data-score-key]').forEach(b=>b.addEventListener('click',()=>{
    state.checkin[b.dataset.scoreKey] = Number(b.dataset.score); saveState(); render();
  }));
  document.querySelectorAll('[data-use]').forEach(b=>b.addEventListener('click',()=>logUsage(b.dataset.use)));
  document.querySelectorAll('[data-qty]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.qty, delta=Number(b.dataset.delta); state.qty[id]=Math.max(0,Math.min(9,state.qty[id]+delta)); saveState(); render();
  }));
  const saveBtn = document.getElementById('saveCheckinBtn');
  if (saveBtn) saveBtn.addEventListener('click',()=>{
    const p = computeRecommendation();
    const record = { date: todayISO(), ...state.checkin };
    const idx = state.records.findIndex(r=>r.date===record.date);
    if (idx >= 0) state.records[idx]=record; else state.records.push(record);
    state.streak = Math.min(99, state.streak + (idx>=0?0:1));
    saveState(); showToast(`今日のおすすめは「${p.name}」です`); setTimeout(()=>setView('home'),500);
  });
  const purchaseBtn = document.getElementById('purchaseBtn');
  if (purchaseBtn) purchaseBtn.addEventListener('click', openPurchaseModal);
}

function openPurchaseModal() {
  const items = PRODUCTS.filter(p=>state.qty[p.id]>0);
  const total = items.reduce((s,p)=>s+p.price*state.qty[p.id],0);
  modalBody.innerHTML = `
    ${items.map(p=>`<div class="purchase-item">${productVisual(p,true)}<div><h3>${p.name}</h3><p>${state.qty[p.id]}個 × ${yen(p.price)}</p></div><b>${yen(state.qty[p.id]*p.price)}</b></div>`).join('') || '<div class="empty">商品が選択されていません。</div>'}
    <div class="summary-row"><div class="sum-label">お支払い予定</div><div class="sum-value">${yen(total)}</div></div>
    <p style="color:var(--muted);font-size:11px;line-height:1.6;margin:10px 0 0">v001では決済・EC連携は行わず、購入導線の確認画面までをモック化しています。</p>`;
  modalConfirmBtn.disabled = items.length === 0;
  backdrop.classList.remove('hidden');
}

modalCancelBtn.addEventListener('click',()=>backdrop.classList.add('hidden'));
backdrop.addEventListener('click',(e)=>{ if(e.target===backdrop) backdrop.classList.add('hidden'); });
modalConfirmBtn.addEventListener('click',()=>{
  backdrop.classList.add('hidden');
  showToast('モック：ここからEC購入ページへ遷移します');
});

document.getElementById('resetDemoBtn').addEventListener('click',()=>{
  localStorage.removeItem(KEY); state=structuredClone(DEFAULT_STATE); saveState(); setView('home'); showToast('デモデータを初期化しました');
});

navItems.forEach(n=>n.addEventListener('click',()=>setView(n.dataset.view)));
setView(state.view || 'home');
