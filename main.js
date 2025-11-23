const body = document.body;

// タイマー表示要素
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const millisecondsEl = document.getElementById('milliseconds');

// 現在時刻表示要素
const yearEl = document.getElementById('year');
const monthEl = document.getElementById('month');
const dayEl = document.getElementById('day');
const liveHourEl = document.getElementById('liveHour');
const liveMinuteEl = document.getElementById('liveMinute');
const liveSecondEl = document.getElementById('liveSecond');
const heroDateEl = document.getElementById('heroDate');
const heroFullDateEl = document.getElementById('heroFullDate');
const primaryCityTimeEl = document.getElementById('primaryCityTime');
const locationNameEl = document.getElementById('locationName');
const locationSubEl = document.getElementById('locationSub');
const citySelect = document.getElementById('citySelect');
const primaryCityLabelEl = document.getElementById('primaryCityLabel');
const primaryCityMetaEl = document.getElementById('primaryCityMeta');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const lapBtn = document.getElementById('lapBtn');

const lapList = document.getElementById('lapList');
const noLaps = document.getElementById('noLaps');

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const themeSelect = document.getElementById('themeSelect');
const soundToggle = document.getElementById('soundToggle');
const alertTimeInput = document.getElementById('alertTime');
const pulseEffect = document.getElementById('pulseEffect');
const particlesEffect = document.getElementById('particlesEffect');
const clearLapsBtn = document.getElementById('clearLapsBtn');
const particlesCanvas = document.getElementById('particlesCanvas');

// タイマーの状態
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;
let lapCount = 0;
let alertTime = 60;
let currentTheme = 'auto';
let particlesAnimationId = null;
let audioContext = null;

// テーマサイクルの配列（自動切り替え用）
const themeCycle = ['day', 'night', 'ocean', 'sunset', 'forest', 'purple', 'pink', 'minimal'];
let lastThemeChangeSecond = -1;

const cityCatalog = {
    tokyo: { name: 'Tokyo, Japan', short: 'Tokyo', timezone: 'Asia/Tokyo', utc: '+9' },
    london: { name: 'London, United Kingdom', short: 'London', timezone: 'Europe/London', utc: '+0' },
    newyork: { name: 'New York, United States', short: 'New York', timezone: 'America/New_York', utc: '-5' },
    losangeles: { name: 'Los Angeles, United States', short: 'Los Angeles', timezone: 'America/Los_Angeles', utc: '-8' },
    paris: { name: 'Paris, France', short: 'Paris', timezone: 'Europe/Paris', utc: '+1' },
    sydney: { name: 'Sydney, Australia', short: 'Sydney', timezone: 'Australia/Sydney', utc: '+10' },
    hongkong: { name: 'Hong Kong, China', short: 'Hong Kong', timezone: 'Asia/Hong_Kong', utc: '+8' },
};

let currentCityKey = (citySelect && citySelect.value) || 'tokyo';

const getCityDate = (timezone) => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
};

const getDayPhase = (hour) => {
    return hour >= 6 && hour < 18 ? 'Day' : 'Night';
};

// 桁埋め関数 zeroPadding
const zeroPadding = (num) => {
    return String(num).padStart(2, '0');
}

// 時間表示を更新する関数
const updateDisplay = (time) => {
    const totalSeconds = Math.floor(time / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((time % 1000) / 10);

    hoursEl.textContent = zeroPadding(hours);
    minutesEl.textContent = zeroPadding(minutes);
    secondsEl.textContent = zeroPadding(seconds);
    millisecondsEl.textContent = zeroPadding(milliseconds);
}

// 開始ボタンの処理
startBtn.addEventListener('click', () => {
    if (isRunning) return;

    isRunning = true;
    startTime = Date.now() - elapsedTime;

    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        updateDisplay(elapsedTime);

        const currentSeconds = Math.floor(elapsedTime / 1000);

        // 自動テーマの場合、背景色を時間に応じて変更
        if (currentTheme === 'auto') {
            if (currentSeconds % 60 <= 30) {
                applyTheme('day');
            } else {
                applyTheme('night');
            }
        }
        // 自動切り替えモードの場合、30秒ごとにテーマを変更
        else if (currentTheme === 'cycle') {
            const themeChangeSecond = Math.floor(currentSeconds / 30);
            if (themeChangeSecond !== lastThemeChangeSecond) {
                lastThemeChangeSecond = themeChangeSecond;
                const themeIndex = themeChangeSecond % themeCycle.length;
                applyTheme(themeCycle[themeIndex]);
            }
        }

        // アラートチェック
        if (currentSeconds === alertTime && soundToggle.checked) {
            playAlertSound();
        }
    }, 10);

    // ボタンの状態を更新
    startBtn.disabled = true;
    stopBtn.disabled = false;
    lapBtn.disabled = false;
});

// 停止ボタンの処理
stopBtn.addEventListener('click', () => {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);

    // ボタンの状態を更新
    startBtn.disabled = false;
    stopBtn.disabled = true;
    lapBtn.disabled = true;
});

// リセットボタンの処理
resetBtn.addEventListener('click', () => {
    isRunning = false;
    clearInterval(timerInterval);

    elapsedTime = 0;
    startTime = 0;
    updateDisplay(0);

    // サイクルモードの場合、テーマをリセット
    if (currentTheme === 'cycle') {
        lastThemeChangeSecond = -1;
        applyTheme(themeCycle[0]);
    }

    // ボタンの状態を更新
    startBtn.disabled = false;
    stopBtn.disabled = true;
    lapBtn.disabled = true;

    // ラップタイムをクリア
    lapList.innerHTML = '';
    lapCount = 0;
    noLaps.classList.remove('hidden');
});

// ラップボタンの処理
lapBtn.addEventListener('click', () => {
    if (!isRunning) return;

    lapCount++;
    const lapTime = elapsedTime;
    
    // ラップアイテムを作成
    const lapItem = document.createElement('div');
    lapItem.className = 'lap-item';
    
    const lapNumber = document.createElement('span');
    lapNumber.className = 'lap-number';
    lapNumber.textContent = `ラップ ${lapCount}`;
    
    const lapTimeSpan = document.createElement('span');
    lapTimeSpan.className = 'lap-time';
    
    const totalSeconds = Math.floor(lapTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((lapTime % 1000) / 10);
    
    if (hours > 0) {
        lapTimeSpan.textContent = `${zeroPadding(hours)}:${zeroPadding(minutes)}:${zeroPadding(seconds)}.${zeroPadding(milliseconds)}`;
    } else {
        lapTimeSpan.textContent = `${zeroPadding(minutes)}:${zeroPadding(seconds)}.${zeroPadding(milliseconds)}`;
    }
    
    lapItem.appendChild(lapNumber);
    lapItem.appendChild(lapTimeSpan);
    
    // ラップリストの先頭に追加
    lapList.insertBefore(lapItem, lapList.firstChild);
    
    // "ラップタイムはまだ記録されていません"を非表示
    noLaps.classList.add('hidden');
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // 入力フィールドにフォーカスがある場合は無視
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    switch(e.code) {
        case 'Space':
            e.preventDefault();
            if (isRunning) {
                stopBtn.click();
            } else {
                startBtn.click();
            }
            break;
        case 'KeyR':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                resetBtn.click();
            }
            break;
        case 'KeyL':
            if (isRunning) {
                e.preventDefault();
                lapBtn.click();
            }
            break;
    }
});

// テーマを適用する関数
const applyTheme = (theme) => {
    // 既存のテーマクラスを削除
    const themes = ['day', 'night', 'ocean', 'sunset', 'forest', 'purple', 'pink', 'minimal'];
    themes.forEach(t => body.classList.remove(t));
    
    // 新しいテーマを適用
    if (theme !== 'auto' && theme !== 'cycle') {
        body.classList.add(theme);
    }
}

// テーマを設定する関数（currentThemeも更新）
const setTheme = (theme) => {
    currentTheme = theme;
    if (theme === 'auto') {
        // 自動モードの初期設定
        const now = new Date();
        const currentSeconds = now.getSeconds();
        if (currentSeconds <= 30) {
            applyTheme('day');
        } else {
            applyTheme('night');
        }
    } else if (theme === 'cycle') {
        // サイクルモードの初期設定
        lastThemeChangeSecond = -1;
        applyTheme(themeCycle[0]);
    } else {
        applyTheme(theme);
    }
}

// 設定パネルの表示/非表示
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
});

// テーマ選択の処理
themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    setTheme(theme);
    savePreferences();
});

// 音声アラートの処理
soundToggle.addEventListener('change', () => {
    savePreferences();
});

// アラート時間の処理
alertTimeInput.addEventListener('change', (e) => {
    alertTime = parseInt(e.target.value) || 60;
    savePreferences();
});

if (citySelect) {
    citySelect.addEventListener('change', (e) => {
        currentCityKey = e.target.value;
        updateLiveTime();
    });
}

// パルスエフェクトの処理
pulseEffect.addEventListener('change', (e) => {
    const timeDisplay = document.querySelector('.time');
    if (e.target.checked) {
        timeDisplay.classList.add('pulse');
    } else {
        timeDisplay.classList.remove('pulse');
    }
    savePreferences();
});

// パーティクルエフェクトの処理
particlesEffect.addEventListener('change', (e) => {
    if (e.target.checked) {
        initParticles();
        particlesCanvas.classList.add('active');
    } else {
        stopParticles();
        particlesCanvas.classList.remove('active');
    }
    savePreferences();
});

// ラップタイムをクリア
clearLapsBtn.addEventListener('click', () => {
    lapList.innerHTML = '';
    lapCount = 0;
    noLaps.classList.remove('hidden');
});

// アラート音を再生
const playAlertSound = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// パーティクルエフェクトの初期化
const initParticles = () => {
    const ctx = particlesCanvas.getContext('2d');
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * particlesCanvas.width,
            y: Math.random() * particlesCanvas.height,
            radius: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    
    const animate = () => {
        ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        
        particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            if (particle.x < 0 || particle.x > particlesCanvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > particlesCanvas.height) particle.speedY *= -1;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        particlesAnimationId = requestAnimationFrame(animate);
    };
    
    animate();
}

// パーティクルエフェクトを停止
const stopParticles = () => {
    if (particlesAnimationId) {
        cancelAnimationFrame(particlesAnimationId);
        particlesAnimationId = null;
    }
    const ctx = particlesCanvas.getContext('2d');
    ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
}

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    if (particlesEffect.checked) {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }
});

// 設定を保存
const savePreferences = () => {
    const preferences = {
        theme: themeSelect.value,
        soundEnabled: soundToggle.checked,
        alertTime: alertTime,
        pulseEffect: pulseEffect.checked,
        particlesEffect: particlesEffect.checked
    };
    
    try {
        localStorage.setItem('timerPreferences', JSON.stringify(preferences));
    } catch (e) {
        console.warn('設定の保存に失敗しました:', e);
    }
}

// 設定を読み込み
const loadPreferences = () => {
    try {
        const saved = localStorage.getItem('timerPreferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            
            if (preferences.theme) {
                themeSelect.value = preferences.theme;
                setTheme(preferences.theme);
            }
            
            if (preferences.soundEnabled !== undefined) {
                soundToggle.checked = preferences.soundEnabled;
            }
            
            if (preferences.alertTime) {
                alertTime = preferences.alertTime;
                alertTimeInput.value = alertTime;
            }
            
            if (preferences.pulseEffect !== undefined) {
                pulseEffect.checked = preferences.pulseEffect;
                if (preferences.pulseEffect) {
                    document.querySelector('.time').classList.add('pulse');
                }
            }
            
            if (preferences.particlesEffect !== undefined) {
                particlesEffect.checked = preferences.particlesEffect;
                if (preferences.particlesEffect) {
                    initParticles();
                    particlesCanvas.classList.add('active');
                }
            }
        }
    } catch (e) {
        console.warn('設定の読み込みに失敗しました:', e);
    }
}

// 現在時刻を更新する関数
const updateLiveTime = () => {
    const city = cityCatalog[currentCityKey] || cityCatalog.tokyo;
    const cityDate = getCityDate(city.timezone);

    const year = cityDate.getFullYear();
    const month = cityDate.getMonth();
    const date = cityDate.getDate();
    const hours = cityDate.getHours();
    const minutes = cityDate.getMinutes();
    const seconds = cityDate.getSeconds();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    yearEl.textContent = year;
    monthEl.textContent = zeroPadding(month + 1);
    dayEl.textContent = zeroPadding(date);
    liveHourEl.textContent = zeroPadding(hours);
    liveMinuteEl.textContent = zeroPadding(minutes);
    liveSecondEl.textContent = zeroPadding(seconds);

    if (heroDateEl && heroFullDateEl) {
        heroDateEl.textContent = `${weekdayShort[cityDate.getDay()]} · ${zeroPadding(hours)}:${zeroPadding(minutes)}`;
        heroFullDateEl.textContent = `${weekdayNames[cityDate.getDay()]}, ${monthNames[month]} ${date}, ${year}`;
    }

    if (locationNameEl) {
        locationNameEl.textContent = city.name;
    }

    const phase = getDayPhase(hours);

    if (locationSubEl) {
        locationSubEl.textContent = `UTC${city.utc} · ${phase}`;
    }

    if (primaryCityLabelEl) {
        primaryCityLabelEl.textContent = city.short;
    }

    if (primaryCityMetaEl) {
        primaryCityMetaEl.textContent = `UTC${city.utc} · ${phase}`;
    }

    if (primaryCityTimeEl) {
        primaryCityTimeEl.textContent = `${zeroPadding(hours)}:${zeroPadding(minutes)}`;
    }
}

// 現在時刻を定期的に更新（100msごと）
setInterval(() => {
    updateLiveTime();
}, 100);

// 初期表示
updateDisplay(0);
updateLiveTime();

// 設定を読み込み
loadPreferences();

// 初期背景色を設定（現在時刻に基づく、autoテーマの場合）
// loadPreferencesの後に実行されるため、currentThemeが正しく設定されている
if (currentTheme === 'auto') {
    const now = new Date();
    const currentSeconds = now.getSeconds();
    if (currentSeconds <= 30) {
        body.classList.add('day');
        body.classList.remove('night');
    } else {
        body.classList.add('night');
        body.classList.remove('day');
    }
} else if (currentTheme === 'cycle') {
    // サイクルモードの場合、最初のテーマを適用
    applyTheme(themeCycle[0]);
    lastThemeChangeSecond = -1;
}

