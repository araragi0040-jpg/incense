const PRODUCTS = [
  {
    id: 'kun',
    name: 'お香くん',
    tag: 'リラックス',
    tagClass: 'green',
    short: '森の中で深呼吸するような、落ち着きのある香り。',
    scene: '気持ちを静かに整えたいときに。',
    price: 1800,
    beforeLabel: '落ち着きたい',
    afterLabel: '落ち着いた'
  },
  {
    id: 'chan',
    name: 'お香ちゃん',
    tag: '集中',
    tagClass: 'blue',
    short: '頭の切り替えを助ける、澄んだ印象の香り。',
    scene: '仕事や作業前のスイッチに。',
    price: 1800,
    beforeLabel: '切り替えたい',
    afterLabel: '整った'
  }
];

const DAILY_QUESTION = '今日は、どんな時間をいちばん過ごしたいですか？';
const DAILY_CHOICES = ['ゆっくり休みたい', '頭を切り替えたい', '集中したい', '気分を整えたい'];

const STORAGE_KEY = 'incense-mock-v002';
const app = document.getElementById('app');
const toast = document.getElementById('toast');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');
const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');
const resetBtn = document.getElementById('resetBtn');

const defaultState = () => ({
  view: 'home',
  dailyAnswer: '',
  checkin: { mood: 4, energy: 3, fatigue: 4, focus: 3 },
  selectedProduct: 'kun',
  recommendation: 'kun',
  stock: { kun: 60, chan: 40 },
  qty: { kun: 2, chan: 1 },
  streak: 4,
  records: [
    { date: '月', mood: 4, energy: 3, fatigue: 4, focus: 3 },
    { date: '火', mood: 3, energy: 3, fatigue: 4, focus: 2 },
    { date: '水', mood: 4, energy: 4, fatigue: 3, focus: 3 },
    { date: '木', mood: 3, energy: 3, fatigue: 4, focus: 3 },
    { date: '金', mood: 4, energy: 4, fatigue: 3, focus: 4 },
    { date: '土', mood: 3, energy: 3, fatigue: 4, focus: 2 },
    { date: '日', mood: 4, energy: 4, fatigue: 3, focus: 4 }
  ],
  usage: [
    { date: '2026/08/10 21:10', productId: 'kun', before: '落ち着きたい', after: '落ち着いた' },
    { date: '2026/08/11 09:10', productId: 'chan', before: '切り替えたい', after: '整った' },
    { date: '2026/08/12 22:05', productId: 'kun', before: '少し疲れた', after: '落ち着いた' }
  ]
});

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState(), ...saved } : defaultState();
  } catch (_) {
    return defaultState();
  }
}

function saveState() {
  // ChatGPTのプレビューや file:// など、localStorage が使えない環境でも
  // 画面操作が止まらないように保存失敗を握りつぶします。
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // このセッション中は state（メモリ）上でそのまま動作します。
  }
}

function yen(v) {
  return `¥${v.toLocaleString('ja-JP')}`;
}

function productById(id) {
  return PRODUCTS.find(p => p.id === id) || PRODUCTS[0];
}

function selectedRecommendationText() {
  const p = productById(state.recommendation);
  return `${p.name}がおすすめです`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function setView(view) {
  state.view = view;
  saveState();
  render();
}

function updateNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });
}

function computeRecommendation() {
  const { mood, energy, fatigue, focus } = state.checkin;
  let relaxScore = fatigue * 1.5 + (6 - energy) * 1.1 + (6 - mood) * 0.8;
  let focusScore = focus * 1.5 + energy * 0.8 + mood * 0.4;

  if (state.dailyAnswer === 'ゆっくり休みたい' || state.dailyAnswer === '気分を整えたい') relaxScore += 1.4;
  if (state.dailyAnswer === '集中したい' || state.dailyAnswer === '頭を切り替えたい') focusScore += 1.4;

  relaxScore += (100 - state.stock.kun) / 50;
  focusScore += (100 - state.stock.chan) / 50;

  state.recommendation = relaxScore >= focusScore ? 'kun' : 'chan';

  if (state.recommendation === 'kun') {
    state.qty.kun = Math.max(2, state.qty.kun);
    state.qty.chan = Math.max(1, state.qty.chan);
  } else {
    state.qty.chan = Math.max(2, state.qty.chan);
    state.qty.kun = Math.max(1, state.qty.kun);
  }
}

function recordToday() {
  computeRecommendation();
  const p = productById(state.selectedProduct);

  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
  const date = new Date();
  const label = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];
  const current = { date: label, ...state.checkin };
  state.records = [...state.records.slice(-6), current];

  state.usage.push({
    date: `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    productId: p.id,
    before: state.checkin.fatigue >= 4 ? '少し疲れた' : state.checkin.focus >= 4 ? '集中したい' : p.beforeLabel,
    after: p.afterLabel
  });
  state.stock[p.id] = Math.max(0, state.stock[p.id] - 6);
  state.streak += 1;
  saveState();
  showToast(`記録しました。今日のおすすめは「${p.name}」です`);
  setView('home');
}

function lineChartSVG(records) {
  const width = 320;
  const height = 110;
  const left = 12;
  const bottom = 16;
  const top = 10;
  const right = 10;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const stepX = innerW / Math.max(1, records.length - 1);

  const points = records.map((r, i) => {
    const x = left + stepX * i;
    const y = top + innerH * (1 - (r.mood - 1) / 4);
    return `${x},${y}`;
  }).join(' ');

  const yGrid = [1, 2, 3, 4, 5].map(level => {
    const y = top + innerH * (1 - (level - 1) / 4);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text x="0" y="${y + 4}">${level}</text>`;
  }).join('');

  const xLabels = records.map((r, i) => {
    const x = left + stepX * i;
    return `<text x="${x}" y="${height + 14}" text-anchor="middle">${r.date}</text>`;
  }).join('');

  const circles = records.map((r, i) => {
    const x = left + stepX * i;
    const y = top + innerH * (1 - (r.mood - 1) / 4);
    return `<circle class="chart-dot" cx="${x}" cy="${y}" r="4"></circle>`;
  }).join('');

  return `
    <svg viewBox="0 0 320 130" role="img" aria-label="今週の気分推移">
      <g class="chart-grid">${yGrid}</g>
      <polyline class="chart-path" points="${points}"></polyline>
      ${circles}
      <g class="chart-axis">${xLabels}</g>
    </svg>
  `;
}

function renderFlow() {
  const steps = [
    ['✎', '質問・記録'],
    ['🌿', 'おすすめ提案'],
    ['♨', '使用履歴'],
    ['⚙', 'おすすめブラッシュアップ\n＆数量調整'],
    ['👜', '購入']
  ];

  return `
    <div class="flow-bar">
      ${steps.map((step, i) => `
        <div class="flow-step">
          <div class="flow-icon">${step[0]}</div>
          <div class="flow-text">${step[1].replace('\n', '<br>')}</div>
        </div>
        ${i < steps.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
      `).join('')}
    </div>
  `;
}

function renderProductCard(p, selectable = false) {
  const selected = state.selectedProduct === p.id;
  return `
    <div class="product-card ${selected ? 'selected' : ''}" ${selectable ? `data-product="${p.id}"` : ''}>
      <div class="product-visual ${p.id}"></div>
      <div class="product-meta">
        <h3>${p.name}</h3>
        <p>${p.short}</p>
        <span class="tag ${p.tagClass}">${p.tag}</span>
        <div class="progress-wrap">
          <div class="progress-label"><span>推定残量</span><b>${state.stock[p.id]}%</b></div>
          <div class="progress-line"><i style="width:${state.stock[p.id]}%"></i></div>
        </div>
      </div>
      ${selectable ? `<div class="selector ${selected ? 'on' : ''}"></div>` : ''}
    </div>
  `;
}

function renderHome() {
  computeRecommendation();
  const rec = productById(state.recommendation);
  const totalQty = state.qty.kun + state.qty.chan;

  return `
    <section class="panel home-hero">
      <div class="page-head">
        <div class="eyebrow">TODAY</div>
        <h1>今日のわたしと、<br>今日の香り。</h1>
        <p>日々のコンディション記録から、次回購入にぴったりの組み合わせを少しずつ整えていくアプリのモックです。</p>
      </div>
      <div class="mini-flow"><b>質問・記録</b><i>→</i><b>おすすめ提案</b><i>→</i><b>使用履歴</b><i>→</i><b>数量調整</b><i>→</i><b>購入</b></div>
      <div class="btn-row">
        <button class="btn btn-primary" data-go="checkin">今日の記録をする</button>
        <button class="btn btn-soft" data-go="purchase">購入提案をみる</button>
      </div>
    </section>

    <section class="section">
      <div class="quick-grid">
        <div class="metric-box">
          <div class="metric-label">連続記録</div>
          <div class="metric-value">${state.streak}<small style="font-size:14px">日</small></div>
          <div class="metric-note">毎日開く導線の例</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">次回のおすすめ</div>
          <div class="metric-value" style="font-size:20px">${rec.name}</div>
          <div class="metric-note">${rec.tag}寄り</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card today-card">
        <div class="today-icon">📝</div>
        <div>
          <h3 class="today-title">今日の記録</h3>
          <p class="today-text">気分・心の元気・身体の疲れ・集中度を、画像イメージに近いシンプルUIで記録します。</p>
          <button class="text-btn" data-go="checkin">記録画面へ</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card question-card">
        <div class="question-badge">？</div>
        <div>
          <h3>今日の一問</h3>
          <p>${DAILY_QUESTION}</p>
          <div class="chips">
            ${DAILY_CHOICES.map(choice => `<button class="chip ${state.dailyAnswer === choice ? 'active' : ''}" data-daily="${choice}">${choice}</button>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>今日のおすすめ</h2><span>${selectedRecommendationText()}</span></div>
      <div class="product-list">
        ${renderProductCard(PRODUCTS[0])}
        ${renderProductCard(PRODUCTS[1])}
      </div>
    </section>

    <section class="section">
      <div class="card soft link-summary">
        <div>
          <b>次回購入のおすすめ</b>
          <p>${rec.name}を中心に、合計 ${totalQty} 個の提案数量を表示しています。数量はあとから調整できます。</p>
        </div>
        <button class="btn btn-outline small-btn" data-go="purchase">確認する</button>
      </div>
    </section>
  `;
}

function renderCheckin() {
  return `
    <section class="page-head">
      <div class="eyebrow">STEP 1 / STEP 2</div>
      <h1>今日の記録</h1>
      <p>まずは今日の状態を入力し、そのあと使用したお香を選ぶ構成です。ポスター内の1画面目・2画面目に近い見せ方に寄せています。</p>
    </section>

    <section class="card record-panel">
      <div class="step-labels">
        <div class="step-box"><b>① 今日の記録</b>コンディションを記録</div>
        <div class="step-box"><b>② 使用したお香</b>使った香りを選択</div>
      </div>
      <p class="record-subtitle">今日の状態を教えてください</p>

      <div class="score-block">
        <div class="score-head"><b>今日の気分</b><span>1〜5</span></div>
        <div class="icon-scale">
          ${['😣','😕','😐','🙂','😊'].map((icon, idx) => `<button class="scale-btn ${state.checkin.mood === idx + 1 ? 'active' : ''}" data-score-key="mood" data-score="${idx + 1}">${icon}</button>`).join('')}
        </div>
        <div class="scale-indices"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
      </div>

      ${renderNumberScale('energy', '心の元気')}
      ${renderNumberScale('fatigue', '身体の疲れ')}
      ${renderNumberScale('focus', '集中度')}
    </section>

    <section class="section">
      <div class="section-title"><h2>使用したお香</h2><span>2種類</span></div>
      <div class="product-list">
        ${renderProductCard(PRODUCTS[0], true)}
        ${renderProductCard(PRODUCTS[1], true)}
      </div>
    </section>

    <section class="section">
      <button class="btn btn-primary full" data-action="save-checkin">記録する</button>
    </section>
  `;
}

function renderNumberScale(key, label) {
  return `
    <div class="score-block">
      <div class="score-head"><b>${label}</b><span>1〜5</span></div>
      <div class="number-scale">
        ${[1,2,3,4,5].map(num => `<button class="scale-btn ${state.checkin[key] === num ? 'active' : ''}" data-score-key="${key}" data-score="${num}">${num}</button>`).join('')}
      </div>
      <div class="scale-indices"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    </div>
  `;
}

function renderReport() {
  const kunUses = state.usage.filter(u => u.productId === 'kun').length;
  const chanUses = state.usage.filter(u => u.productId === 'chan').length;
  const best = kunUses >= chanUses ? productById('kun') : productById('chan');

  return `
    <section class="page-head">
      <div class="eyebrow">STEP 3</div>
      <h1>振り返りレポート</h1>
      <p>今週の気分推移、よく使う香り、相性の良い香りをまとめて表示します。ポスターの3画面目をベースにした構成です。</p>
    </section>

    <section class="card chart-card">
      <div class="section-title"><h2>今週の気分</h2><span>5段階</span></div>
      <div class="line-chart">${lineChartSVG(state.records)}</div>
    </section>

    <section class="section analytics-grid">
      <div class="card donut-box">
        <div class="section-title"><h2 style="font-size:15px">よく使う香り</h2></div>
        <div class="donut-wrap"><div class="donut"></div></div>
        <div class="legend">
          <div><span><i style="background:var(--green)"></i>お香くん</span><b>${Math.max(20, kunUses * 15)}%</b></div>
          <div><span><i style="background:var(--blue)"></i>お香ちゃん</span><b>${Math.max(15, chanUses * 15)}%</b></div>
          <div><span><i style="background:var(--purple)"></i>その他指標</span><b>15%</b></div>
        </div>
      </div>
      <div class="card affinity-box">
        <div class="section-title"><h2 style="font-size:15px">相性の良い香り</h2></div>
        <div class="affinity-graph">
          <div class="node k">く</div>
          <div class="node c">ち</div>
          <div class="node s">休</div>
          <div class="node p">整</div>
        </div>
        <div class="affinity-labels"><span>休息</span><span>${best.name}</span><span>整える</span></div>
      </div>
    </section>

    <section class="section">
      <div class="card insight-box">
        <strong>${best.name}との相性が良さそうです</strong>
        <p>最近の使用履歴では「${best.afterLabel}」という記録が多めです。次回購入のおすすめ数量にも、この傾向を反映しています。</p>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>使用履歴</h2><span>${state.usage.length}件</span></div>
      <div class="timeline-list">
        ${state.usage.slice().reverse().map(item => {
          const p = productById(item.productId);
          return `
            <div class="timeline-item">
              <div class="timeline-mark"><i></i></div>
              <div class="timeline-card">
                <div class="timeline-date">${item.date}</div>
                <div class="timeline-title">${p.name}</div>
                <div class="timeline-text">${item.before} → ${item.after}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderPurchase() {
  const totalQty = state.qty.kun + state.qty.chan;
  const totalPrice = PRODUCTS.reduce((sum, p) => sum + p.price * state.qty[p.id], 0);

  return `
    <section class="page-head">
      <div class="eyebrow">STEP 4</div>
      <h1>次回購入のおすすめ</h1>
      <p>質問・記録、使用履歴、残量の推定から次回購入の組み合わせを提案し、その場で数量調整できる画面です。</p>
    </section>

    <section class="card purchase-top">
      <div class="section-title"><h2>おすすめブラッシュアップ</h2><span>数量変更OK</span></div>
      <p style="margin:0;color:var(--muted);font-size:12px;line-height:1.75">直近では <b>${productById(state.recommendation).name}</b> が合いやすい傾向です。推定残量が少ない商品は少し多めに提案しています。</p>
    </section>

    <section class="section">
      <div class="card">
        ${PRODUCTS.map(p => `
          <div class="purchase-item">
            <div class="purchase-thumb product-visual ${p.id}"></div>
            <div class="purchase-meta">
              <h3>${p.name}</h3>
              <p><span class="tag ${p.tagClass}">${p.tag}</span> ・ ${yen(p.price)} / 個</p>
            </div>
            <div class="stepper">
              <button data-qty="${p.id}" data-delta="-1">−</button>
              <b>${state.qty[p.id]}</b>
              <button data-qty="${p.id}" data-delta="1">＋</button>
            </div>
          </div>
        `).join('')}

        <div class="summary-box">
          <div>
            <div class="label">合計 ${totalQty} 個</div>
            <div class="sub">数量はあとで調整できます</div>
          </div>
          <div class="value">${yen(totalPrice)}</div>
        </div>

        <button class="btn btn-primary full" style="margin-top:16px" data-action="purchase">この内容で購入する</button>
      </div>
    </section>

    <section class="section">
      <div class="card soft">
        <div class="section-title"><h2 style="font-size:15px">導線イメージ</h2></div>
        ${renderFlow()}
      </div>
    </section>
  `;
}

function openPurchaseModal() {
  const items = PRODUCTS.filter(p => state.qty[p.id] > 0);
  const total = items.reduce((sum, p) => sum + p.price * state.qty[p.id], 0);
  modalBody.innerHTML = items.length ? `
    ${items.map(p => `
      <div class="purchase-item">
        <div class="purchase-thumb product-visual ${p.id}"></div>
        <div class="purchase-meta">
          <h3>${p.name}</h3>
          <p>${state.qty[p.id]}個 × ${yen(p.price)}</p>
        </div>
        <b>${yen(state.qty[p.id] * p.price)}</b>
      </div>
    `).join('')}
    <div class="summary-box">
      <div>
        <div class="label">お支払い予定</div>
        <div class="sub">v002では確認画面まで</div>
      </div>
      <div class="value">${yen(total)}</div>
    </div>
  ` : '<div class="empty">商品が選択されていません。</div>';
  confirmPurchaseBtn.disabled = items.length === 0;
  modalBackdrop.classList.remove('hidden');
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => setView(btn.dataset.view);
  });
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.onclick = () => setView(btn.dataset.go);
  });
  document.querySelectorAll('[data-daily]').forEach(btn => {
    btn.onclick = () => {
      state.dailyAnswer = btn.dataset.daily;
      saveState();
      computeRecommendation();
      render();
      showToast('今日の一問を記録しました');
    };
  });
  document.querySelectorAll('[data-score-key]').forEach(btn => {
    btn.onclick = () => {
      state.checkin[btn.dataset.scoreKey] = Number(btn.dataset.score);
      saveState();
      render();
    };
  });
  document.querySelectorAll('[data-product]').forEach(card => {
    card.onclick = () => {
      state.selectedProduct = card.dataset.product;
      saveState();
      render();
    };
  });
  document.querySelectorAll('[data-qty]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.qty;
      const delta = Number(btn.dataset.delta);
      state.qty[id] = Math.max(0, Math.min(9, state.qty[id] + delta));
      saveState();
      render();
    };
  });
  document.querySelectorAll('[data-action="save-checkin"]').forEach(btn => {
    btn.onclick = recordToday;
  });
  document.querySelectorAll('[data-action="purchase"]').forEach(btn => {
    btn.onclick = openPurchaseModal;
  });
}

function render() {
  computeRecommendation();
  const views = {
    home: renderHome,
    checkin: renderCheckin,
    report: renderReport,
    purchase: renderPurchase
  };
  app.innerHTML = (views[state.view] || renderHome)();
  updateNav();
  bindEvents();
}

resetBtn.addEventListener('click', () => {
  if (!confirm('デモデータを初期化しますか？')) return;
  state = defaultState();
  saveState();
  render();
  showToast('デモデータを初期化しました');
});

closeModalBtn.addEventListener('click', () => modalBackdrop.classList.add('hidden'));
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add('hidden');
});
confirmPurchaseBtn.addEventListener('click', () => {
  modalBackdrop.classList.add('hidden');
  showToast('モック：ここから購入ページへ進みます');
});

render();
