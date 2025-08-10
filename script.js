// Game Constants
const CARD_DEAL_DELAY = 300;
const DEALER_TURN_DELAY = 1000;
const SHAKE_THRESHOLD = 15;
const CLICK_DELAY = 500;
const VIBRATION_DURATION = 50;
const BLACKJACK_SCORE = 21;
const DEALER_STAND_SCORE = 17;
const MIN_LOAD_TIME = 2000; // Minimum loading time in ms

// UI Elements
const elements = {
    hitButton: document.getElementById('hit-button'),
    standButton: document.getElementById('stand-button'),
    newGameButton: document.getElementById('new-game-button'),
    playerHand: document.getElementById('player-hand'),
    dealerHand: document.getElementById('dealer-hand'),
    playerScore: document.getElementById('player-score'),
    dealerScore: document.getElementById('dealer-score'),
    result: document.getElementById('result'),
    winsCount: document.getElementById('wins-count'),
    lossesCount: document.getElementById('losses-count'),
    touchProtector: document.getElementById('touch-protector'),
    loadingScreen: document.getElementById('loading-screen'),
    gameContainer: document.getElementById('game-container'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    loadingStatus: document.getElementById('loading-status'),
    hapticFeedback: document.getElementById('haptic-feedback')
};

// Game State
const state = {
    deck: [],
    playerCards: [],
    dealerCards: [],
    gameOver: false,
    winsCount: 0,
    lossesCount: 0,
    lastClickTime: 0,
    isShakeEnabled: true,
    lastShakeTime: 0,
    isLegacyDevice: false,
    isInitialized: false,
    isProcessing: false
};

// Проверка поддержки функций
function checkCompatibility() {
    const isSonySW3 = navigator.userAgent.match(/SM-W500|SonySW3/i);
    const isOldAndroid = navigator.userAgent.match(/Android [5-6]/i);
    
    if (isSonySW3 || isOldAndroid) {
        state.isLegacyDevice = true;
        document.body.classList.add('legacy-device');
        updateLoadingStatus('Legacy device mode activated');
    }
}

// Initialize game
function initGame() {
    if (state.isProcessing) return;
    state.isProcessing = true;
    
    resetUI();
    createAndShuffleDeck();
    dealInitialCards().then(() => {
        state.isProcessing = false;
    });
}

function resetUI() {
    elements.result.textContent = '';
    elements.result.className = '';
    elements.hitButton.classList.remove('pulse');
    elements.playerHand.innerHTML = '';
    elements.dealerHand.innerHTML = '';
    elements.playerScore.textContent = 'Score: 0';
    elements.dealerScore.textContent = 'Score: ?';
    
    // Disable buttons during reset
    disableButtons();
}

function createAndShuffleDeck() {
    state.deck = [];
    const suits = ['♥', '♦', '♠', '♣'];
    
    for (let suit of suits) {
        for (let j = 1; j <= 13; j++) {
            state.deck.push({
                value: j > 10 ? 10 : (j === 1 ? 11 : j),
                suit: suit,
                isRed: suit === '♥' || suit === '♦'
            });
        }
    }
    
    shuffleDeck(state.deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

async function dealInitialCards() {
    state.playerCards = [];
    state.dealerCards = [];
    state.gameOver = false;
    
    // Enable buttons only when ready
    disableButtons();
    
    await dealCardWithDelay('player', 0);
    await dealCardWithDelay('dealer', CARD_DEAL_DELAY);
    await dealCardWithDelay('player', CARD_DEAL_DELAY);
    await dealCardWithDelay('dealer', CARD_DEAL_DELAY);
    
    // Enable buttons after dealing
    enableButtons();
    
    if (calculateScore(state.playerCards) === BLACKJACK_SCORE) {
        setTimeout(stand, 1000);
    }
}

function dealCardWithDelay(target, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            const card = drawCard();
            if (target === 'player') {
                state.playerCards.push(card);
            } else {
                state.dealerCards.push(card);
            }
            updateUI();
            vibrate();
            resolve();
        }, delay);
    });
}

function drawCard() {
    if (state.deck.length === 0) {
        createAndShuffleDeck();
    }
    return state.deck.pop();
}

function calculateScore(cards) {
    let score = cards.reduce((sum, card) => sum + card.value, 0);
    let aces = cards.filter(card => card.value === 11).length;
    
    while (score > BLACKJACK_SCORE && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

function createCardElement(card, hidden = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${hidden ? 'hidden' : ''} ${card.isRed ? 'red' : ''}`;
    
    if (!hidden) {
        let cardSymbol;
        switch(card.value) {
            case 11: cardSymbol = 'A'; break;
            case 12: cardSymbol = 'J'; break;
            case 13: cardSymbol = 'Q'; break;
            case 10: cardSymbol = 'K'; break;
            default: cardSymbol = card.value;
        }
        cardElement.textContent = `${cardSymbol}${card.suit}`;
    }
    
    if (!state.isLegacyDevice) {
        cardElement.classList.add('dealing');
        setTimeout(() => cardElement.classList.remove('dealing'), 500);
    }
    
    return cardElement;
}

function updateUI() {
    elements.playerHand.innerHTML = '';
    elements.dealerHand.innerHTML = '';
    
    // Player cards
    state.playerCards.forEach(card => {
        elements.playerHand.appendChild(createCardElement(card));
    });
    
    // Dealer cards
    state.dealerCards.forEach((card, index) => {
        elements.dealerHand.appendChild(createCardElement(card, index === 0 && !state.gameOver));
    });
    
    const playerScore = calculateScore(state.playerCards);
    elements.playerScore.textContent = `Score: ${playerScore}`;
    
    if (state.gameOver) {
        const dealerScore = calculateScore(state.dealerCards);
        elements.dealerScore.textContent = `Score: ${dealerScore}`;
    } else {
        elements.dealerScore.textContent = `Score: ?`;
    }
    
    if (playerScore > BLACKJACK_SCORE && !state.gameOver) {
        setTimeout(stand, 800);
    }
}

function hit() {
    const now = Date.now();
    if (state.gameOver || state.isProcessing || now - state.lastClickTime < CLICK_DELAY) return;
    state.lastClickTime = now;
    
    disableButtons();
    elements.touchProtector.style.display = 'block';
    
    setTimeout(() => {
        state.playerCards.push(drawCard());
        updateUI();
        vibrate();
        
        if (calculateScore(state.playerCards) > BLACKJACK_SCORE) {
            elements.hitButton.classList.add('pulse');
        } else {
            elements.hitButton.classList.remove('pulse');
        }
        
        enableButtons();
        elements.touchProtector.style.display = 'none';
    }, 100);
}

function stand() {
    const now = Date.now();
    if (state.gameOver || state.isProcessing || now - state.lastClickTime < CLICK_DELAY) return;
    state.lastClickTime = now;
    
    disableButtons();
    elements.touchProtector.style.display = 'block';
    state.gameOver = true;
    elements.hitButton.classList.remove('pulse');
    
    // First reveal dealer's hidden card
    setTimeout(() => {
        updateUI();
        
        // Then start dealer's turn
        const dealerTakeCards = setInterval(() => {
            if (calculateScore(state.dealerCards) < DEALER_STAND_SCORE) {
                state.dealerCards.push(drawCard());
                updateUI();
                vibrate();
            } else {
                clearInterval(dealerTakeCards);
                updateUI();
                determineWinner();
                enableButtons();
                elements.touchProtector.style.display = 'none';
            }
        }, DEALER_TURN_DELAY);
    }, 500);
}

function determineWinner() {
    const playerScore = calculateScore(state.playerCards);
    const dealerScore = calculateScore(state.dealerCards);
    let result = '';
    let isWin = false;
    
    if (playerScore > BLACKJACK_SCORE) {
        result = 'BUST! YOU LOSE';
        state.lossesCount++;
    } else if (dealerScore > BLACKJACK_SCORE) {
        result = 'DEALER BUSTED! YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else if (playerScore === dealerScore) {
        result = 'PUSH!';
    } else if (playerScore === BLACKJACK_SCORE && state.playerCards.length === 2) {
        result = 'BLACKJACK! YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else if (playerScore > dealerScore) {
        result = 'YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else {
        result = 'YOU LOSE';
        state.lossesCount++;
    }
    
    elements.result.textContent = result;
    elements.winsCount.textContent = state.winsCount;
    elements.lossesCount.textContent = state.lossesCount;
    
    if (isWin) {
        elements.result.style.color = '#4CAF50';
        if (!state.isLegacyDevice) {
            const winEffect = document.createElement('div');
            winEffect.className = 'win-animation';
            document.body.appendChild(winEffect);
            setTimeout(() => winEffect.remove(), 1000);
        }
        vibrate(100);
    } else {
        elements.result.style.color = '#F44336';
        vibrate(200);
    }
    
    saveStats();
}

function disableButtons() {
    elements.hitButton.disabled = true;
    elements.standButton.disabled = true;
    elements.newGameButton.disabled = true;
}

function enableButtons() {
    if (!state.gameOver) {
        elements.hitButton.disabled = false;
        elements.standButton.disabled = false;
    }
    elements.newGameButton.disabled = false;
}

function saveStats() {
    try {
        localStorage.setItem('blackjackStats', JSON.stringify({
            wins: state.winsCount,
            losses: state.lossesCount
        }));
    } catch (e) {
        console.log('Failed to save stats:', e);
    }
}

function loadStats() {
    try {
        const savedStats = localStorage.getItem('blackjackStats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            state.winsCount = stats.wins || 0;
            state.lossesCount = stats.losses || 0;
            elements.winsCount.textContent = state.winsCount;
            elements.lossesCount.textContent = state.lossesCount;
        }
    } catch (e) {
        console.log('Failed to load stats:', e);
    }
}

function vibrate(duration = VIBRATION_DURATION) {
    try {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        } else if (window.plugins && window.plugins.vibration) {
            window.plugins.vibration.vibrate(duration);
        } else {
            elements.hapticFeedback.classList.add('vibrate');
            setTimeout(() => {
                elements.hapticFeedback.classList.remove('vibrate');
            }, 300);
        }
    } catch (e) {
        console.log('Vibration not available');
    }
}

function updateLoadingStatus(message) {
    if (elements.loadingStatus) {
        elements.loadingStatus.textContent = message;
    }
}

function updateProgress(percent) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}%`;
}

function setupEventListeners() {
    const addActionListener = (element, handler) => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() - state.lastClickTime < CLICK_DELAY || state.isProcessing) return;
            state.lastClickTime = Date.now();
            handler();
        }, { passive: false });
    };

    addActionListener(elements.hitButton, hit);
    addActionListener(elements.standButton, stand);
    addActionListener(elements.newGameButton, initGame);

    // Shake detection
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleShake);
    } else {
        updateLoadingStatus('Shake detection not supported');
    }
}

function handleShake(e) {
    if (!state.isShakeEnabled || !state.isInitialized) return;
    
    const acceleration = e.accelerationIncludingGravity || e.acceleration;
    if (!acceleration) return;
    
    const now = Date.now();
    const shakeThreshold = state.isLegacyDevice ? SHAKE_THRESHOLD * 1.5 : SHAKE_THRESHOLD;
    
    if ((Math.abs(acceleration.x) > shakeThreshold || 
        Math.abs(acceleration.y) > shakeThreshold || 
        Math.abs(acceleration.z) > shakeThreshold) &&
        now - state.lastShakeTime > 1000) {
        
        state.lastShakeTime = now;
        state.isShakeEnabled = false;
        vibrate(100);
        initGame();
        
        setTimeout(() => {
            state.isShakeEnabled = true;
        }, 2000);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const startTime = Date.now();
    let progress = 0;
    
    // Initial setup
    checkCompatibility();
    disableButtons();
    updateProgress(0);
    updateLoadingStatus('Initializing game...');
    
    const loadingSteps = [
        {progress: 20, message: 'Loading assets...'},
        {progress: 40, message: 'Setting up game engine...'},
        {progress: 60, message: 'Preparing UI...'},
        {progress: 80, message: 'Almost ready...'},
        {progress: 100, message: 'Done!'}
    ];
    
    let currentStep = 0;
    const loadingInterval = setInterval(() => {
        if (currentStep < loadingSteps.length) {
            const step = loadingSteps[currentStep];
            progress = step.progress;
            updateProgress(progress);
            updateLoadingStatus(step.message);
            currentStep++;
        }
        
        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (progress >= 100 && elapsed >= MIN_LOAD_TIME) {
            clearInterval(loadingInterval);
            
            // Final setup
            updateLoadingStatus('Loading complete');
            elements.loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
                elements.gameContainer.classList.add('ready');
                loadStats();
                setupEventListeners();
                
                // Initial game setup
                state.isInitialized = true;
                initGame();
            }, 500);
        }
    }, MIN_LOAD_TIME / loadingSteps.length);
});

// Prevent default touch behavior
document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) e.preventDefault();
}, { passive: false });

// Keep screen on
document.addEventListener('deviceready', () => {
    try {
        if (window.plugins && window.plugins.insomnia) {
            window.plugins.insomnia.keepAwake();
            updateLoadingStatus('Screen always-on enabled');
        }
    } catch (e) {
        console.log('Failed to keep screen on:', e);
    }
}, false);