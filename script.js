// Init Firebase
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
} catch (e) {
    console.warn("Firebase not configured yet.");
}

const container = document.getElementById('card-container');
const counter = document.getElementById('counter');
const emptyState = document.getElementById('empty-state');

let cards = [];
let currentIndex = 0;

// Load saved index
const savedIndex = localStorage.getItem('loveApp_index');
if (savedIndex) {
    currentIndex = parseInt(savedIndex, 10);
}

async function loadCards() {
    if (db && firebaseConfig.apiKey !== "API_KEY_ICI") {
        try {
            const snapshot = await db.collection('cards').orderBy('id', 'asc').get();
            if (!snapshot.empty) {
                cards = snapshot.docs.map(doc => doc.data());
            } else {
                cards = [];
            }
        } catch (e) {
            console.error("Error loading cards:", e);
            cards = [];
        }
    } else {
        // No config or error
        cards = [];
    }

    if (cards.length === 0) {
        container.style.display = 'none';
        counter.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    } else {
        container.style.display = 'block';
        counter.style.display = 'block';
        emptyState.style.display = 'none';
    }

    // Loop logic: if saved index is out of bounds, reset or wrap
    if (currentIndex >= cards.length) {
        currentIndex = 0;
    }

    renderCard();
}

function renderCard() {
    container.innerHTML = '';
    
    if (cards.length === 0) return;

    // Update counter
    counter.innerText = `${currentIndex + 1} / ${cards.length}`;

    // Create current card
    const cardData = cards[currentIndex];
    const card = createCardElement(cardData);
    
    // Add next card behind for depth effect
    const nextIndex = (currentIndex + 1) % cards.length;
    const nextCardData = cards[nextIndex];
    const nextCard = createCardElement(nextCardData);
    
    // Style for the card behind
    nextCard.style.transform = 'scale(0.92) translateY(15px)';
    nextCard.style.opacity = '0.6';
    nextCard.style.zIndex = '0';
    nextCard.style.filter = 'brightness(0.7)';
    
    card.style.zIndex = '1';
    
    container.appendChild(nextCard);
    container.appendChild(card);
    
    initSwipe(card, nextCard);
}

function createCardElement(data) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
        <div class="card-image-container">
            <img src="${data.image}" class="card-image" draggable="false">
            <div class="card-overlay"></div>
        </div>
        <div class="card-content">
            <div class="card-title">${data.title}</div>
            <div class="card-text">${data.text}</div>
        </div>
    `;
    return el;
}

function initSwipe(card, nextCard) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = window.innerWidth * 0.25; // 25% of screen width to trigger

    const handleStart = (e) => {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        card.style.transition = 'none';
        if(nextCard) nextCard.style.transition = 'none';
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        
        // Prevent scrolling on mobile
        if (e.type === 'touchmove') e.preventDefault();

        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = x - startX;
        
        // Smoother rotation based on X
        const rotate = currentX * 0.04;
        
        // Apply transform to active card
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;

        // Parallax effect for the next card
        if (nextCard) {
            const progress = Math.min(Math.abs(currentX) / (window.innerWidth), 1);
            const scale = 0.92 + (0.08 * progress); // Go from 0.92 to 1
            const y = 15 - (15 * progress); // Go from 15px to 0
            const opacity = 0.6 + (0.4 * progress); // Go from 0.6 to 1
            
            nextCard.style.transform = `scale(${scale}) translateY(${y}px)`;
            nextCard.style.opacity = opacity;
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
        if(nextCard) nextCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';

        if (Math.abs(currentX) > threshold) {
            // Swipe success
            if (navigator.vibrate) {
                navigator.vibrate(15); // Haptic feedback
            }

            const direction = currentX > 0 ? 1 : -1;
            const endX = direction * (window.innerWidth + 200);
            
            card.style.transform = `translateX(${endX}px) rotate(${direction * 15}deg)`;
            
            // Animate next card to full view
            if (nextCard) {
                nextCard.style.transform = 'scale(1) translateY(0)';
                nextCard.style.opacity = '1';
                nextCard.style.filter = 'brightness(1)';
            }

            setTimeout(() => {
                nextCardFunc();
            }, 300);
        } else {
            // Reset
            card.style.transform = 'translateX(0) rotate(0)';
            if (nextCard) {
                nextCard.style.transform = 'scale(0.92) translateY(15px)';
                nextCard.style.opacity = '0.6';
            }
        }
        currentX = 0;
    };

    card.addEventListener('mousedown', handleStart);
    card.addEventListener('touchstart', handleStart);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
}

function nextCardFunc() {
    currentIndex++;
    if (currentIndex >= cards.length) {
        currentIndex = 0; // Loop back to start
    }
    
    // Save progress
    localStorage.setItem('loveApp_index', currentIndex);
    
    renderCard();
}

// Start
loadCards();
