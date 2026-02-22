document.addEventListener('DOMContentLoaded', () => {
    // Splash Screen Logic
    const splash = document.getElementById('splash-screen');
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const lastSplashTime = localStorage.getItem('lastSplashTime');
    const currentTime = new Date().getTime();

    let shouldShowSplash = true;
    if (lastSplashTime && (currentTime - parseInt(lastSplashTime, 10)) < TWO_HOURS_MS) {
        shouldShowSplash = false;
    }

    if (!shouldShowSplash) {
        if (splash) splash.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        if (splash) {
            document.body.style.overflow = 'hidden';

            const paths = document.querySelectorAll('.orbit-path');
            const orbitalSystem = document.querySelector('.orbital-system');
            const loadingText = document.querySelector('.loading-text');

            // --- 1. Dynamic Corner Data ---
            const locEl = document.querySelector('.micro-data.bottom-left');
            const memEl = document.querySelector('.micro-data.top-right');
            const secEl = document.querySelector('.micro-data.bottom-right');

            // Set Initial Mock Location
            if (locEl) locEl.innerText = "LOC: TRIANGULATING...";

            // Randomizer Function
            const randomHex = () => Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');

            const dataInterval = setInterval(() => {
                if (memEl) memEl.innerText = `MEM: ${Math.floor(Math.random() * 99)}TB`;
                if (secEl) secEl.innerText = `SEC: ${randomHex()}`;
            }, 100);

            // Settle Data
            setTimeout(() => {
                clearInterval(dataInterval);
                if (memEl) memEl.innerText = "MEM: 64TB [OK]";
                if (secEl) secEl.innerText = "SEC: ENCRYPTED";
                if (locEl) locEl.innerText = "LOC: 127.0.0.1"; // Home
            }, 2500);


            // --- 2. Typewriter Effect ---
            const textSteps = ["INITIALIZING", "LOADING ASSETS", "SYSTEM READY"];
            let stepIndex = 0;

            // Reset text
            loadingText.innerHTML = '<span id="type-text"></span><span class="cursor"></span>';
            const typeSpan = document.getElementById('type-text');

            const typeWriter = (text, callback) => {
                typeSpan.innerText = "";
                let i = 0;
                const typing = setInterval(() => {
                    typeSpan.innerText += text.charAt(i);
                    i++;
                    if (i >= text.length) {
                        clearInterval(typing);
                        if (callback) setTimeout(callback, 500); // 0.5s pause after typing
                    }
                }, 50); // Typing speed
            };

            // Sequence
            typeWriter(textSteps[0], () => {
                // Short pause then next
                setTimeout(() => {
                    typeWriter(textSteps[1], () => {
                        setTimeout(() => {
                            // Final text: SYSTEM READY or ACCESS GRANTED
                            typeSpan.innerText = "";
                            typeWriter("ACCESS GRANTED", () => {
                                // Trigger Finish
                            });
                        }, 800);
                    });
                }, 500);
            });

            // --- 3. Velocity Build-up ---
            let speed = 3.0;
            const accelerate = setInterval(() => {
                speed = Math.max(0.8, speed - 0.02);
                paths.forEach(path => {
                    path.style.animationDuration = `${speed}s`;
                });
            }, 100);

            // --- 4. Transition Logic (Zoom Through + Wipe) ---
            // Total time approx 3.5s to match typewriter flow
            setTimeout(() => {
                clearInterval(accelerate);

                // Visual Finish
                orbitalSystem.classList.add('zoom-through'); // Scale up and fade
                loadingText.style.opacity = '0';

                setTimeout(() => {
                    // The Wipe
                    splash.classList.add('fade-out'); // Triggers clip-path wipe in CSS

                    document.body.style.overflow = 'auto';
                    localStorage.setItem('lastSplashTime', currentTime.toString());

                    // Remove from DOM
                    setTimeout(() => {
                        splash.style.display = 'none';
                    }, 800);
                }, 600); // Wait for zoom to start

            }, 3800); // Sync with Typewriter roughly
        }
    }

    // Theme Toggle Logic
    const themeToggleEnd = document.querySelector('.theme-toggle');
    const body = document.body;
    const icon = themeToggleEnd.querySelector('svg');

    // Check Local Storage
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    themeToggleEnd.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });

    // Mobile Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('active');

        // Animate hamburger bars to X
        const bars = document.querySelectorAll('.bar');
        if (mobileNav.classList.contains('active')) {
            bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
            bars[1].style.opacity = '0';
            bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
            bars[0].style.transform = 'none';
            bars[1].style.opacity = '1';
            bars[2].style.transform = 'none';
        }
    });

    // Close mobile menu on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            const bars = document.querySelectorAll('.bar');
            bars[0].style.transform = 'none';
            bars[1].style.opacity = '1';
            bars[2].style.transform = 'none';
        });
    });

    // Scroll Animations (Intersection Observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, observerOptions);

    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach((el) => observer.observe(el));
});


function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}