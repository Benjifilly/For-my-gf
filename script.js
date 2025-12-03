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

    // Create current card (Top)
    const cardData = cards[currentIndex];
    const card = createCardElement(cardData);
    card.style.zIndex = '3';
    
    // Check for Special Card Explosion (Only if NOT scratch, otherwise scratch handles it)
    if (cardData.isSpecial && cardData.explosionEmojis && !cardData.isScratch) {
        setTimeout(() => {
            triggerEmojiExplosion(cardData.explosionEmojis);
        }, 500); // Small delay for effect
    }

    // Create next card (Middle)
    const nextIndex = (currentIndex + 1) % cards.length;
    const nextCardData = cards[nextIndex];
    const nextCard = createCardElement(nextCardData);
    
    // Style for the middle card
    nextCard.style.transform = 'scale(0.95) translateY(10px)';
    nextCard.style.opacity = '0.8';
    nextCard.style.zIndex = '2';
    nextCard.style.filter = 'brightness(0.8)';

    // Create third card (Bottom)
    const thirdIndex = (currentIndex + 2) % cards.length;
    const thirdCardData = cards[thirdIndex];
    const thirdCard = createCardElement(thirdCardData);

    // Style for the bottom card
    thirdCard.style.transform = 'scale(0.90) translateY(20px)';
    thirdCard.style.opacity = '0.5';
    thirdCard.style.zIndex = '1';
    thirdCard.style.filter = 'brightness(0.6)';
    
    // Create fourth card (Hidden Back)
    const fourthIndex = (currentIndex + 3) % cards.length;
    const fourthCardData = cards[fourthIndex];
    const fourthCard = createCardElement(fourthCardData);

    // Style for the hidden card
    fourthCard.style.transform = 'scale(0.85) translateY(30px)';
    fourthCard.style.opacity = '0';
    fourthCard.style.zIndex = '0';
    fourthCard.style.filter = 'brightness(0.4)';

    // Append in reverse order (bottom first)
    container.appendChild(fourthCard);
    container.appendChild(thirdCard);
    container.appendChild(nextCard);
    container.appendChild(card);
    
    if (window.cleanupSwipe) window.cleanupSwipe();
    window.cleanupSwipe = initSwipe(card, nextCard, thirdCard, fourthCard);
}

function createCardElement(data) {
    const el = document.createElement('div');
    el.className = 'card';

    // If Flip enabled, use 3D structure
    if (data.isFlip) {
        el.classList.add('flip-mode');
        el.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-image-container">
                        <img src="${data.image}" class="card-image" draggable="false">
                        <div class="card-overlay"></div>
                    </div>
                    <div class="card-content">
                        <div class="card-title">${data.title}</div>
                        <div class="card-text">${data.text}</div>
                    </div>
                </div>
                <div class="card-back" style="background-image: url('${data.image}'); background-size: cover; background-position: center;">
                    <div class="card-back-overlay"></div>
                    <div class="card-back-content">
                        <p>${data.flipText || data.text}</p>
                        <div style="margin-top: 20px; font-size: 40px;">😽</div>
                    </div>
                </div>
            </div>
        `;

        // Double Tap Logic
        let lastTap = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let hasMoved = false;

        el.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasMoved = false;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            // If moved more than 10px, it's a swipe, not a tap
            if (Math.abs(x - touchStartX) > 10 || Math.abs(y - touchStartY) > 10) {
                hasMoved = true;
            }
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            if (hasMoved) return; // Ignore if it was a swipe

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // 400ms allows for a more relaxed double tap
            if (tapLength < 400 && tapLength > 0) {
                e.preventDefault();
                el.classList.toggle('is-flipped');
                if (navigator.vibrate) navigator.vibrate(10);
                lastTap = 0; // Reset
            } else {
                lastTap = currentTime;
            }
        });
        
        // Desktop double click
        el.addEventListener('dblclick', () => {
            el.classList.toggle('is-flipped');
        });

    } else {
        // Standard Card
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
    }

    if (data.isScratch) {
        const canvas = document.createElement('canvas');
        canvas.className = 'scratch-canvas';
        // Pre-fill with background color to prevent flash of content
        canvas.style.backgroundColor = '#C0C0C0';
        
        // Insert canvas into the image container so it covers the image
        // Note: For flip cards, image container is deeper
        const imgContainer = el.querySelector('.card-image-container');
        if (imgContainer) {
            imgContainer.appendChild(canvas);
            // Initialize scratch logic after a short delay to ensure layout is done
            setTimeout(() => {
                initScratch(canvas, data);
            }, 100);
        }
    }

    return el;
}

function initScratch(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.offsetWidth;
    const height = canvas.parentElement.offsetHeight;
    
    canvas.width = width;
    canvas.height = height;

    // Fill with scratchable surface (Silver/Grey)
    ctx.fillStyle = '#C0C0C0'; // Silver
    ctx.fillRect(0, 0, width, height);
    
    // Add some texture or text "Grattez-moi"
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = '#808080';
    ctx.textAlign = 'center';
    ctx.fillText('Gratte mon coeur plz 😽', width / 2, height / 2);

    // Remove CSS background now that canvas is drawn
    canvas.style.backgroundColor = 'transparent';

    let isDrawing = false;
    let scratchedPixels = 0;
    const totalPixels = width * height;

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function scratch(e) {
        if (!isDrawing) return;
        // e.preventDefault(); // Prevent scrolling while scratching - handled in listener
        
        const pos = getMousePos(e);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2); // Brush size
        ctx.fill();
        
        checkProgress();
    }

    // Throttle progress check for performance
    let lastCheck = 0;
    function checkProgress() {
        const now = Date.now();
        if (now - lastCheck < 200) return; // Check every 200ms
        lastCheck = now;

        // Calculate scratched percentage
        // Getting image data is expensive, so we do it on a smaller sample or less frequently
        // Optimization: Scale down to check
        const w = Math.floor(width / 10);
        const h = Math.floor(height / 10);
        
        // Create a temp canvas to resize and check pixels (faster)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, w, h);
        
        const imageData = tempCtx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        let transparentPixels = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] < 128) { // Alpha channel < 128 means transparent
                transparentPixels++;
            }
        }
        
        const percent = (transparentPixels / (w * h)) * 100;
        
        if (percent > 70) {
            finishScratch();
        }
    }

    function finishScratch() {
        // Fade out canvas
        canvas.style.opacity = '0';
        canvas.style.pointerEvents = 'none'; // Disable interaction
        
        // Trigger explosion if special
        if (data.isSpecial && data.explosionEmojis) {
            triggerEmojiExplosion(data.explosionEmojis);
        }
        
        // Haptic success
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        
        // Remove canvas after transition
        setTimeout(() => {
            canvas.remove();
        }, 500);
    }

    const startScratch = (e) => {
        e.stopPropagation(); // Prevent swipe when starting to scratch
        isDrawing = true;
        scratch(e);
        
        // Add global listeners to handle dragging outside
        document.addEventListener('mousemove', onGlobalMove);
        document.addEventListener('mouseup', onGlobalUp);
        document.addEventListener('touchmove', onGlobalMove, { passive: false });
        document.addEventListener('touchend', onGlobalUp);
    };

    const onGlobalMove = (e) => {
        if (!isDrawing) return;
        // Prevent scrolling while scratching
        if(e.cancelable) e.preventDefault(); 
        e.stopPropagation(); 
        scratch(e);
    };

    const onGlobalUp = () => {
        isDrawing = false;
        document.removeEventListener('mousemove', onGlobalMove);
        document.removeEventListener('mouseup', onGlobalUp);
        document.removeEventListener('touchmove', onGlobalMove);
        document.removeEventListener('touchend', onGlobalUp);
    };

    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('touchstart', startScratch, { passive: false });
}

function initSwipe(card, nextCard, thirdCard, fourthCard) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = window.innerWidth * 0.25; // 25% of screen width to trigger

    // Shake detection variables
    let shakeCount = 0;
    let lastShakeDir = 0;
    let lastShakeX = 0;
    const shakeDistanceThreshold = 20; // Minimum pixels to count as a shake stroke

    const handleStart = (e) => {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        
        // Reset shake logic
        shakeCount = 0;
        lastShakeDir = 0;
        lastShakeX = startX;
        
        // Disable transition during drag for instant feedback
        card.style.transition = 'none';
        if(nextCard) nextCard.style.transition = 'none';
        if(thirdCard) thirdCard.style.transition = 'none';
        if(fourthCard) fourthCard.style.transition = 'none';
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        
        // Prevent scrolling on mobile
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const x = clientX;
        currentX = x - startX;
        
        // --- Shake Detection Logic ---
        const distSinceLastShake = clientX - lastShakeX;
        const currentDir = Math.sign(distSinceLastShake);

        // If direction changed and moved enough pixels
        if (currentDir !== 0 && currentDir !== lastShakeDir && Math.abs(distSinceLastShake) > shakeDistanceThreshold) {
            shakeCount++;
            lastShakeDir = currentDir;
            lastShakeX = clientX;
            
            // Haptic feedback on every shake (feels satisfying)
            if (navigator.vibrate && shakeCount > 2) {
                navigator.vibrate(5);
            }
        }
        // -----------------------------

        // Smoother rotation based on X
        const rotate = currentX * 0.05;
        
        // Apply transform to active card
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;

        // Parallax effect for the background cards
        const progress = Math.min(Math.abs(currentX) / (window.innerWidth), 1);
        
        if (nextCard) {
            // Next card moves to front (Scale 0.95 -> 1, Y 10 -> 0, Opacity 0.8 -> 1)
            const scale = 0.95 + (0.05 * progress);
            const y = 10 - (10 * progress);
            const opacity = 0.8 + (0.2 * progress);
            const brightness = 0.8 + (0.2 * progress);
            
            nextCard.style.transform = `scale(${scale}) translateY(${y}px)`;
            nextCard.style.opacity = opacity;
            nextCard.style.filter = `brightness(${brightness})`;
        }

        if (thirdCard) {
            // Third card moves to middle (Scale 0.90 -> 0.95, Y 20 -> 10, Opacity 0.5 -> 0.8)
            const scale = 0.90 + (0.05 * progress);
            const y = 20 - (10 * progress);
            const opacity = 0.5 + (0.3 * progress);
            const brightness = 0.6 + (0.2 * progress);

            thirdCard.style.transform = `scale(${scale}) translateY(${y}px)`;
            thirdCard.style.opacity = opacity;
            thirdCard.style.filter = `brightness(${brightness})`;
        }

        if (fourthCard) {
            // Fourth card moves to third position (Scale 0.85 -> 0.90, Y 30 -> 20, Opacity 0 -> 0.5)
            const scale = 0.85 + (0.05 * progress);
            const y = 30 - (10 * progress);
            const opacity = 0 + (0.5 * progress);
            const brightness = 0.4 + (0.2 * progress);

            fourthCard.style.transform = `scale(${scale}) translateY(${y}px)`;
            fourthCard.style.opacity = opacity;
            fourthCard.style.filter = `brightness(${brightness})`;
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        // Re-enable transitions
        const transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s, filter 0.5s';
        card.style.transition = transition;
        if(nextCard) nextCard.style.transition = transition;
        if(thirdCard) thirdCard.style.transition = transition;
        if(fourthCard) fourthCard.style.transition = transition;

        // --- CARTOON SHAKE RELEASE ---
        if (shakeCount >= 5) {
            // Super Spin & Fly Away Upwards
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // Success vibration pattern
            
            card.style.transition = 'transform 1s cubic-bezier(0.5, 0, 0.5, 1)'; // Linear-ish acceleration
            // Fly up (-150vh), Spin crazy (1080deg), Shrink (scale 0.1)
            card.style.transform = `translateY(-150vh) rotate(${currentX * 5 + 1080}deg) scale(0.1)`;
            
            // Animate background cards
            animateBackgroundCards();
            
            setTimeout(() => {
                nextCardFunc();
            }, 600); // Wait a bit longer for the animation
            
            currentX = 0;
            return;
        }
        // -----------------------------

        if (Math.abs(currentX) > threshold) {
            // Swipe success
            if (navigator.vibrate) {
                navigator.vibrate(15); // Haptic feedback
            }

            const direction = currentX > 0 ? 1 : -1;
            const endX = direction * (window.innerWidth + 200);
            
            card.style.transform = `translateX(${endX}px) rotate(${direction * 20}deg)`;
            
            animateBackgroundCards();

            setTimeout(() => {
                nextCardFunc();
            }, 300);
        } else {
            // Reset (Cancel swipe)
            card.style.transform = 'translateX(0) rotate(0)';
            
            if (nextCard) {
                nextCard.style.transform = 'scale(0.95) translateY(10px)';
                nextCard.style.opacity = '0.8';
                nextCard.style.filter = 'brightness(0.8)';
            }
            
            if (thirdCard) {
                thirdCard.style.transform = 'scale(0.90) translateY(20px)';
                thirdCard.style.opacity = '0.5';
                thirdCard.style.filter = 'brightness(0.6)';
            }

            if (fourthCard) {
                fourthCard.style.transform = 'scale(0.85) translateY(30px)';
                fourthCard.style.opacity = '0';
                fourthCard.style.filter = 'brightness(0.4)';
            }
        }
        currentX = 0;
    };

    // Helper to animate background cards to front
    const animateBackgroundCards = () => {
        if (nextCard) {
            nextCard.style.transform = 'scale(1) translateY(0)';
            nextCard.style.opacity = '1';
            nextCard.style.filter = 'brightness(1)';
        }
        
        if (thirdCard) {
            thirdCard.style.transform = 'scale(0.95) translateY(10px)';
            thirdCard.style.opacity = '0.8';
            thirdCard.style.filter = 'brightness(0.8)';
        }

        if (fourthCard) {
            fourthCard.style.transform = 'scale(0.90) translateY(20px)';
            fourthCard.style.opacity = '0.5';
            fourthCard.style.filter = 'brightness(0.6)';
        }
    };

    // Listen on document to allow swiping from anywhere
    document.addEventListener('mousedown', handleStart);
    document.addEventListener('touchstart', handleStart);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    // Return cleanup function
    return () => {
        document.removeEventListener('mousedown', handleStart);
        document.removeEventListener('touchstart', handleStart);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
    };
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

function triggerEmojiExplosion(emojis) {
    if (!emojis) return;
    
    // Parse HTML string to handle both text emojis and <img> tags (Memojis)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = emojis;
    
    let particles = [];
    
    // Extract all child nodes
    tempDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Split text into characters (emojis)
            const text = node.textContent;
            // Use Array.from to correctly split unicode emojis
            const chars = Array.from(text).filter(c => c.trim() !== '');
            particles.push(...chars);
        } else if (node.nodeName === 'IMG') {
            // It's an image (Memoji)
            particles.push(node.outerHTML);
        } else {
            // Other elements (span, etc), take text content or outerHTML?
            // Let's take outerHTML to preserve styles if any, or just text
            if (node.textContent.trim() !== '') {
                particles.push(node.outerHTML);
            }
        }
    });

    if (particles.length === 0) return;

    const container = document.body;
    const particleCount = 50; // Number of particles

    for (let i = 0; i < particleCount; i++) {
        const el = document.createElement('div');
        el.className = 'emoji-particle';
        
        // Pick random particle content
        const content = particles[Math.floor(Math.random() * particles.length)];
        el.innerHTML = content; // Use innerHTML to support <img> tags
        
        // Random starting position near center/bottom
        const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
        const startY = window.innerHeight / 2 + (Math.random() - 0.5) * 100;
        
        el.style.left = `${startX}px`;
        el.style.top = `${startY}px`;
        
        // Random trajectory
        const angle = Math.random() * Math.PI * 2;
        const velocity = 100 + Math.random() * 200; // pixels per second
        const tx = Math.cos(angle) * velocity * 2; // Move far
        const ty = Math.sin(angle) * velocity * 2;
        
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        
        // Random rotation
        const rot = (Math.random() - 0.5) * 720;
        el.style.setProperty('--rot', `${rot}deg`);
        
        // Random size
        const scale = 0.5 + Math.random() * 1.5;
        el.style.fontSize = `${scale}rem`;

        container.appendChild(el);

        // Cleanup
        setTimeout(() => {
            el.remove();
        }, 2000);
    }
}

// Start
loadCards();
