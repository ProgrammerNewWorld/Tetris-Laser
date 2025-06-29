class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.backgroundMusic = null;
        this.isMuted = false;
        this.volume = 0.7;
        this.backgroundMusicTimer = null; // 添加背景音乐定时器引用
        
        this.initAudio();
    }
    
    initAudio() {
        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volume;
        } catch (e) {
            console.log('Web Audio API not supported:', e);
        }
    }
    
    // 激活音频上下文（需要在用户交互后调用）
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');
            });
        }
    }
    
    // 生成音调
    createTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext || this.isMuted) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // 生成和弦
    createChord(frequencies, duration, type = 'sine', volume = 0.2) {
        if (!this.audioContext || this.isMuted) return;
        
        frequencies.forEach(freq => {
            this.createTone(freq, duration, type, volume / frequencies.length);
        });
    }
    
    // 生成噪声
    createNoise(duration, volume = 0.1) {
        if (!this.audioContext || this.isMuted) return;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        whiteNoise.buffer = buffer;
        whiteNoise.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        whiteNoise.start(this.audioContext.currentTime);
        whiteNoise.stop(this.audioContext.currentTime + duration);
    }
    
    // 方块移动音效
    moveSound() {
        this.createTone(200, 0.05, 'square', 0.1);
    }
    
    // 方块旋转音效
    rotateSound() {
        this.createChord([400, 600], 0.1, 'sine', 0.15);
    }
    
    // 方块落地音效
    landSound() {
        this.createTone(150, 0.2, 'sawtooth', 0.2);
    }
    
    // 消除音效
    clearSound(lines) {
        const baseFreq = 300;
        const duration = 0.3;
        
        if (lines === 1) {
            this.createChord([baseFreq, baseFreq * 1.25], duration, 'sine', 0.2);
        } else if (lines === 2) {
            this.createChord([baseFreq, baseFreq * 1.25, baseFreq * 1.5], duration, 'sine', 0.2);
        } else if (lines === 3) {
            this.createChord([baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2], duration, 'sine', 0.2);
        } else if (lines >= 4) {
            // Tetris! 特殊音效
            this.createChord([baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2, baseFreq * 2.5], duration, 'sine', 0.25);
            setTimeout(() => {
                this.createChord([baseFreq * 2, baseFreq * 2.5, baseFreq * 3], duration, 'sine', 0.2);
            }, 200);
        }
    }
    
    // 激光消除音效
    laserSound() {
        // 激光扫过音效
        this.createTone(800, 0.1, 'sawtooth', 0.15);
        setTimeout(() => {
            this.createTone(1200, 0.1, 'sawtooth', 0.15);
        }, 50);
        setTimeout(() => {
            this.createTone(1600, 0.1, 'sawtooth', 0.15);
        }, 100);
        
        // 爆炸音效
        setTimeout(() => {
            this.createNoise(0.3, 0.1);
        }, 150);
    }
    
    // 游戏开始音效
    gameStartSound() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.createTone(note, 0.3, 'sine', 0.2);
            }, index * 150);
        });
    }
    
    // 游戏结束音效
    gameOverSound() {
        const notes = [1047, 784, 659, 523]; // C6, G5, E5, C5
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.createTone(note, 0.4, 'sine', 0.2);
            }, index * 200);
        });
    }
    
    // 等级提升音效
    levelUpSound() {
        const notes = [523, 659, 784, 1047, 1319]; // 上升音阶
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.createTone(note, 0.2, 'sine', 0.15);
            }, index * 100);
        });
    }
    
    // 暂停音效
    pauseSound() {
        this.createTone(400, 0.1, 'sine', 0.15);
    }
    
    // 按钮点击音效
    buttonClickSound() {
        this.createTone(600, 0.05, 'square', 0.1);
    }
    
    // 背景音乐（使用Web Audio API生成）
    startBackgroundMusic() {
        if (!this.audioContext || this.isMuted) return;
        
        this.stopBackgroundMusic();
        
        // 创建背景音乐循环
        const playBackgroundLoop = () => {
            if (this.isMuted) return;
            
            // 生成简单的背景音乐模式
            const time = this.audioContext.currentTime;
            const baseFreq = 220; // A3
            
            // 和弦进行
            const chords = [
                [baseFreq, baseFreq * 1.25, baseFreq * 1.5], // A major
                [baseFreq * 1.125, baseFreq * 1.406, baseFreq * 1.687], // B minor
                [baseFreq * 1.25, baseFreq * 1.562, baseFreq * 1.875], // C# minor
                [baseFreq * 1.5, baseFreq * 1.875, baseFreq * 2.25] // E major
            ];
            
            chords.forEach((chord, index) => {
                setTimeout(() => {
                    if (!this.isMuted) {
                        this.createChord(chord, 2, 'sine', 0.05);
                    }
                }, index * 2000);
            });
            
            // 每8秒重复一次
            this.backgroundMusicTimer = setTimeout(playBackgroundLoop, 8000);
        };
        
        playBackgroundLoop();
    }
    
    stopBackgroundMusic() {
        // 清除背景音乐定时器
        if (this.backgroundMusicTimer) {
            clearTimeout(this.backgroundMusicTimer);
            this.backgroundMusicTimer = null;
        }
    }
    
    // 静音/取消静音
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        return this.isMuted;
    }
    
    // 设置音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    // 获取音量
    getVolume() {
        return this.volume;
    }
    
    // 获取静音状态
    getMuteStatus() {
        return this.isMuted;
    }
}

// 创建全局音频管理器实例
window.audioManager = new AudioManager(); 