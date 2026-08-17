const board = document.querySelector('.board')
const boardWrapper = document.querySelector('.board-wrapper')
const startButton = document.querySelector('.btn-start')
const modal = document.querySelector('.modal')
const startGameModal = document.querySelector(".start-game")
const gameOverModal = document.querySelector(".game-over")
const restartButton = document.querySelector(".btn-restart")

const highScoreElement = document.querySelector("#high-score")
const scoreElement = document.querySelector("#score")
const timeElement = document.querySelector("#time")
const levelElement = document.querySelector("#level")
const finalScoreElement = document.querySelector("#final-score")

// ── State variables ──
let CELL = 24
let cols = 0
let rows = 0
let blocks = {}

let highScore = parseInt(localStorage.getItem("highScore")) || 0
let score = 0
let seconds = 0
let timerInterval = null
let intervalId = null
let gameRunning = false
let pendingDirection = null
let direction = 'right'
let snake = []
let food = { x: 0, y: 0 }

highScoreElement.innerText = highScore

// ── Calculate Grid according to viewport ──
function computeGrid() {
  CELL = window.innerWidth >= 768 ? 28 : 22
  document.documentElement.style.setProperty('--cell', `${CELL}px`)

  const wrapW = boardWrapper.clientWidth - 4
  const wrapH = boardWrapper.clientHeight - 4

  cols = Math.max(10, Math.floor(wrapW / CELL))
  rows = Math.max(10, Math.floor(wrapH / CELL))

  board.style.setProperty('--cols', cols)
  board.style.setProperty('--rows', rows)
}

function buildGridDOM() {
  board.innerHTML = ''
  blocks = {}
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = document.createElement('div')
      block.classList.add("block")
      board.appendChild(block)
      blocks[`${row}-${col}`] = block
    }
  }
}

function initGrid() {
  computeGrid()
  buildGridDOM()
}

initGrid()

window.addEventListener('resize', () => {
  if (!gameRunning) {
    initGrid()
  }
})

// ── Helpers ──
function randomPosition() {
  return {
    x: Math.floor(Math.random() * rows),
    y: Math.floor(Math.random() * cols)
  }
}

function getLevel() {
  return Math.floor(score / 50) + 1
}

function getSpeed() {
  return Math.max(80, 300 - (getLevel() - 1) * 30)
}

function updateTimer() {
  seconds++
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  timeElement.innerText = `${mins}:${secs}`
}

// ── Direct Direction Controller ──
function handleDirectionChange(newDir) {
  const opposites = { up: "down", down: "up", left: "right", right: "left" }
  if (newDir && newDir !== opposites[direction] && newDir !== direction) {
    pendingDirection = newDir
  }
}

// ── Render Frame ──
function render() {
  if (pendingDirection) {
    direction = pendingDirection
    pendingDirection = null
  }

  let head
  if (direction === "left") head = { x: snake[0].x, y: snake[0].y - 1 }
  else if (direction === "right") head = { x: snake[0].x, y: snake[0].y + 1 }
  else if (direction === "down") head = { x: snake[0].x + 1, y: snake[0].y }
  else if (direction === "up") head = { x: snake[0].x - 1, y: snake[0].y }

  // Wall collision
  if (head.x < 0 || head.x >= rows || head.y < 0 || head.y >= cols) {
    endGame()
    return
  }

  // Self collision
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame()
    return
  }

  // Food collision
  if (head.x === food.x && head.y === food.y) {
    if (blocks[`${food.x}-${food.y}`]) {
      blocks[`${food.x}-${food.y}`].classList.remove("food")
    }

    do {
      food = randomPosition()
    } while (snake.some(s => s.x === food.x && s.y === food.y))

    if (blocks[`${food.x}-${food.y}`]) {
      blocks[`${food.x}-${food.y}`].classList.add("food")
    }

    const prevLevel = getLevel()
    snake.unshift(head)
    score += 10
    scoreElement.innerText = score

    if (score > highScore) {
      highScore = score
      localStorage.setItem("highScore", highScore)
      highScoreElement.innerText = highScore
    }

    const newLevel = getLevel()
    levelElement.innerText = newLevel
    if (newLevel > prevLevel) {
      levelElement.classList.remove("level-up")
      void levelElement.offsetWidth
      levelElement.classList.add("level-up")
    }

    updateSnakeDOM()
    restartLoop()
    return
  }

  // Normal move
  clearSnakeDOM()
  snake.unshift(head)
  snake.pop()
  updateSnakeDOM()
  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.add("food")
  }
}

function clearSnakeDOM() {
  snake.forEach(seg => {
    const b = blocks[`${seg.x}-${seg.y}`]
    if (b) b.classList.remove("fill", "snake-head")
  })
}

function updateSnakeDOM() {
  snake.forEach((seg, i) => {
    const b = blocks[`${seg.x}-${seg.y}`]
    if (!b) return
    b.classList.add("fill")
    if (i === 0) b.classList.add("snake-head")
    else b.classList.remove("snake-head")
  })
}

function restartLoop() {
  clearInterval(intervalId)
  intervalId = setInterval(render, getSpeed())
}

// ── Game lifecycle ──
function endGame() {
  clearInterval(intervalId)
  clearInterval(timerInterval)
  gameRunning = false
  if (finalScoreElement) finalScoreElement.innerText = score
  modal.style.display = "flex"
  startGameModal.style.display = "none"
  gameOverModal.style.display = "flex"
}

function startGame() {
  initGrid()
  resetState()
  modal.style.display = "none"
  gameRunning = true
  timerInterval = setInterval(updateTimer, 1000)
  intervalId = setInterval(render, getSpeed())

  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.add("food")
  }
}

function resetState() {
  clearInterval(intervalId)
  clearInterval(timerInterval)

  clearSnakeDOM()
  if (blocks[`${food.x}-${food.y}`]) {
    blocks[`${food.x}-${food.y}`].classList.remove("food")
  }

  score = 0
  seconds = 0
  direction = "right"
  pendingDirection = null
  snake = [{ x: Math.floor(rows / 2), y: 3 }]
  food = randomPosition()

  scoreElement.innerText = 0
  timeElement.innerText = "00:00"
  levelElement.innerText = "1"
}

// ── Event Listeners ──
startButton.addEventListener("click", startGame)

restartButton.addEventListener("click", startGame)

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right"
  }

  const newDir = keyMap[event.key]
  if (newDir) {
    handleDirectionChange(newDir)
    event.preventDefault()
  }
})

// Touch D-Pad Events (Fix for Motorola and Small Devices)
const dpadButtons = document.querySelectorAll('.dpad-btn')
dpadButtons.forEach(btn => {
  const triggerDir = (e) => {
    e.preventDefault()
    const dir = btn.getAttribute('data-dir')
    if (dir) handleDirectionChange(dir)
  }

  btn.addEventListener('pointerdown', triggerDir)
})
