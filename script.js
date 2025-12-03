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

// Fallback data if Firebase is empty or not configured
const demoCards = [
    { id: 1, title: "Bienvenue", text: "Ceci est un exemple. Configure Firebase pour ajouter tes propres photos !", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600" },
    { id: 2, title: "Swipe !", text: "Glisse pour voir la suite.", image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600" }
];

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
                cards = demoCards;
            }
        } catch (e) {
            console.error("Error loading cards:", e);
            cards = demoCards;
        }
    } else {
        cards = demoCards;
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
    
    nextCard.style.transform = 'scale(0.9) translateY(20px)';
    nextCard.style.opacity = '0.5';
    nextCard.style.zIndex = '0';
    
    card.style.zIndex = '1';
    
    container.appendChild(nextCard);
    container.appendChild(card);
    
    initSwipe(card);
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

function initSwipe(card) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 100;

    const handleStart = (e) => {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        card.style.transition = 'none';
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        
        // Prevent scrolling on mobile
        if (e.type === 'touchmove') e.preventDefault();

        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = x - startX;
        
        const rotate = currentX * 0.05;
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';

        if (Math.abs(currentX) > threshold) {
            // Swipe success
            const direction = currentX > 0 ? 1 : -1;
            const endX = direction * window.innerWidth;
            
            card.style.transform = `translateX(${endX}px) rotate(${direction * 20}deg)`;
            
            setTimeout(() => {
                nextCard();
            }, 300);
        } else {
            // Reset
            card.style.transform = 'translateX(0) rotate(0)';
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

function nextCard() {
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
