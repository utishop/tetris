// Tetris Game Implementation
// Author: Tetris AI
// --- Game Constants ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const PIECE_SVGS = [
  null,
  'piece_I.svg', // I
  'piece_O.svg', // O
  'piece_T.svg', // T
  'piece_S.svg', // S
  'piece_Z.svg', // Z
  'piece_J.svg', // J
  'piece_L.svg'  // L
];
const SHAPES = [
  [],
  [ // I
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  [ // O
    [2,2],
    [2,2]
  ],
  [ // T
    [0,3,0],
    [3,3,3],
    [0,0,0]
  ],
  [ // S
    [0,4,4],
    [4,4,0],
    [0,0,0]
  ],
  [ // Z
    [5,5,0],
    [0,5,5],
    [0,0,0]
  ],
  [ // J
    [6,0,0],
    [6,6,6],
    [0,0,0]
  ],
  [ // L
    [0,0,7],
    [7,7,7],
    [0,0,0]
  ]
];
const LEVEL_SPEEDS = [800, 650, 500, 370, 250, 160, 100, 70, 50, 30];

// --- Game Variables ---
let board = [];
let current;
let next;
let score = 0;
let highScore = 0;
let level = 1;
let lines = 0;
let dropInterval = LEVEL_SPEEDS[0];
let dropStart = Date.now();
let gameOver = false;
let requestId;
let leaderboard = [];

// --- Funções de utilidade ---
function randomPiece() {
  const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
  return new Piece(typeId);
}

function resetBoard() {
  board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

function updateScore(points) {
  score += points;
  scoreEl.textContent = score;
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem('tetrisHighScore', highScore);
  }
}

function updateLevel() {
  level = Math.floor(lines / 10) + 1;
  levelEl.textContent = level;
  dropInterval = LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
}

function isGameOver() {
  return board[0].some(cell => cell);
}

function endGame() {
  gameOver = true;
  gameOverEl.classList.remove('hidden');
  gameOverSound.currentTime = 0;
  gameOverSound.play();
  cancelAnimationFrame(requestId);
  leaderboard.push({score, level});
  leaderboard.sort((a, b) => b.score - a.score);
  saveLeaderboard();
  renderLeaderboard();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }
  if (cleared) {
    let points = [0, 100, 300, 500, 800][cleared];
    updateScore(points);
    lines += cleared;
    updateLevel();
    lineClearSound.currentTime = 0;
    lineClearSound.play();
  }
}

// --- Classe da Peça ---
class Piece {
  constructor(typeId) {
    this.typeId = typeId;
    this.shape = SHAPES[typeId].map(row => [...row]);
    this.svg = PIECE_SVGS[typeId];
    this.x = Math.floor(COLS / 2) - Math.ceil(this.shape[0].length / 2);
    this.y = 0;
  }
  move(dx, dy) {
    if (!this.collision(this.x + dx, this.y + dy, this.shape)) {
      this.x += dx;
      this.y += dy;
      return true;
    }
    return false;
  }
  rotate() {
    const newShape = this.shape[0].map((_, i) => this.shape.map(row => row[i])).reverse();
    if (!this.collision(this.x, this.y, newShape)) {
      this.shape = newShape;
      render();
    }
  }
  collision(nx, ny, shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          let px = nx + x;
          let py = ny + y;
          if (px < 0 || px >= COLS || py >= ROWS) return true;
          if (py >= 0 && board[py][px]) return true;
        }
      }
    }
    return false;
  }
  lock() {
    for (let y = 0; y < this.shape.length; y++) {
      for (let x = 0; x < this.shape[y].length; x++) {
        if (this.shape[y][x]) {
          let px = this.x + x;
          let py = this.y + y;
          if (py >= 0) board[py][px] = this.typeId;
        }
      }
    }
  }
}

// --- Lógica principal do jogo ---
function drop() {
  if (!current.move(0, 1)) {
    current.lock();
    clearLines();
    if (isGameOver()) {
      endGame();
      return;
    }
    current = next;
    next = randomPiece();
    drawNext();
    dropStart = Date.now();
  }
  render();
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  const now = Date.now();
  const delta = now - dropStart;
  if (delta > dropInterval) {
    drop();
    dropStart = Date.now();
  } else {
    render();
  }
  if (!gameOver) {
    requestId = requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  resetBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = LEVEL_SPEEDS[0];
  gameOver = false;
  gameOverEl.classList.add('hidden');
  scoreEl.textContent = score;
  updateLevel();
  current = randomPiece();
  next = randomPiece();
  drawNext();
  render();
  dropStart = Date.now();
  if (requestId) cancelAnimationFrame(requestId);
  requestId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  startGame();
}

function handleKey(e) {
  if (gameOver) return;
  switch (e.key) {
    case 'ArrowLeft':
      current.move(-1, 0); break;
    case 'ArrowRight':
      current.move(1, 0); break;
    case 'ArrowDown':
      if (!current.move(0, 1)) {
        current.lock();
        clearLines();
        if (isGameOver()) {
          endGame();
          return;
        }
        current = next;
        next = randomPiece();
        drawNext();
      }
      dropStart = Date.now();
      break;
    case 'ArrowUp':
    case 'x':
      current.rotate(); 
      break;
    case ' ': // Hard drop
      while (current.move(0, 1));
      drop();
      break;
  }
  render();
}

// --- Elementos DOM ---
const canvas = document.getElementById('board');
const nextCanvas = document.getElementById('next');
const ctx = canvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const gameOverEl = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const lineClearSound = document.getElementById('line-clear-sound');
const gameOverSound = document.getElementById('game-over-sound');

// --- Funções de Renderização ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Desenhar peça atual
  if (current) {
    current.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          ctx.fillStyle = getPieceColor(current.typeId);
          ctx.fillRect(
            (current.x + x) * BLOCK_SIZE,
            (current.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          ctx.strokeStyle = '#000';
          ctx.strokeRect(
            (current.x + x) * BLOCK_SIZE,
            (current.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
        }
      });
    });
  }
  
  // Desenhar peças travadas
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = getPieceColor(value);
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    });
  });
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (next) {
    const offsetX = (nextCanvas.width - next.shape[0].length * BLOCK_SIZE / 2) / 2;
    const offsetY = (nextCanvas.height - next.shape.length * BLOCK_SIZE / 2) / 2;
    
    next.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          nextCtx.fillStyle = getPieceColor(next.typeId);
          nextCtx.fillRect(
            offsetX + x * BLOCK_SIZE / 2,
            offsetY + y * BLOCK_SIZE / 2,
            BLOCK_SIZE / 2,
            BLOCK_SIZE / 2
          );
          nextCtx.strokeStyle = '#000';
          nextCtx.strokeRect(
            offsetX + x * BLOCK_SIZE / 2,
            offsetY + y * BLOCK_SIZE / 2,
            BLOCK_SIZE / 2,
            BLOCK_SIZE / 2
          );
          // Adiciona o mesmo estilo de borda interna da peça principal
          nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
          nextCtx.fillRect(
            offsetX + x * BLOCK_SIZE / 2 + 1,
            offsetY + y * BLOCK_SIZE / 2 + 1,
            BLOCK_SIZE / 2 - 2,
            BLOCK_SIZE / 2 - 2
          );
        }
      });
    });
  }
}

function getPieceColor(typeId) {
  const colors = [
    null,
    '#00f0f0', // I
    '#f0f000', // O
    '#a000f0', // T
    '#00f000', // S
    '#f00000', // Z
    '#0000f0', // J
    '#f0a000'  // L
  ];
  return colors[typeId];
}

// --- Event Listeners ---
startBtn.addEventListener('click', () => {
  startGame();
  canvas.focus();
});
resetBtn.addEventListener('click', resetGame);
canvas.addEventListener('keydown', handleKey);
canvas.addEventListener('focus', () => canvas.style.outline = '2px solid #ff4081');
canvas.addEventListener('blur', () => canvas.style.outline = 'none');
window.addEventListener('resize', resizeCanvas);

document.addEventListener('DOMContentLoaded', () => {
  loadHighScore();
  loadLeaderboard();
  resizeCanvas();
  current = randomPiece();
  next = randomPiece();
  render();
  drawNext();
  // Inicializar o jogo automaticamente
  dropStart = Date.now();
  requestId = requestAnimationFrame(gameLoop);
  canvas.focus();
});

function resizeCanvas() {
  let w = Math.min(window.innerWidth - 40, 300);
  let h = w * 2;
  if (window.innerWidth < 600) {
    canvas.width = w;
    canvas.height = h;
    nextCanvas.width = 60;
    nextCanvas.height = 60;
  } else {
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    nextCanvas.width = 80;
    nextCanvas.height = 80;
  }
  render();
  drawNext();
}