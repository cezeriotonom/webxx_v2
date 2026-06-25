const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const GRID_SIZE = 24;
const COLS = 10;
const ROWS = 20;

const COLORS = [
    null,
    '#00f0f0', // I (Cyan)
    '#f0a000', // L (Orange)
    '#0000f0', // J (Blue)
    '#f0f000', // O (Yellow)
    '#f00000', // Z (Red)
    '#00f000', // S (Green)
    '#a000f0'  // T (Purple)
];

const BORDER_COLORS = [
    null,
    '#00a3a3',
    '#a36d00',
    '#0000a3',
    '#a3a300',
    '#a30000',
    '#00a300',
    '#6d00a3'
];

let arena = createMatrix(COLS, ROWS);
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let paused = false;

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    nextMatrix: null,
    type: null,
    nextType: null
};

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];
    } else if (type === 'L') {
        return [
            [0, 0, 2],
            [2, 2, 2],
            [0, 0, 0]
        ];
    } else if (type === 'J') {
        return [
            [3, 0, 0],
            [3, 3, 3],
            [0, 0, 0]
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4]
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0]
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0]
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0]
        ];
    }
}

function drawBlock(ctx, val, x, y, size) {
    ctx.fillStyle = COLORS[val];
    ctx.fillRect(x * size, y * size, size, size);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = BORDER_COLORS[val];
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x * size + 2, y * size + 2, size - 4, size / 4);
}

function draw() {
    context.fillStyle = '#050508';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawMatrix(context, arena, {x: 0, y: 0}, GRID_SIZE);

    if (player.matrix) {
        drawMatrix(context, player.matrix, player.pos, GRID_SIZE);
    }
}

function drawGrid() {
    context.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    context.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
}

function drawMatrix(ctx, matrix, offset, size) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(ctx, value, x + offset.x, y + offset.y, size);
            }
        });
    });
}

function drawNext() {
    nextContext.fillStyle = '#050508';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!player.nextMatrix) return;

    const matrix = player.nextMatrix;
    const mRows = matrix.length;
    const mCols = matrix[0].length;
    const size = 20;
    
    const offsetX = (nextCanvas.width - mCols * size) / 2 / size;
    const offsetY = (nextCanvas.height - mRows * size) / 2 / size;

    drawMatrix(nextContext, matrix, {x: offsetX, y: offsetY}, size);
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] === undefined ||
                arena[y + o.y][x + o.x] === undefined ||
                arena[y + o.y][x + o.x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    let steps = 0;
    while (!collide(arena, player)) {
        player.pos.y++;
        steps++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    score += (steps - 1) * 2;
    updateScore();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

const pieces = 'ILJOSTZ';

function playerReset() {
    if (!player.nextType) {
        player.type = pieces[pieces.length * Math.random() | 0];
        player.matrix = createPiece(player.type);
        player.nextType = pieces[pieces.length * Math.random() | 0];
        player.nextMatrix = createPiece(player.nextType);
    } else {
        player.type = player.nextType;
        player.matrix = player.nextMatrix;
        player.nextType = pieces[pieces.length * Math.random() | 0];
        player.nextMatrix = createPiece(player.nextType);
    }

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    drawNext();

    if (collide(arena, player)) {
        handleGameOver();
    }
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        const scoreTable = [0, 100, 300, 500, 800];
        score += scoreTable[rowCount] * level;
        lines += rowCount;
        
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

function updateScore() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('lines').innerText = lines;
}

function update(time = 0) {
    if (paused || gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function handleGameOver() {
    gameOver = true;
    document.getElementById('overlay-title').innerText = "OYUN BİTTİ!";
    document.getElementById('overlay-text').innerHTML = `Toplam Skor: <span style="color:#ffaa00">${score}</span><br>Seviye: ${level}<br><br>Yeniden başlamak için butona tıklayın`;
    document.getElementById('start-btn').innerText = "YENİDEN BAŞLAT";
    document.getElementById('overlay').classList.remove('hidden');
}

function startNewGame() {
    arena = createMatrix(COLS, ROWS);
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropCounter = 0;
    gameOver = false;
    paused = false;
    player.nextType = null;
    playerReset();
    updateScore();
    document.getElementById('overlay').classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(update);
}

function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
        document.getElementById('overlay-title').innerText = "DURAKLATILDI";
        document.getElementById('overlay-text').innerText = "Devam etmek için butona tıklayın veya P tuşuna basın";
        document.getElementById('start-btn').innerText = "DEVAM ET";
        document.getElementById('overlay').classList.remove('hidden');
    } else {
        document.getElementById('overlay').classList.add('hidden');
        lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (gameOver) {
        startNewGame();
    } else if (paused) {
        togglePause();
    } else {
        startNewGame();
    }
});

document.addEventListener('keydown', event => {
    if (gameOver) return;

    const key = event.key.toUpperCase();

    if (["ARROWUP", "ARROWDOWN", "ARROWLEFT", "ARROWRIGHT", " "].includes(event.key)) {
        event.preventDefault();
    }

    if (key === 'P' || event.key === 'Escape') {
        togglePause();
        return;
    }

    if (paused) return;

    if (event.key === 'ArrowLeft' || key === 'A') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight' || key === 'D') {
        playerMove(1);
    } else if (event.key === 'ArrowDown' || key === 'S') {
        playerDrop();
    } else if (event.key === 'ArrowUp' || key === 'W' || key === 'X') {
        playerRotate(1);
    } else if (key === 'Z') {
        playerRotate(-1);
    } else if (event.key === ' ') {
        playerHardDrop();
    }

    draw();
});

draw();
drawNext();