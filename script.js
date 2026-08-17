const board = document.querySelector('.board');
const boardWrapper = document.querySelector('.board-wrapper');
const startButton = document.querySelector('.btn-start');
const modal = document.querySelector('.modal');
const startGameModal = document.querySelector(".start-game");
const gameOverModal = document.querySelector(".game-over");
const restartButton = document.querySelector(".btn-restart");

const highScoreElement = document.querySelector("#high-score");
const scoreElement = document.querySelector("#score");
const timeElement = document.querySelector("#time");
const levelElement = document.querySelector("#level");
const finalScoreElement = document.querySelector("#final-score");
const pauseOverlay = document.querySelector(".pause-overlay");
const touchPauseBtn = document.querySelector("#btn-touch-pause");

// ── State variables ──
let cols = 18;
let rows = 18;
let blocks = {};
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let score = 0;
let seconds = 0;
let timerInterval = null;
let intervalId = null;
let isPaused = false;
let gameRunning = false;
let pendingDirection = null;
let direction = 'right';
let snake = [];
let food = { x: 0, y: 0 };

highScoreElement.innerText = highScore;

// ── Dynamic Grid Setup based on Container Dimensions ──
function initGrid() {
  board.innerHTML = '';
  blocks = {};

  const wrapW = boardWrapper.clientWidth - 4;
  const wrapH = boardWrapper.clientHeight - 4;

  // Maintain fixed 18x18 grid count for consistent game speed across all devices
  cols = 18;
  rows = 18;

  // Calculate cell size that perfectly fits available viewport space
  const cellSize = Math.floor(Math.min(wrapW / cols, wrapH / rows));
  
  document.documentElement.style.setProperty('--cell', `${cellSize}px`);
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);

  // Build grid blocks
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = document.createElement('div');
      block.classList.add("block");
      board.appendChild(block);
      blocks[`${row}-${col}`] = block;
    }
  }

  // Position initial snake & food after grid builds
  snake = [{ x: Math.floor(rows / 2), y: 3 }];
  food = randomPosition();
}

window.addEventListener('resize', () => {
  if (!gameRunning) {
    initGrid();
  }
});

// Initial grid setup call
initGrid();

// ── Helpers ──
function randomPosition() {
  return {
    x: Math.floor(Math.random() * rows),
    y: Math.floor(Math.random() * cols)
  };
}

function getLevel() {
  return Math.floor(score / 50) + 1;
}

function getSpeed() {
  return Math.max(80, 300 - (getLevel() - 1) * 30);
}

function updateTimer() {
  seconds++;
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  timeElement.innerText = `${mins}:${secs}`;
}

// ── Direction Change Handler ──
function setDirection(newDir) {
  const opposites = { up: "down", down: "up", left: "right", right: "left" };
  if (newDir && newDir !== opposites[direction] && newDir !== direction) {
    pendingDirection = newDir;
  }
}

// ── Toggle Pause ──
function togglePause() {
  if (!gameRunning) return;
  isPaused = !isPaused;
  pauseOverlay.style.display = isPaused ? "flex" : "none";
}

// ── Render loop ──
function render() {
  if (isPaused) return;

  if (pendingDirection) {
    direction = pendingDirection;
    pendingDirection = null;
  }

  let head;
  if (direction === "left") head = { x: snake[0].x, y: snake[0].y - 1 };
  else if (direction === "right") head = { x: snake[0].x, y: snake[0].y + 1 };
  else if (direction === "down") head = { x: snake[0].x + 1, y: snake[0].y };
  else if (direction === "up") head = { x: snake[0].x - 1, y: snake[0].y };

  // Wall collision
  if (head.x < 0 || head.x >= rows || head.y < 0 || head.y >= cols) {
    endGame();
    return;
  }

  // Self collision
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  // Food collision
  if (head.x === food.x && head.y === food.y) {
    if (blocks[`${food.x}-${food.y}`]) {
      blocks[`${food.x}-${food.y}`].classList.remove("food");
    }
    
    do { 
      food = randomPosition(); 
    } while (snake.some(s => s.x === food.x && s.y === food.y));

    if (blocks[`${food.x}-${food.y}`]) {
      blocks[`${food.x}-${food.y}`].classList.add("food");
    }

    const prevLevel = getLevel();
    snake.unshift(head);
    score += 10;
    scoreElement.innerText = score;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
      highScoreElement.innerText = highScore;
    }

    const newLevel = getLevel();
    levelElement.innerText = newLevel;
    if (newLevel > prevLevel) {
      levelElement.classList.remove("level-up");
      void levelElement.offsetWidth;
      levelElement.classList.add("level-up");
    }

    updateSnakeDOM();
    restartLoop();
    return;
  }

  // Normal movement
  clearSnakeDOM();
  snake.unshift(head);
  snake.pop();
  updateSnakeDOM();

  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.add("food");
  }
}

function clearSnakeDOM() {
  snake.forEach(seg => {
    const b = blocks[`${seg.x}-${seg.y}`];
    if (b) b.classList.remove("fill", "snake-head");
  });
}

function updateSnakeDOM() {
  snake.forEach((seg, i) => {
    const b = blocks[`${seg.x}-${seg.y}`];
    if (!b) return;
    b.classList.add("fill");
    if (i === 0) b.classList.add("snake-head");
    else b.classList.remove("snake-head");
  });
}

function restartLoop() {
  clearInterval(intervalId);
  intervalId = setInterval(render, getSpeed());
}

// ── Game lifecycle ──
function endGame() {
  clearInterval(intervalId);
  clearInterval(timerInterval);
  gameRunning = false;
  if (finalScoreElement) finalScoreElement.innerText = score;
  modal.style.display = "flex";
  startGameModal.style.display = "none";
  gameOverModal.style.display = "flex";
}

function startGame() {
  initGrid();
  modal.style.display = "none";
  gameRunning = true;
  isPaused = false;
  seconds = 0;
  timeElement.innerText = "00:00";
  levelElement.innerText = "1";
  
  timerInterval = setInterval(updateTimer, 1000);
  intervalId = setInterval(render, getSpeed());
  
  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.add("food");
  }
}

function resetState() {
  clearInterval(intervalId);
  clearInterval(timerInterval);

  clearSnakeDOM();
  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.remove("food");
  }

  score = 0;
  seconds = 0;
  direction = "right";
  pendingDirection = null;
  isPaused = false;

  scoreElement.innerText = 0;
  timeElement.innerText = "00:00";
  levelElement.innerText = "1";
}

// ── Event Listeners ──
startButton.addEventListener("click", startGame);

restartButton.addEventListener("click", () => {
  resetState();
  startGame();
});

// Keyboard controls
addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Escape") {
    togglePause();
    return;
  }

  const keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right"
  };

  const newDir = keyMap[event.key];
  if (newDir) {
    setDirection(newDir);
    event.preventDefault();
  }
});

// On-screen Touch D-Pad Controls
document.querySelectorAll('.d-btn[data-dir]').forEach(btn => {
  const handler = (e) => {
    e.preventDefault();
    const dir = btn.getAttribute('data-dir');
    setDirection(dir);
  };
  btn.addEventListener('touchstart', handler, { passive: false });
  btn.addEventListener('click', handler);
});

if (touchPauseBtn) {
  const pauseHandler = (e) => {
    e.preventDefault();
    togglePause();
  };
  touchPauseBtn.addEventListener('touchstart', pauseHandler, { passive: false });
  touchPauseBtn.addEventListener('click', pauseHandler);
}
