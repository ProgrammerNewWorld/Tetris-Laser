class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.BLOCK_SIZE = 25;
        
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.lastLevel = 1;
        this.audioActivated = false;
        
        // 新增难度系统属性
        this.combo = 0; // 连击数
        this.maxCombo = 0; // 最大连击数
        this.piecesPlaced = 0; // 已放置的方块数
        this.specialMode = false; // 特殊模式（高速模式）
        this.specialModeTimer = 0; // 特殊模式计时器
        this.difficultyMultiplier = 1; // 难度倍数
        this.lastClearTime = 0; // 上次消除时间（用于连击）
        this.comboTimeout = 5000; // 连击超时时间（毫秒）- 增加到5秒
        
        this.pieces = [
            { shape: [[1, 1, 1, 1]], color: 'piece-I' },
            { shape: [[1, 1], [1, 1]], color: 'piece-O' },
            { shape: [[0, 1, 0], [1, 1, 1]], color: 'piece-T' },
            { shape: [[0, 1, 1], [1, 1, 0]], color: 'piece-S' },
            { shape: [[1, 1, 0], [0, 1, 1]], color: 'piece-Z' },
            { shape: [[1, 0, 0], [1, 1, 1]], color: 'piece-J' },
            { shape: [[0, 0, 1], [1, 1, 1]], color: 'piece-L' }
        ];
        
        this.init();
    }
    
    init() {
        this.initBoard();
        this.bindEvents();
        this.adjustCanvasSize();
        this.generateNewPiece();
        this.updateDisplay();
        this.gameLoop();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.adjustCanvasSize();
        });
        
        // 不在这里启动背景音乐，等待用户交互
    }
    
    initBoard() {
        this.board = [];
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                this.board[y][x] = 0;
            }
        }
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.activateAudio();
            this.togglePause();
        });
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.activateAudio();
            this.newGame();
        });
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.activateAudio();
            this.newGame();
        });
        document.getElementById('muteBtn').addEventListener('click', () => {
            this.activateAudio();
            this.toggleMute();
        });
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning || this.gamePaused) return;

        // 激活音频系统
        this.activateAudio();

        if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'ArrowLeft':
                if (this.movePiece(-1, 0)) {
                    if (window.audioManager) window.audioManager.moveSound();
                }
                break;
            case 'ArrowRight':
                if (this.movePiece(1, 0)) {
                    if (window.audioManager) window.audioManager.moveSound();
                }
                break;
            case 'ArrowDown':
                if (this.movePiece(0, 1)) {
                    if (window.audioManager) window.audioManager.moveSound();
                }
                break;
            case 'ArrowUp':
                if (this.rotatePiece()) {
                    if (window.audioManager) window.audioManager.rotateSound();
                }
                break;
            case ' ':
                this.togglePause();
                break;
        }
    }
    
    generateNewPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.createRandomPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createRandomPiece();
        
        if (this.isCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver();
        }
        
        this.drawNextPiece();
    }
    
    createRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * this.pieces.length);
        const piece = this.pieces[pieceIndex];
        
        return {
            shape: piece.shape,
            color: piece.color,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }
    
    movePiece(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (!this.isCollision(newX, newY, this.currentPiece.shape)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            return true;
        }
        
        if (dy > 0) {
            this.placePiece();
            this.generateNewPiece();
        }
        
        return false;
    }
    
    rotatePiece() {
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        if (!this.isCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
            this.currentPiece.shape = rotated;
            return true;
        }
        return false;
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = [];
        
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = matrix[rows - 1 - j][i];
            }
        }
        
        return rotated;
    }
    
    isCollision(x, y, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || 
                        newY >= this.BOARD_HEIGHT ||
                        (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    placePiece() {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const x = this.currentPiece.x + col;
                    const y = this.currentPiece.y + row;
                    if (y >= 0) {
                        this.board[y][x] = this.currentPiece.color;
                    }
                }
            }
        }
        
        // 增加已放置方块计数
        this.piecesPlaced++;
        
        // 每放置10个方块，增加一点难度
        if (this.piecesPlaced % 10 === 0) {
            this.difficultyMultiplier += 0.1;
            console.log(`难度提升！当前倍数: ${this.difficultyMultiplier.toFixed(1)}`);
        }
        
        // 检查是否触发特殊模式（每50个方块有10%概率）
        if (this.piecesPlaced % 50 === 0 && Math.random() < 0.1 && !this.specialMode) {
            this.specialMode = true;
            this.specialModeTimer = 0;
            console.log('🎉 触发特殊模式！速度提升3倍，持续10秒！');
        }
        
        // 检查是否消除行（这会触发连击系统）
        const linesCleared = this.clearLines();
        
        // 如果消除了行，更新连击
        if (linesCleared > 0) {
            const now = Date.now();
            const timeSinceLastClear = now - this.lastClearTime;
            
            console.log(`连击检查: 距离上次消除 ${timeSinceLastClear}ms, 超时时间 ${this.comboTimeout}ms`);
            
            if (timeSinceLastClear < this.comboTimeout) {
                this.combo++;
                if (this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                }
                console.log(`🔥 连击 ${this.combo}！最大连击: ${this.maxCombo}`);
            } else {
                this.combo = 1;
                console.log(`🔄 开始新连击: ${this.combo}`);
            }
            this.lastClearTime = now;
        } else {
            // 没有消除行，重置连击
            this.combo = 0;
            console.log('❌ 没有消除行，连击重置');
        }
        
        if (window.audioManager) window.audioManager.landSound();
    }
    
    clearLines() {
        const linesToClear = [];
        
        // 从底部向上检查每一行
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }
        
        if (linesToClear.length > 0) {
            console.log(`检测到 ${linesToClear.length} 行需要消除:`, linesToClear);
            
            if (window.audioManager) window.audioManager.laserSound();
            
            this.createLaserEffect(linesToClear);
            
            // 从大到小排序，确保从底部开始消除
            linesToClear.sort((a, b) => b - a);
            
            // 创建新的游戏板，避免索引错乱
            const newBoard = [];
            
            // 从底部开始重建游戏板
            for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
                if (!linesToClear.includes(y)) {
                    // 如果这一行不需要消除，就保留
                    newBoard.unshift([...this.board[y]]);
                }
            }
            
            // 在顶部添加空行，直到达到原来的高度
            while (newBoard.length < this.BOARD_HEIGHT) {
                newBoard.unshift(new Array(this.BOARD_WIDTH).fill(0));
            }
            
            // 更新游戏板
            this.board = newBoard;
            
            const lineCount = linesToClear.length;
            console.log(`成功消除 ${lineCount} 行`);
            
            // 计算分数（包含连击奖励、难度倍数、特殊模式奖励）
            let baseScore = lineCount * 100 * this.level;
            let comboBonus = this.combo > 1 ? baseScore * (this.combo - 1) * 0.5 : 0;
            let difficultyBonus = baseScore * (this.difficultyMultiplier - 1) * 0.3;
            let specialModeBonus = this.specialMode ? baseScore * 0.5 : 0;
            
            // 特殊奖励：同时消除4行
            let tetrisBonus = lineCount === 4 ? baseScore * 2 : 0;
            
            const totalScore = baseScore + comboBonus + difficultyBonus + specialModeBonus + tetrisBonus;
            
            this.lines += lineCount;
            this.score += Math.floor(totalScore);
            
            // 显示分数详情
            if (comboBonus > 0 || difficultyBonus > 0 || specialModeBonus > 0 || tetrisBonus > 0) {
                console.log(`分数详情: 基础${baseScore} + 连击${Math.floor(comboBonus)} + 难度${Math.floor(difficultyBonus)} + 特殊${Math.floor(specialModeBonus)} + Tetris${Math.floor(tetrisBonus)} = ${Math.floor(totalScore)}`);
            }
            
            // 等级提升（更平滑的难度曲线）
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 80);
            
            if (window.audioManager) window.audioManager.clearSound(lineCount);
            
            if (this.level > this.lastLevel) {
                if (window.audioManager) window.audioManager.levelUpSound();
                this.lastLevel = this.level;
                console.log(`🎯 升级到 ${this.level} 级！`);
            }
            
            this.updateDisplay();
            
            return lineCount;
        } else {
            return 0;
        }
    }
    
    createLaserEffect(linesToClear) {
        const laserContainer = document.getElementById('laserEffects');
        const boardRect = this.canvas.getBoundingClientRect();
        
        linesToClear.forEach((lineY, index) => {
            setTimeout(() => {
                const laserLine = document.createElement('div');
                laserLine.className = 'laser-line';
                laserLine.style.left = boardRect.left + 'px';
                laserLine.style.top = (boardRect.top + lineY * this.BLOCK_SIZE + this.BLOCK_SIZE / 2) + 'px';
                laserLine.style.width = boardRect.width + 'px';
                laserContainer.appendChild(laserLine);
                
                for (let i = 0; i < 20; i++) {
                    setTimeout(() => {
                        const particle = document.createElement('div');
                        particle.className = 'laser-particle';
                        particle.style.left = (boardRect.left + Math.random() * boardRect.width) + 'px';
                        particle.style.top = (boardRect.top + lineY * this.BLOCK_SIZE + Math.random() * this.BLOCK_SIZE) + 'px';
                        particle.style.setProperty('--tx', (Math.random() * 200 - 100) + 'px');
                        particle.style.setProperty('--ty', (Math.random() * 200 - 100) + 'px');
                        laserContainer.appendChild(particle);
                        
                        setTimeout(() => {
                            if (particle.parentNode) {
                                particle.parentNode.removeChild(particle);
                            }
                        }, 800);
                    }, i * 20);
                }
                
                setTimeout(() => {
                    if (laserLine.parentNode) {
                        laserLine.parentNode.removeChild(laserLine);
                    }
                }, 500);
            }, index * 100);
        });
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制已放置的方块
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.board[y][x]);
                }
            }
        }
        
        // 绘制当前方块
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }
        
        // 去掉网格线绘制
        // this.drawGrid();
    }
    
    drawBlock(x, y, colorClass) {
        const pixelX = x * this.BLOCK_SIZE;
        const pixelY = y * this.BLOCK_SIZE;
        
        const gradient = this.ctx.createLinearGradient(pixelX, pixelY, pixelX + this.BLOCK_SIZE, pixelY + this.BLOCK_SIZE);
        
        // 使用红黑风格的颜色方案
        switch (colorClass) {
            case 'piece-I':
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(1, '#8b0000');
                break;
            case 'piece-O':
                gradient.addColorStop(0, '#ff4444');
                gradient.addColorStop(1, '#cc0000');
                break;
            case 'piece-T':
                gradient.addColorStop(0, '#ff6666');
                gradient.addColorStop(1, '#aa0000');
                break;
            case 'piece-S':
                gradient.addColorStop(0, '#ff8888');
                gradient.addColorStop(1, '#880000');
                break;
            case 'piece-Z':
                gradient.addColorStop(0, '#ffaaaa');
                gradient.addColorStop(1, '#660000');
                break;
            case 'piece-J':
                gradient.addColorStop(0, '#ffcccc');
                gradient.addColorStop(1, '#440000');
                break;
            case 'piece-L':
                gradient.addColorStop(0, '#ffeeee');
                gradient.addColorStop(1, '#220000');
                break;
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, this.BLOCK_SIZE - 2, this.BLOCK_SIZE - 2);
        
        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, this.BLOCK_SIZE - 2, 3);
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 3, this.BLOCK_SIZE - 2);
    }
    
    drawPiece(piece) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const x = piece.x + col;
                    const y = piece.y + row;
                    if (y >= 0) {
                        this.drawBlock(x, y, piece.color);
                    }
                }
            }
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const blockSize = 20;
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
            
            for (let row = 0; row < this.nextPiece.shape.length; row++) {
                for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                    if (this.nextPiece.shape[row][col]) {
                        const x = offsetX + col * blockSize;
                        const y = offsetY + row * blockSize;
                        
                        const gradient = this.nextCtx.createLinearGradient(x, y, x + blockSize, y + blockSize);
                        
                        switch (this.nextPiece.color) {
                            case 'piece-I':
                                gradient.addColorStop(0, '#ff0000');
                                gradient.addColorStop(1, '#8b0000');
                                break;
                            case 'piece-O':
                                gradient.addColorStop(0, '#ff4444');
                                gradient.addColorStop(1, '#cc0000');
                                break;
                            case 'piece-T':
                                gradient.addColorStop(0, '#ff6666');
                                gradient.addColorStop(1, '#aa0000');
                                break;
                            case 'piece-S':
                                gradient.addColorStop(0, '#ff8888');
                                gradient.addColorStop(1, '#880000');
                                break;
                            case 'piece-Z':
                                gradient.addColorStop(0, '#ffaaaa');
                                gradient.addColorStop(1, '#660000');
                                break;
                            case 'piece-J':
                                gradient.addColorStop(0, '#ffcccc');
                                gradient.addColorStop(1, '#440000');
                                break;
                            case 'piece-L':
                                gradient.addColorStop(0, '#ffeeee');
                                gradient.addColorStop(1, '#220000');
                                break;
                        }
                        
                        this.nextCtx.fillStyle = gradient;
                        this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                        
                        this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, 2);
                        this.nextCtx.fillRect(x + 1, y + 1, 2, blockSize - 2);
                    }
                }
            }
        }
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
        
        // 更新连击显示
        const comboElement = document.getElementById('combo');
        if (comboElement) {
            comboElement.textContent = this.combo > 0 ? `${this.combo}x` : '0x';
        }
        
        // 更新难度倍数显示
        const difficultyElement = document.getElementById('difficulty');
        if (difficultyElement) {
            difficultyElement.textContent = this.difficultyMultiplier.toFixed(1);
        }
        
        // 更新特殊模式显示
        const specialModeElement = document.getElementById('specialMode');
        if (specialModeElement) {
            if (this.specialMode) {
                const remainingTime = Math.max(0, 10 - Math.floor(this.specialModeTimer / 1000));
                specialModeElement.textContent = `🔥 ${remainingTime}s`;
                specialModeElement.style.color = '#ff0000';
            } else {
                specialModeElement.textContent = '正常';
                specialModeElement.style.color = '#ffffff';
            }
        }
    }
    
    gameLoop() {
        if (this.gameRunning && !this.gamePaused) {
            this.dropTime += 16;
            
            // 更新连击超时
            if (this.combo > 0 && Date.now() - this.lastClearTime > this.comboTimeout) {
                console.log(`⏰ 连击超时！当前连击: ${this.combo}, 最大连击: ${this.maxCombo}`);
                this.combo = 0;
            }
            
            // 更新特殊模式
            if (this.specialMode) {
                this.specialModeTimer += 16;
                if (this.specialModeTimer >= 10000) { // 10秒特殊模式
                    this.specialMode = false;
                    this.specialModeTimer = 0;
                    console.log('特殊模式结束');
                }
            }
            
            // 计算实际下落间隔（考虑等级、难度倍数和特殊模式）
            let actualDropInterval = this.dropInterval;
            
            // 应用难度倍数
            actualDropInterval = Math.max(50, actualDropInterval / this.difficultyMultiplier);
            
            // 应用特殊模式
            if (this.specialMode) {
                actualDropInterval = Math.max(30, actualDropInterval / 3); // 特殊模式下速度提升3倍
            }
            
            // 调试信息：每100帧输出一次当前速度信息
            if (Math.floor(this.dropTime / 16) % 100 === 0) {
                console.log(`当前速度: 等级${this.level}, 基础间隔${this.dropInterval}ms, 难度倍数${this.difficultyMultiplier.toFixed(1)}, 实际间隔${Math.floor(actualDropInterval)}ms`);
            }
            
            if (this.dropTime >= actualDropInterval) {
                this.movePiece(0, 1);
                this.dropTime = 0;
            }
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        const pauseText = this.gamePaused ? '继续' : '暂停';
        pauseBtn.textContent = pauseText;
        
        if (window.audioManager) window.audioManager.pauseSound();
    }
    
    toggleMute() {
        if (!window.audioManager) {
            return;
        }
        
        const isMuted = window.audioManager.toggleMute();
        
        const muteBtn = document.getElementById('muteBtn');
        
        const muteText = isMuted ? '🔇' : '🔊';
        muteBtn.textContent = isMuted ? '🔇 音效' : '🔊 音效';
        
        if (!isMuted) window.audioManager.buttonClickSound();
    }
    
    newGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropTime = 0;
        this.dropInterval = 1000;
        this.lastLevel = 1;
        
        // 重置新增的游戏状态
        this.combo = 0;
        this.maxCombo = 0;
        this.piecesPlaced = 0;
        this.specialMode = false;
        this.specialModeTimer = 0;
        this.difficultyMultiplier = 1;
        this.lastClearTime = 0;
        
        this.initBoard();
        this.generateNewPiece();
        this.updateDisplay();
        
        // 重置按钮文本
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = '暂停';
        
        document.getElementById('gameOverlay').style.display = 'none';
        
        if (window.audioManager) window.audioManager.gameStartSound();
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverlay').style.display = 'flex';
        
        if (window.audioManager) window.audioManager.gameOverSound();
    }
    
    // 激活音频系统（在用户交互时调用）
    activateAudio() {
        if (window.audioManager && !this.audioActivated) {
            window.audioManager.resumeAudioContext();
            window.audioManager.startBackgroundMusic();
            this.audioActivated = true;
        }
    }
    
    adjustCanvasSize() {
        // 桌面端使用固定大小
        this.canvas.width = 250;
        this.canvas.height = 500;
        this.BLOCK_SIZE = 25;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
}); 