// ── Bridge (system API proxy) ──
function bridge() {
  return window.__BRIDGE__;
}

// ── Math Engine ──
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (!Number.isInteger(n)) return gamma(n + 1);
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function gamma(n) {
  if (n < 0.5) return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  n -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (n + i);
  const t = n + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function toRadians(deg) {
  return deg * (Math.PI / 180);
}
function toDegrees(rad) {
  return rad * (180 / Math.PI);
}

const ops = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => (b === 0 ? NaN : a / b),
  power: (a, b) => Math.pow(a, b),
  root: (a, b) => (b === 0 ? NaN : Math.pow(a, 1 / b)),
  mod: (a, b) => (b === 0 ? NaN : a % b),
  sin: (x) => Math.sin(toRadians(x)),
  cos: (x) => Math.cos(toRadians(x)),
  tan: (x) => (Math.cos(toRadians(x)) === 0 ? NaN : Math.tan(toRadians(x))),
  asin: (x) => (x < -1 || x > 1 ? NaN : toDegrees(Math.asin(x))),
  acos: (x) => (x < -1 || x > 1 ? NaN : toDegrees(Math.acos(x))),
  atan: (x) => toDegrees(Math.atan(x)),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  log: (x) => (x <= 0 ? NaN : Math.log10(x)),
  ln: (x) => (x <= 0 ? NaN : Math.log(x)),
  log2: (x) => (x <= 0 ? NaN : Math.log2(x)),
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  factorial: (x) => (x < 0 ? NaN : factorial(x)),
  gcd: (a, b) => gcd(a, b),
  lcm: (a, b) => lcm(a, b),
  percentage: (x) => x / 100,
  reciprocal: (x) => (x === 0 ? NaN : 1 / x),
  negate: (x) => -x,
  pi: () => Math.PI,
  e: () => Math.E,
  toDeg: (x) => toDegrees(x),
  toRad: (x) => toRadians(x),
  rand: () => Math.random(),
  square: (x) => x * x,
  cube: (x) => x * x * x,
};

// ── Calculator State ──
let state = {
  display: '0',
  expression: '',
  memory: 0,
  history: [],
  lastAnswer: null,
  isScientific: false,
  showHistory: false,
  currentOp: null,
  prevValue: null,
  waitingForOperand: false,
  justEvaluated: false,
};

const HISTORY_KEY = 'advanced-calculator:history';
const MEMORY_KEY = 'advanced-calculator:memory';

function fmtNum(num) {
  if (num === undefined || num === null || isNaN(num)) return 'Error';
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  if (Number.isInteger(num) && Math.abs(num) < 1e15) return String(num);
  return parseFloat(num.toPrecision(12)).toString();
}

// ── Bridge helpers ──
async function storageGet(key) {
  try {
    return await bridge().call('storage.get', [key]);
  } catch {
    return null;
  }
}

async function storageSet(key, val) {
  try {
    await bridge().call('storage.set', [key, val]);
  } catch {}
}

function logger(...args) {
  try {
    bridge().call('logger.info', args);
  } catch {}
}

function notify(msg) {
  try {
    bridge().call('notify', ['info', msg, { duration: 2000 }]);
  } catch {}
}

// ── DOM References (populated on init) ──
let els = {};

// ── UI Creation ──
function createUI() {
  const root = document.getElementById('root');
  root.innerHTML = '';

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #e0e0e0; overflow: hidden;
      height: 100vh; width: 100vw;
    }
    #root { height: 100%; display: flex; flex-direction: column; }

    .calc-container {
      display: flex; flex-direction: column; height: 100%;
      padding: 8px; gap: 6px;
    }

    /* Display */
    .display-area {
      background: #16213e; border-radius: 10px; padding: 12px 16px;
      min-height: 80px; display: flex; flex-direction: column;
      justify-content: flex-end; align-items: flex-end;
      border: 1px solid #0f3460; flex-shrink: 0;
    }
    .display-expr {
      font-size: 13px; color: #8a8aa0; min-height: 18px;
      word-break: break-all; text-align: right; width: 100%;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .display-result {
      font-size: 28px; font-weight: 300; color: #fff;
      word-break: break-all; text-align: right; width: 100%;
      font-family: 'SF Mono', 'Fira Code', monospace;
      transition: color 0.15s;
    }
    .display-result.error { color: #ff6b6b; }

    /* Memory bar */
    .mem-bar {
      display: flex; gap: 4px; flex-shrink: 0;
    }
    .mem-btn {
      flex: 1; padding: 4px 0; font-size: 10px; font-weight: 600;
      border: 1px solid #0f3460; border-radius: 6px;
      background: #16213e; color: #7b7ba0; cursor: pointer;
      transition: all 0.15s;
    }
    .mem-btn:hover { background: #1a2744; color: #a0a0d0; }
    .mem-btn:active { transform: scale(0.95); }
    .mem-btn.active { color: #4fc3f7; border-color: #4fc3f7; }

    /* Toolbar */
    .toolbar {
      display: flex; gap: 6px; flex-shrink: 0;
    }
    .toolbar-btn {
      padding: 4px 10px; font-size: 11px; font-weight: 600;
      border: 1px solid #0f3460; border-radius: 6px;
      background: #16213e; color: #7b7ba0; cursor: pointer;
      transition: all 0.15s;
    }
    .toolbar-btn:hover { background: #1a2744; color: #a0a0d0; }
    .toolbar-btn.active { background: #0f3460; color: #4fc3f7; border-color: #4fc3f7; }

    /* Button grid */
    .btn-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 5px; flex: 1; align-content: start;
    }
    .btn {
      padding: 0; border: none; border-radius: 8px;
      font-size: 16px; font-weight: 500; cursor: pointer;
      transition: all 0.12s; display: flex; align-items: center;
      justify-content: center; aspect-ratio: 1.3;
      min-height: 36px;
    }
    .btn:active { transform: scale(0.92); }
    .btn-num {
      background: #2a2a4a; color: #e0e0e0;
    }
    .btn-num:hover { background: #35356a; }
    .btn-op {
      background: #0f3460; color: #4fc3f7;
    }
    .btn-op:hover { background: #154a7a; }
    .btn-fn {
      background: #1a1a3e; color: #a0a0d0; font-size: 13px;
      border: 1px solid #2a2a4a;
    }
    .btn-fn:hover { background: #252550; }
    .btn-eq {
      background: #4fc3f7; color: #1a1a2e; font-weight: 700;
    }
    .btn-eq:hover { background: #6dcff8; }
    .btn-clear {
      background: #3d1a1a; color: #ff6b6b;
    }
    .btn-clear:hover { background: #552525; }
    .btn-zero { grid-column: span 2; aspect-ratio: auto; }

    /* Scientific section */
    .sci-section {
      display: none; flex-shrink: 0;
    }
    .sci-section.open { display: block; }
    .sci-grid {
      display: grid; grid-template-columns: repeat(5, 1fr);
      gap: 4px; margin-top: 4px;
    }
    .sci-grid .btn { font-size: 12px; aspect-ratio: 1.6; min-height: 30px; }

    /* History panel */
    .history-overlay {
      display: none; position: fixed; top: 0; left: 0;
      right: 0; bottom: 0; background: rgba(0,0,0,0.5);
      z-index: 10;
    }
    .history-overlay.open { display: block; }
    .history-panel {
      position: fixed; top: 0; right: 0; bottom: 0; width: 260px;
      background: #1a1a2e; border-left: 1px solid #0f3460;
      z-index: 11; display: flex; flex-direction: column;
      transform: translateX(100%); transition: transform 0.2s;
    }
    .history-panel.open { transform: translateX(0); }
    .history-header {
      padding: 12px 16px; display: flex; justify-content: space-between;
      align-items: center; border-bottom: 1px solid #0f3460;
    }
    .history-header h3 { font-size: 14px; color: #a0a0d0; }
    .history-close {
      background: none; border: none; color: #7b7ba0;
      cursor: pointer; font-size: 18px;
    }
    .history-list {
      flex: 1; overflow-y: auto; padding: 8px;
    }
    .history-item {
      padding: 8px 12px; border-bottom: 1px solid #16213e;
    }
    .history-item .h-expr { font-size: 12px; color: #8a8aa0; }
    .history-item .h-result { font-size: 16px; color: #4fc3f7; font-weight: 500; }
    .history-empty {
      text-align: center; color: #5a5a7a; padding: 40px 16px;
      font-size: 13px;
    }
    .history-clear-btn {
      padding: 6px 12px; font-size: 11px; border: 1px solid #3d1a1a;
      border-radius: 6px; background: transparent; color: #ff6b6b;
      cursor: pointer;
    }
    .history-clear-btn:hover { background: #3d1a1a; }
  `;
  root.appendChild(style);

  // Container
  const container = document.createElement('div');
  container.className = 'calc-container';
  root.appendChild(container);

  // ── Display ──
  const displayArea = document.createElement('div');
  displayArea.className = 'display-area';
  displayArea.innerHTML = `
    <div class="display-expr" id="displayExpr"></div>
    <div class="display-result" id="displayResult">0</div>
  `;
  container.appendChild(displayArea);

  // ── Memory Buttons ──
  const memBar = document.createElement('div');
  memBar.className = 'mem-bar';
  const memDefs = [
    ['MC', 'memoryClear'],
    ['MR', 'memoryRecall'],
    ['M+', 'memoryAdd'],
    ['M-', 'memorySubtract'],
    ['MS', 'memoryStore'],
  ];
  memDefs.forEach(([label, action]) => {
    const btn = document.createElement('button');
    btn.className = 'mem-btn';
    btn.textContent = label;
    btn.dataset.action = action;
    memBar.appendChild(btn);
  });
  container.appendChild(memBar);

  // ── Toolbar ──
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const toolDefs = [
    ['☰ History', 'toggleHistory'],
    ['🔬 Sci', 'toggleSci'],
    ['C', 'clearAll', 'btn-clear'],
  ];
  toolDefs.forEach(([label, action, extra]) => {
    const btn = document.createElement('button');
    btn.className = `toolbar-btn${extra ? ' ' + extra : ''}`;
    btn.textContent = label;
    btn.dataset.action = action;
    toolbar.appendChild(btn);
  });
  container.appendChild(toolbar);

  // ── Button Grid ──
  const grid = document.createElement('div');
  grid.className = 'btn-grid';
  container.appendChild(grid);

  const buttons = [
    { label: 'C', action: 'clear', cls: 'btn-clear' },
    { label: '⌫', action: 'backspace', cls: 'btn-clear' },
    { label: '%', action: 'op', op: 'percentage', cls: 'btn-fn' },
    { label: '÷', action: 'op', op: 'divide', cls: 'btn-op' },

    { label: '7', action: 'digit', value: '7', cls: 'btn-num' },
    { label: '8', action: 'digit', value: '8', cls: 'btn-num' },
    { label: '9', action: 'digit', value: '9', cls: 'btn-num' },
    { label: '×', action: 'op', op: 'multiply', cls: 'btn-op' },

    { label: '4', action: 'digit', value: '4', cls: 'btn-num' },
    { label: '5', action: 'digit', value: '5', cls: 'btn-num' },
    { label: '6', action: 'digit', value: '6', cls: 'btn-num' },
    { label: '-', action: 'op', op: 'subtract', cls: 'btn-op' },

    { label: '1', action: 'digit', value: '1', cls: 'btn-num' },
    { label: '2', action: 'digit', value: '2', cls: 'btn-num' },
    { label: '3', action: 'digit', value: '3', cls: 'btn-num' },
    { label: '+', action: 'op', op: 'add', cls: 'btn-op' },

    { label: '0', action: 'digit', value: '0', cls: 'btn-num btn-zero' },
    { label: '.', action: 'decimal', cls: 'btn-num' },
    { label: '±', action: 'negate', cls: 'btn-fn' },
    { label: '=', action: 'evaluate', cls: 'btn-eq' },
  ];

  buttons.forEach((def) => {
    const btn = document.createElement('button');
    btn.className = `btn ${def.cls}`;
    btn.textContent = def.label;
    btn.dataset.action = def.action;
    if (def.value !== undefined) btn.dataset.value = def.value;
    if (def.op) btn.dataset.op = def.op;
    grid.appendChild(btn);
  });

  // ── Scientific Section ──
  const sciSection = document.createElement('div');
  sciSection.className = 'sci-section';
  sciSection.id = 'sciSection';
  const sciGrid = document.createElement('div');
  sciGrid.className = 'sci-grid';
  sciSection.appendChild(sciGrid);

  const sciButtons = [
    ['sin', 'sin'],
    ['cos', 'cos'],
    ['tan', 'tan'],
    ['log', 'log'],
    ['ln', 'ln'],
    ['√', 'sqrt'],
    ['x²', 'square'],
    ['x³', 'cube'],
    ['n!', 'factorial'],
    ['1/x', 'reciprocal'],
    ['π', 'pi'],
    ['e', 'e'],
    ['xⁿ', 'power'],
    ['|x|', 'abs'],
    ['rand', 'rand'],
  ];
  sciButtons.forEach(([label, op]) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-fn';
    btn.textContent = label;
    btn.dataset.action = 'sci';
    btn.dataset.op = op;
    sciGrid.appendChild(btn);
  });
  container.appendChild(sciSection);

  // ── History Panel ──
  const overlay = document.createElement('div');
  overlay.className = 'history-overlay';
  overlay.id = 'historyOverlay';
  root.appendChild(overlay);

  const histPanel = document.createElement('div');
  histPanel.className = 'history-panel';
  histPanel.id = 'historyPanel';
  histPanel.innerHTML = `
    <div class="history-header">
      <h3>History</h3>
      <button class="history-close" id="historyClose">&times;</button>
    </div>
    <div class="history-list" id="historyList">
      <div class="history-empty">No calculations yet</div>
    </div>
  `;
  root.appendChild(histPanel);

  // ── Store DOM refs ──
  els = {
    displayExpr: document.getElementById('displayExpr'),
    displayResult: document.getElementById('displayResult'),
    grid,
    sciSection,
    sciGrid,
    memBar,
    toolbar,
    overlay,
    histPanel,
    historyList: document.getElementById('historyList'),
    historyClose: document.getElementById('historyClose'),
  };

  // ── Event Delegation ──
  container.addEventListener('click', handleClick);
  els.historyClose.addEventListener('click', () => toggleHistory(false));
  els.overlay.addEventListener('click', () => toggleHistory(false));
}

// ── Event Handler ──
function handleClick(e) {
  const btn = e.target.closest('button');
  if (!btn || !btn.dataset.action) return;

  const action = btn.dataset.action;

  switch (action) {
    case 'digit':
      inputDigit(btn.dataset.value);
      break;
    case 'decimal':
      inputDecimal();
      break;
    case 'op':
      setOperator(btn.dataset.op);
      break;
    case 'evaluate':
      evaluate();
      break;
    case 'clear':
      clearAll();
      break;
    case 'clearAll':
      clearAll();
      break;
    case 'backspace':
      backspace();
      break;
    case 'negate':
      negate();
      break;
    case 'sci':
      sciOp(btn.dataset.op);
      break;
    case 'toggleHistory':
      toggleHistory();
      break;
    case 'toggleSci':
      toggleSci();
      break;
    case 'memoryClear':
      memoryClear();
      break;
    case 'memoryRecall':
      memoryRecall();
      break;
    case 'memoryAdd':
      memoryAdd();
      break;
    case 'memorySubtract':
      memorySubtract();
      break;
    case 'memoryStore':
      memoryStore();
      break;
  }
}

// ── Display Update ──
function updateDisplay() {
  els.displayResult.textContent = state.display;
  els.displayResult.className = 'display-result' + (state.display === 'Error' ? ' error' : '');
  els.displayExpr.textContent = state.expression;
}

// ── Input Handlers ──
function inputDigit(d) {
  if (state.justEvaluated) {
    state.display = d;
    state.expression = '';
    state.justEvaluated = false;
  } else if (state.waitingForOperand) {
    state.display = d;
    state.waitingForOperand = false;
  } else {
    state.display = state.display === '0' ? d : state.display + d;
  }
  updateDisplay();
}

function inputDecimal() {
  if (state.justEvaluated) {
    state.display = '0.';
    state.expression = '';
    state.justEvaluated = false;
    state.waitingForOperand = false;
  } else if (state.waitingForOperand) {
    state.display = '0.';
    state.waitingForOperand = false;
  } else if (!state.display.includes('.')) {
    state.display += '.';
  }
  updateDisplay();
}

function setOperator(op) {
  const cur = parseFloat(state.display);
  if (isNaN(cur)) return;

  if (state.currentOp && !state.waitingForOperand) {
    const prev = state.prevValue;
    const result = ops[state.currentOp](prev, cur);
    if (isNaN(result) || !isFinite(result)) {
      state.display = 'Error';
      updateDisplay();
      return;
    }
    state.display = fmtNum(result);
    state.prevValue = result;
  } else {
    state.prevValue = cur;
  }

  state.currentOp = op;
  state.waitingForOperand = true;
  state.justEvaluated = false;

  const opSymbols = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷',
    power: '^',
    mod: '%',
  };
  const sym = opSymbols[op] || op;
  state.expression = `${fmtNum(state.prevValue)} ${sym}`;
  updateDisplay();
}

function evaluate() {
  const cur = parseFloat(state.display);
  if (isNaN(cur)) return;

  let result;
  if (state.currentOp && state.prevValue !== null) {
    result = ops[state.currentOp](state.prevValue, cur);
  } else {
    result = cur;
  }

  if (isNaN(result) || !isFinite(result)) {
    state.display = 'Error';
    state.expression = '';
    updateDisplay();
    return;
  }

  const opSymbols = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷',
    power: '^',
    mod: '%',
  };
  const sym = state.currentOp ? opSymbols[state.currentOp] || state.currentOp : '';
  const exprStr =
    state.prevValue !== null && state.currentOp
      ? `${fmtNum(state.prevValue)} ${sym} ${fmtNum(cur)}`
      : fmtNum(cur);

  state.display = fmtNum(result);
  state.expression = exprStr + ' =';
  state.lastAnswer = result;
  state.currentOp = null;
  state.prevValue = null;
  state.waitingForOperand = true;
  state.justEvaluated = true;

  addHistory(exprStr, result);
  updateDisplay();
}

function sciOp(op) {
  const cur = parseFloat(state.display);
  if (isNaN(cur) && op !== 'pi' && op !== 'e' && op !== 'rand') return;

  let result;
  if (op === 'pi') result = Math.PI;
  else if (op === 'e') result = Math.E;
  else if (op === 'rand') result = Math.random();
  else result = ops[op](cur);

  if (isNaN(result) || !isFinite(result)) {
    state.display = 'Error';
    updateDisplay();
    return;
  }

  const opNames = {
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    log: 'log',
    ln: 'ln',
    sqrt: '√',
    square: 'x²',
    cube: 'x³',
    factorial: 'n!',
    reciprocal: '1/x',
    abs: '|x|',
  };
  const name = opNames[op] || op;

  if (state.justEvaluated) state.expression = '';
  const exprStr = `${name}(${fmtNum(cur)})`;
  state.display = fmtNum(result);
  state.expression = exprStr + ' =';
  state.lastAnswer = result;
  state.waitingForOperand = true;
  state.justEvaluated = true;

  addHistory(exprStr, result);
  updateDisplay();
}

function clearAll() {
  state.display = '0';
  state.expression = '';
  state.currentOp = null;
  state.prevValue = null;
  state.waitingForOperand = false;
  state.justEvaluated = false;
  updateDisplay();
}

function backspace() {
  if (state.justEvaluated || state.waitingForOperand) return;
  state.display = state.display.length > 1 ? state.display.slice(0, -1) : '0';
  updateDisplay();
}

function negate() {
  if (state.display === '0') return;
  state.display = state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display;
  updateDisplay();
}

// ── Memory ──
function memoryStore() {
  const val = parseFloat(state.display);
  if (isNaN(val)) return;
  state.memory = val;
  storageSet(MEMORY_KEY, val);
  updateMemIndicator();
  notify('Memory stored: ' + fmtNum(val));
}

function memoryRecall() {
  state.display = fmtNum(state.memory);
  state.waitingForOperand = true;
  updateDisplay();
}

function memoryAdd() {
  const val = parseFloat(state.display);
  if (isNaN(val)) return;
  state.memory += val;
  storageSet(MEMORY_KEY, state.memory);
  updateMemIndicator();
  notify('Memory: ' + fmtNum(state.memory));
}

function memorySubtract() {
  const val = parseFloat(state.display);
  if (isNaN(val)) return;
  state.memory -= val;
  storageSet(MEMORY_KEY, state.memory);
  updateMemIndicator();
  notify('Memory: ' + fmtNum(state.memory));
}

function memoryClear() {
  state.memory = 0;
  storageSet(MEMORY_KEY, 0);
  updateMemIndicator();
}

function updateMemIndicator() {
  const btns = els.memBar.querySelectorAll('.mem-btn');
  btns.forEach((b) => b.classList.toggle('active', state.memory !== 0));
}

// ── History ──
function addHistory(expr, result) {
  state.history.unshift({
    timestamp: new Date().toISOString(),
    expression: expr,
    result,
  });
  if (state.history.length > 100) state.history = state.history.slice(0, 100);
  storageSet(HISTORY_KEY, state.history);
  renderHistory();
}

function renderHistory() {
  const list = els.historyList;
  if (state.history.length === 0) {
    list.innerHTML = '<div class="history-empty">No calculations yet</div>';
    return;
  }
  list.innerHTML =
    state.history
      .slice(0, 50)
      .map(
        (item) => `
    <div class="history-item">
      <div class="h-expr">${escapeHtml(item.expression)}</div>
      <div class="h-result">= ${escapeHtml(fmtNum(item.result))}</div>
    </div>
  `,
      )
      .join('') +
    `
    <div style="padding:8px;text-align:center">
      <button class="history-clear-btn" id="clearHistoryBtn">Clear All</button>
    </div>
  `;
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearHistory);
}

function clearHistory() {
  state.history = [];
  storageSet(HISTORY_KEY, []);
  renderHistory();
  notify('History cleared');
}

function toggleHistory(force) {
  state.showHistory = force !== undefined ? force : !state.showHistory;
  els.overlay.classList.toggle('open', state.showHistory);
  els.histPanel.classList.toggle('open', state.showHistory);
}

function toggleSci(force) {
  state.isScientific = force !== undefined ? force : !state.isScientific;
  els.sciSection.classList.toggle('open', state.isScientific);
  const btn = els.toolbar.querySelector('[data-action="toggleSci"]');
  if (btn) btn.classList.toggle('active', state.isScientific);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Lifecycle / API ──
export const api = {
  async mount(params) {
    try {
      const savedHistory = await storageGet(HISTORY_KEY);
      if (savedHistory) state.history = savedHistory;
      const savedMemory = await storageGet(MEMORY_KEY);
      if (savedMemory !== null && savedMemory !== undefined) state.memory = savedMemory;
    } catch {}
    renderHistory();
    updateMemIndicator();
    logger('AdvancedCalculator', 'Module mounted', params);
    return 'Advanced Calculator siap digunakan';
  },

  async unmount() {
    logger('AdvancedCalculator', 'Module unmounted');
  },

  async sleep() {
    logger('AdvancedCalculator', 'Module sleeping');
    await storageSet(HISTORY_KEY, state.history);
    await storageSet(MEMORY_KEY, state.memory);
  },

  async resume() {
    try {
      const savedHistory = await storageGet(HISTORY_KEY);
      if (savedHistory) state.history = savedHistory;
    } catch {}
    renderHistory();
    logger('AdvancedCalculator', 'Module resumed');
  },

  calculate(op, a, b) {
    const result = ops[op] ? (b !== undefined ? ops[op](a, b) : ops[op](a)) : NaN;
    if (!isNaN(result) && isFinite(result)) {
      state.lastAnswer = result;
      const exprStr = b !== undefined ? `${fmtNum(a)} ${op} ${fmtNum(b)}` : `${op}(${fmtNum(a)})`;
      addHistory(exprStr, result);
      notify(`Hasil: ${fmtNum(result)}`);
    }
    return { result, display: fmtNum(result) };
  },

  evaluateExpression(expr) {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/.()%^,e\s]/g, '').replace(/\^/g, '**');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      if (!isNaN(result) && isFinite(result)) {
        state.lastAnswer = result;
        addHistory(expr, result);
      }
      return { result, display: fmtNum(result) };
    } catch {
      return { result: NaN, display: 'Error' };
    }
  },

  setDisplay(value) {
    state.display = String(value);
    updateDisplay();
    return state.display;
  },
  getDisplay() {
    return state.display;
  },
  getHistory() {
    return state.history.slice(0, 50);
  },
  clearHistory,

  memoryStore,
  memoryRecall,
  memoryAdd,
  memorySubtract,
  memoryClear,
  getLastAnswer() {
    return state.lastAnswer;
  },

  getStatus() {
    return {
      display: state.display,
      memory: state.memory,
      historyCount: state.history.length,
      lastAnswer: state.lastAnswer,
      version: '1.0.0',
    };
  },
};

export default api;

// ── Initialize UI ──
createUI();
