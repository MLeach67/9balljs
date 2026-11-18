const circles = document.getElementById('circles');
for (let i = 1; i <= 9; i++) {
  const b = document.createElement('button');
  b.textContent = i;
  circles.appendChild(b);
}

const deadBalls = [];
const players = [
  { score: document.getElementById('score1'), bl: document.getElementById('bl1'), sl: document.getElementById('sl'), time: document.getElementById('time'), blBalls: [] },
  { score: document.getElementById('score2'), bl: document.getElementById('bl2'), sl: document.getElementById('sl2'), time: document.getElementById('time2'), blBalls: [] },
];
let active = 0;
let deadR = 0;
let rInn = 0;
let tInn = 0;

function updateActiveScore() {
  players.forEach((p, i) => p.score.classList.toggle('inactive', i !== active));
}

function updateBL(p) {
  p.bl.value = p.blBalls.length ? `BL:${p.blBalls.join(',')}` : 'BL:';
}

function updateDead() {
  document.getElementById('dead-t').value = deadR ? `DT:${deadR}` : 'DT:';
  document.getElementById('dead').value = deadBalls.length ? `DL:${[...deadBalls].sort((a, b) => a - b).join(',')}` : 'DL:';
}

function updateInnings() {
  document.getElementById('r-inn').value = rInn ? `R-Inn:${rInn}` : 'R-Inn:';
  document.getElementById('t-inn').value = tInn ? `T-Inn:${tInn}` : 'T-Inn:';
}

function removeBall(list, ball) {
  const i = list.indexOf(ball);
  if (i !== -1) list.splice(i, 1);
}

const SKILL_GOALS = { 1: 14, 2: 19, 3: 25, 4: 31, 5: 38, 6: 46, 7: 55, 8: 65, 9: 75 };

const defaultTime = level => (level <= 3 ? 2 : 1);

function pickSkill(input) {
  const select = document.createElement('select');
  select.setAttribute('aria-label', `${input.getAttribute('aria-label')} skill level`);
  select.add(new Option('SL', '', true, true));
  select.options[0].disabled = true;
  for (const level of Object.keys(SKILL_GOALS)) select.add(new Option(level, level));
  if (input.dataset.level) select.value = input.dataset.level;

  const done = () => {
    select.remove();
    input.hidden = false;
  };
  select.addEventListener('change', () => {
    input.dataset.level = select.value;
    input.dataset.goal = SKILL_GOALS[select.value];
    input.value = `SL${select.value}:${input.dataset.goal}`;
    setButtonValue(document.getElementById(input.id === 'sl' ? 'time' : 'time2'), defaultTime(select.value));
    done();
    saveState();
  });
  select.addEventListener('blur', done);

  input.hidden = true;
  input.before(select);
  select.focus();
  select.showPicker?.();
}

for (const id of ['sl', 'sl2']) {
  const input = document.getElementById(id);
  input.addEventListener('click', () => pickSkill(input));
}

function resetBalls() {
  for (const ball of circles.children) {
    ball.classList.remove('pocketed', 'crossed', 'frozen');
    delete ball.dataset.owner;
  }
}

const confirmDialog = document.getElementById('confirm-dialog');
const confirmMessage = document.getElementById('confirm-message');
let onConfirm = null;

function confirmAction(message, callback) {
  confirmMessage.textContent = message;
  onConfirm = callback;
  confirmDialog.returnValue = '';
  confirmDialog.showModal();
}

confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue === 'yes') onConfirm();
});

function setButtonValue(button, value) {
  button.dataset.value = value;
  button.textContent = value;
}

const defButtons = [document.getElementById('def'), document.getElementById('def2')];

for (const button of defButtons) {
  button.addEventListener('click', () => {
    setButtonValue(button, Number(button.dataset.value) + 1);
    saveState();
  });
}

const timeButtons = [document.getElementById('time'), document.getElementById('time2')];

for (const button of timeButtons) {
  button.addEventListener('click', () => {
    setButtonValue(button, Math.max(0, Number(button.dataset.value) - 1));
    saveState();
  });
}

const KEPT_ON_NEW_GAME = ['player1', 'player2', 'sl', 'sl2'];

function newGame() {
  for (const input of document.querySelectorAll('input')) {
    if (!KEPT_ON_NEW_GAME.includes(input.id)) input.value = input.defaultValue;
  }
  for (const button of defButtons) setButtonValue(button, 0);
  for (const p of players) setButtonValue(p.time, defaultTime(p.sl.dataset.level));
  resetBalls();
  deadBalls.length = 0;
  for (const p of players) p.blBalls.length = 0;
  active = 0;
  deadR = 0;
  rInn = 0;
  tInn = 0;
  updateActiveScore();
  saveState();
}

function goToSummary() {
  [...circles.children].forEach((ball, i) => {
    if (!ball.classList.contains('pocketed') && !ball.classList.contains('crossed')) deadR += i === 8 ? 2 : 1;
  });
  const params = new URLSearchParams();
  players.forEach((p, i) => {
    const n = i + 1;
    params.set(`name${n}`, document.getElementById(`player${n}`).value);
    params.set(`score${n}`, p.score.value);
    params.set(`skill${n}`, p.sl.dataset.level);
    params.set(`goal${n}`, p.sl.dataset.goal);
    params.set(`def${n}`, defButtons[i].dataset.value);
  });
  params.set('deadt', deadR);
  params.set('tinn', tInn);
  location.href = `summary.html?${params}`;
}

function checkGoal(p) {
  if (Number(p.score.value) >= Number(p.sl.dataset.goal)) confirmAction('Confirm end of game?', goToSummary);
}

function newRack() {
  const p = players[active];
  p.score.value = Number(p.score.value) + 2;
  for (const q of players) {
    q.blBalls.length = 0;
    updateBL(q);
    setButtonValue(q.time, defaultTime(q.sl.dataset.level));
  }
  deadBalls.length = 0;
  deadR += [...circles.children].slice(0, 8).filter(b => !b.classList.contains('pocketed') && !b.classList.contains('crossed')).length;
  rInn = 0;
  updateDead();
  updateInnings();
  resetBalls();
  checkGoal(p);
  saveState();
}

document.getElementById('summary').addEventListener('click', goToSummary);

document.getElementById('new-game').addEventListener('click', () => {
  confirmAction('Start a new game?', newGame);
});

circles.children[8].addEventListener('click', () => confirmAction('New Rack?', newRack));

document.getElementById('switch-player').addEventListener('click', () => {
  for (const ball of circles.children) {
    if (ball.dataset.owner === String(active)) ball.classList.add('frozen');
  }
  active = 1 - active;
  if (active === 0) {
    rInn++;
    tInn++;
    updateInnings();
  }
  updateActiveScore();
  saveState();
});

for (const ball of [...circles.children].slice(0, 8)) {
  ball.addEventListener('click', () => {
    if (ball.classList.contains('frozen')) return;
    const p = players[active];
    if (ball.classList.contains('crossed')) {
      ball.classList.remove('crossed', 'pocketed');
      delete ball.dataset.owner;
      removeBall(deadBalls, ball.textContent);
      deadR--;
      updateDead();
      saveState();
      return;
    }
    if (ball.classList.contains('pocketed')) {
      ball.classList.add('crossed');
      p.score.value = Number(p.score.value) - 1;
      deadBalls.push(ball.textContent);
      deadR++;
      updateDead();
      removeBall(p.blBalls, ball.textContent);
      updateBL(p);
      saveState();
      return;
    }
    ball.classList.add('pocketed');
    ball.dataset.owner = active;
    p.score.value = Number(p.score.value) + 1;
    p.blBalls.push(ball.textContent);
    updateBL(p);
    checkGoal(p);
    saveState();
  });
}

const STATE_KEY = 'gameState';

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify({
    deadBalls,
    blBalls: players.map(p => p.blBalls),
    active,
    deadR,
    rInn,
    tInn,
    inputs: Object.fromEntries([...document.querySelectorAll('input')].map(i => [i.id, i.value])),
    def: defButtons.map(b => b.dataset.value),
    time: timeButtons.map(b => b.dataset.value),
    sl: players.map(p => ({ level: p.sl.dataset.level, goal: p.sl.dataset.goal })),
    balls: [...circles.children].map(b => ({ classes: [...b.classList], owner: b.dataset.owner })),
  }));
}

function restoreState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (!saved) return;
  const s = JSON.parse(saved);
  deadBalls.push(...s.deadBalls);
  players.forEach((p, i) => {
    p.blBalls.push(...s.blBalls[i]);
    p.sl.dataset.level = s.sl[i].level;
    p.sl.dataset.goal = s.sl[i].goal;
  });
  active = s.active;
  deadR = s.deadR;
  rInn = s.rInn;
  tInn = s.tInn;
  for (const [id, value] of Object.entries(s.inputs)) document.getElementById(id).value = value;
  s.def.forEach((value, i) => setButtonValue(defButtons[i], value));
  s.time.forEach((value, i) => setButtonValue(timeButtons[i], value));
  s.balls.forEach((b, i) => {
    circles.children[i].className = b.classes.join(' ');
    if (b.owner !== undefined) circles.children[i].dataset.owner = b.owner;
  });
  updateActiveScore();
}

// Restore from storage so the game survives page reloads or the browser closing.
if (localStorage.getItem(STATE_KEY)) restoreState();
else updateActiveScore();
document.addEventListener('input', saveState);
window.addEventListener('pagehide', saveState);
