// --- PORTFOLIO ANALYTICS TRACKER ---
const ANALYTICS_API_URL = "https://portfolio-analytics-worker.bharath98.workers.dev"; // Live Cloudflare Worker URL
let analyticsSession = {
  visitor_id: (() => {
    let vid = localStorage.getItem('analytics_visitor_id');
    if (!vid) {
      vid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('analytics_visitor_id', vid);
    }
    return vid;
  })(),
  session_id: (() => {
    let sid = localStorage.getItem('analytics_session_id');
    let expires = localStorage.getItem('analytics_session_expires');
    const now = Date.now();

    // Create new session if none exists or if it has been > 30 mins since last activity
    if (!sid || !expires || now > parseInt(expires)) {
      sid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('analytics_session_id', sid);
      // Mark that a new session visit needs to be sent
      localStorage.setItem('analytics_needs_visit', 'true');
    }

    // Rolling 30 minute expiry
    localStorage.setItem('analytics_session_expires', (now + 1800000).toString());
    return sid;
  })(),
  startTime: performance.now(),
  pages_visited: 0,
  action_metadata: [],
  utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
  referrer: document.referrer || '',
  theme_preference: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
  network_type: navigator.connection ? navigator.connection.effectiveType : 'Unknown',
  cpu_cores: navigator.hardwareConcurrency || 0,
  ram_gb: navigator.deviceMemory || 0,
  screen_size: `${window.screen.width}x${window.screen.height}`,
  battery_status: 'Unknown',
  highlighted_text: [],
  active_time_ms: 0
};

let lastInteraction = performance.now();
['mousemove', 'scroll', 'keydown', 'click', 'touchstart'].forEach(evt =>
  window.addEventListener(evt, () => {
    const now = performance.now();
    if (now - lastInteraction < 30000) {
      analyticsSession.active_time_ms += (now - lastInteraction);
    }
    lastInteraction = now;
  }, { passive: true })
);

function trackEvent(eventType, pagePath, extraMeta = null) {
  if (extraMeta) analyticsSession.action_metadata.push(extraMeta);

  fetch(ANALYTICS_API_URL, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: analyticsSession.visitor_id,
      session_id: analyticsSession.session_id,
      event_type: eventType,
      page_path: pagePath,
      referrer: analyticsSession.referrer,
      utm_source: analyticsSession.utm_source,
      pages_visited: analyticsSession.pages_visited,
      action_metadata: analyticsSession.action_metadata,
      time_spent_ms: Math.floor(performance.now() - analyticsSession.startTime),
      active_time_ms: Math.floor(analyticsSession.active_time_ms),
      theme_preference: analyticsSession.theme_preference,
      network_type: analyticsSession.network_type,
      cpu_cores: analyticsSession.cpu_cores,
      ram_gb: analyticsSession.ram_gb,
      screen_size: analyticsSession.screen_size,
      battery_status: analyticsSession.battery_status,
      highlighted_text: analyticsSession.highlighted_text
    })
  }).catch(e => console.warn('Analytics error:', e));
}

// Fetch Dynamic Resume
function initDynamicResume() {
  fetch(`${ANALYTICS_API_URL}/api/active-resume`)
    .then(res => res.json())
    .then(data => {
      if (data && data.url) {
        const viewBtn = document.getElementById('view-cv-btn');
        const downloadBtn = document.getElementById('download-cv-btn');
        if (viewBtn) {
          viewBtn.href = data.url;
          viewBtn.addEventListener('click', () => {
            if (window.trackEvent) trackEvent('view_cv', window.location.pathname);
            if (window.logAction) logAction('Clicked View CV');
            gtag('event', 'view', { 'event_category': 'Resume', 'event_label': data.name + ' CV View' });
          });
        }
        if (downloadBtn) {
          const safeName = data.name.replace(/[^a-zA-Z0-9_\s-]/g, '');
          // Clear any old inline onclick to prevent double firing if we switch to event listeners
          downloadBtn.removeAttribute('onclick');
          
          // Use cloneNode to wipe old listeners cleanly before applying new ones (in case of re-fetch)
          const newDownloadBtn = downloadBtn.cloneNode(true);
          downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
          
          newDownloadBtn.addEventListener('click', () => {
            if (window.trackEvent) trackEvent('download', window.location.pathname);
            if (window.logAction) logAction('Downloaded Resume');
            if (window.gtag) gtag('event', 'download', { 'event_category': 'Resume', 'event_label': safeName + ' CV Download' });
            
            // Trigger the actual file fetch/download
            if (window.forceDownload) forceDownload(data.url, `${safeName}.pdf`);
          });
        }
      }
    })
    .catch(e => console.error("Error fetching dynamic resume:", e));
}

// Global Unload (Session End) tracking
let sessionEndTimeout;
let sessionEnded = false;
let isUnloading = false;

window.addEventListener('beforeunload', () => {
  isUnloading = true;
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Wait 10 minutes (600,000 ms) before ending session for tab switchers/space swipers
    sessionEndTimeout = setTimeout(() => {
      if (!sessionEnded) {
        trackEvent('session_end', window.location.hash || '/');
        sessionEnded = true;
      }
    }, 600000);
  } else if (document.visibilityState === 'visible') {
    clearTimeout(sessionEndTimeout);

    // If they came back AFTER the session already ended, resume or start new
    if (sessionEnded && !isUnloading) {
      const now = Date.now();
      let expires = parseInt(localStorage.getItem('analytics_session_expires') || '0');

      if (now > expires) {
        // True new session
        analyticsSession.session_id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('analytics_session_id', analyticsSession.session_id);
        analyticsSession.startTime = performance.now();
        analyticsSession.pages_visited = 1;
        analyticsSession.action_metadata = [];
        trackEvent('visit', window.location.hash || '/');
      }

      localStorage.setItem('analytics_session_expires', (now + 1800000).toString());
      sessionEnded = false;
    }
  }
});

// If they actually close the tab, fire immediately
window.addEventListener('pagehide', () => {
  if (!sessionEnded) {
    trackEvent('session_end', window.location.hash || '/');
    sessionEnded = true;
  }
});

// Track Initial Visit
async function trackInitialVisit() {
  // If this browser already sent a visit for this 30-min session window, suppress it
  if (localStorage.getItem('analytics_needs_visit') !== 'true') {
    return;
  }
  localStorage.setItem('analytics_needs_visit', 'false');

  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      analyticsSession.battery_status = `${Math.floor(battery.level * 100)}% ${battery.charging ? '(Charging)' : ''}`;
    } catch (e) { }
  }
  analyticsSession.pages_visited++;
  trackEvent('visit', window.location.hash || '/');
}

window.addEventListener('load', () => {
  // Prevent tracking Chrome background prerendering until it's actually visible
  if (document.prerendering || document.visibilityState === 'prerender') {
    document.addEventListener('visibilitychange', function onVis() {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', onVis);
        trackInitialVisit();
      }
    });
  } else {
    trackInitialVisit();
  }
});

// Copy to Clipboard tracking
document.addEventListener('copy', () => {
  const selection = document.getSelection().toString();
  if (selection.includes('@') || /\d/.test(selection)) {
    trackEvent('contact_intent', window.location.hash || '/', 'Copied Text to Clipboard');
  }
});
// ------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  initDynamicResume();
  initTheme();
  initCanvas();
  initSplash();
  initNavigation();
  initProjectDetails();
  initScrollIndicators();
  initAnalyticsListeners();
});

function logAction(actionStr) {
  analyticsSession.action_metadata.push(actionStr);

  // Cap the array at 40 items to prevent Discord payload rejection (1024 char limit)
  // Keeps the first 3 (how they started) and the last 36 (how they ended)
  if (analyticsSession.action_metadata.length > 40) {
    analyticsSession.action_metadata = [
      ...analyticsSession.action_metadata.slice(0, 3),
      "⏳ ... (actions omitted)",
      ...analyticsSession.action_metadata.slice(-36)
    ];
  }
}

function initAnalyticsListeners() {
  // Track Contact Dial clicks
  document.querySelectorAll('.contact-icon-box, .dial-center').forEach(icon => {
    icon.addEventListener('click', () => {
      const platform = icon.getAttribute('title') || icon.getAttribute('aria-label') || 'Unknown Contact';
      trackEvent('contact_intent', window.location.hash || '/contact', `Clicked Contact Icon: ${platform}`);
    });
  });

  // Track Resume Download / View
  document.querySelectorAll('a[download], a[href*="Resume.pdf"]').forEach(btn => {
    btn.addEventListener('click', () => {
      trackEvent('download', window.location.hash || '/', 'Downloaded Resume PDF');
      logAction(`Downloaded Resume`);
    });
  });

  // Track GitHub Clicks
  document.querySelectorAll('a[href*="github.com"]').forEach(btn => {
    btn.addEventListener('click', () => {
      trackEvent('github_click', window.location.hash || '/');
      logAction(`Clicked GitHub Profile`);
    });
  });

  // Track Project Card Clicks
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('h3')?.innerText || 'Unknown Project';
      logAction(`Viewed Project: ${title}`);
    });
  });

  // Track Rage Clicks
  let clickTimes = [];
  document.body.addEventListener('click', (e) => {
    const now = performance.now();
    clickTimes.push(now);
    clickTimes = clickTimes.filter(t => now - t < 1000);
    if (clickTimes.length >= 4) {
      const targetPath = e.target.tagName + (e.target.className ? '.' + e.target.className.split(' ').join('.') : '');
      trackEvent('contact_intent', window.location.hash || '/', `💢 Rage Click on ${targetPath}`);
      clickTimes = [];
    }
  });

  // Track Print Alert
  window.addEventListener('beforeprint', () => {
    trackEvent('contact_intent', window.location.hash || '/', `🖨️ Action: Printed/Saved Resume to PDF`);
  });

  // Track Theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const newTheme = e.matches ? 'Dark' : 'Light';
    analyticsSession.theme_preference = newTheme;
    logAction(`🌙 Switched OS Theme to ${newTheme}`);
  });

  // Track Hover Hesitation
  document.querySelectorAll('.contact-icon-box, .dial-center, a[download]').forEach(btn => {
    let hoverStart;
    btn.addEventListener('mouseenter', () => hoverStart = performance.now());
    btn.addEventListener('mouseleave', () => {
      if (hoverStart && (performance.now() - hoverStart) > 2000) {
        logAction(`🤔 Hovered Contact/Download for ${Math.floor((performance.now() - hoverStart) / 1000)}s (Hesitation)`);
      }
      hoverStart = null;
    });
    btn.addEventListener('click', () => hoverStart = null);
  });

  // Track Text Highlights
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 5 && selection.length < 100) {
      if (!analyticsSession.highlighted_text.includes(selection)) {
        analyticsSession.highlighted_text.push(selection);
        // Cap the array to prevent massive payloads
        if (analyticsSession.highlighted_text.length > 10) {
          analyticsSession.highlighted_text.shift();
        }
      }
    }
  });
}

function attachScrollIndicators(scrollerId, leftId, rightId, thumbId) {
  const scroller = document.getElementById(scrollerId);
  const leftInd = document.getElementById(leftId);
  const rightInd = document.getElementById(rightId);
  const thumb = document.getElementById(thumbId);

  if (scroller) {
    const updateScrollState = () => {
      // 1. Edge Indicators
      if (leftInd && rightInd) {
        if (scroller.scrollLeft > 20) {
          leftInd.classList.remove('opacity-0');
        } else {
          leftInd.classList.add('opacity-0');
        }

        if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 20) {
          rightInd.classList.add('opacity-0');
        } else {
          rightInd.classList.remove('opacity-0');
        }
      }

      // 2. Custom Scrollbar Thumb
      if (thumb) {
        const visibleRatio = scroller.clientWidth / scroller.scrollWidth;
        // Don't let it get smaller than 15% for visibility, max 100%
        const thumbWidthPercent = Math.min(Math.max(visibleRatio * 100, 15), 100);
        thumb.style.width = `${thumbWidthPercent}%`;

        const scrollableWidth = scroller.scrollWidth - scroller.clientWidth;
        if (scrollableWidth > 0) {
          const scrollPercent = scroller.scrollLeft / scrollableWidth;
          const maxThumbLeft = 100 - thumbWidthPercent;
          thumb.style.left = `${scrollPercent * maxThumbLeft}%`;
        } else {
          thumb.style.left = "0%";
          thumb.style.width = "100%";
        }
      }
    };

    scroller.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);

    // Initial call slightly delayed to ensure DOM layout has calculated widths
    setTimeout(updateScrollState, 150);
  }
}

function initScrollIndicators() {
  attachScrollIndicators('projects-scroll', 'scroll-left-indicator', 'scroll-right-indicator', 'projects-scroll-thumb');
  attachScrollIndicators('skills-scroll', 'skills-scroll-left-indicator', 'skills-scroll-right-indicator', 'skills-scroll-thumb');
}

// Theme Logic
let isDarkMode = false;
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const effectSelect = document.getElementById('effect-select');

  function updateThemeEffect() {
    if (window.canvasEffectManager) {
      // 0 = Constellation, 1 = Warp Speed
      window.canvasEffectManager.currentEffectIndex = isDarkMode ? 0 : 1;

      const canvas = document.getElementById("bg-canvas");
      if (canvas && typeof canvasEffects !== 'undefined' && canvasEffects[window.canvasEffectManager.currentEffectIndex]) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasEffects[window.canvasEffectManager.currentEffectIndex].init(canvas.width, canvas.height);
      }
    }
  }

  // Check localStorage first for manual override
  const savedTheme = localStorage.getItem('portfolio-theme');

  if (savedTheme) {
    isDarkMode = savedTheme === 'dark';
  } else {
    // If no manual preference, use time-based logic!
    // Get local hour (0-23). Dark mode from 6 PM (18) to 6 AM (6).
    const currentHour = new Date().getHours();
    isDarkMode = (currentHour >= 18 || currentHour < 6);

    // Optional fallback: you could still check matchMedia here if you wanted, 
    // but time-based takes precedence based on your request.
  }

  // Apply initial theme
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Apply initial theme effect synchronously so the splash screen reflects it immediately
  updateThemeEffect();

  toggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('portfolio-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('portfolio-theme', 'light');
    }
    updateThemeEffect();
  });
}

// Canvas Background
function initCanvas() {
  if (window.canvasEffectManager) {
    window.canvasEffectManager.initCanvas();
  }
}

// Splash Screen Logic
function initSplash() {
  const now = Date.now();
  const lastSplash = localStorage.getItem('analytics_last_splash');

  // Populate dynamic system data
  try {
    const ua = navigator.userAgent;
    let os = 'UNKNOWN SYS';
    if (ua.indexOf('Mac') !== -1) os = 'MACOS';
    if (ua.indexOf('Win') !== -1) os = 'WINDOWS';
    if (ua.indexOf('Linux') !== -1) os = 'LINUX';
    if (ua.indexOf('Android') !== -1) os = 'ANDROID';
    if (ua.indexOf('like Mac') !== -1) os = 'IOS';
    document.getElementById('splash-sys-os').innerText = 'SYS: ' + os;

    let browser = 'WEBKIT';
    if (ua.indexOf('Chrome') !== -1) browser = 'CHROME';
    else if (ua.indexOf('Safari') !== -1) browser = 'SAFARI';
    else if (ua.indexOf('Firefox') !== -1) browser = 'FIREFOX';
    document.getElementById('splash-sys-browser').innerText = 'ENG: ' + browser;

    document.getElementById('splash-sys-mem').innerText = 'MEM: ' + (navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'ALLOCATED');
    document.getElementById('splash-sys-cores').innerText = 'CPU: ' + (navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' CORES' : 'ACTIVE');

    document.getElementById('splash-sys-loc').innerText = 'LOC: ' + (navigator.language || 'EN-US').toUpperCase();
    document.getElementById('splash-sys-tz').innerText = 'TZ: ' + Intl.DateTimeFormat().resolvedOptions().timeZone.toUpperCase();

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let netType = 'UPLINK';
    if (conn) {
      if (conn.type) {
        netType = conn.type.toUpperCase();
      } else {
        netType = conn.effectiveType === '4g' ? 'WIFI/LAN' : conn.effectiveType.toUpperCase();
      }
    }
    document.getElementById('splash-sys-net').innerText = 'NET: ' + netType;

    // Ping is rounded to 25ms by browsers for security, so we add a dynamic hacker fluctuation effect
    let basePing = conn && conn.rtt ? conn.rtt : 40;
    const pingEl = document.getElementById('splash-sys-rtt');
    const pingInterval = setInterval(() => {
      const dynamicPing = basePing + Math.floor(Math.random() * 15) - 5; // fluctuate between -5 and +10
      if (pingEl) pingEl.innerText = 'PING: ' + dynamicPing + 'ms';
    }, 800);

    // Clear the ping interval when splash hides
    setTimeout(() => clearInterval(pingInterval), 4000);

  } catch (e) {
    console.warn("Failed to read system specs for splash");
  }

  // Skip splash if seen in the last 1 hour (3600000 ms)
  if (lastSplash && (now - parseInt(lastSplash)) < 3600000) {
    document.getElementById("view-splash").classList.add("hidden");
    document.getElementById("view-splash").classList.remove("active-view");

    const landing = document.getElementById("view-landing");
    landing.classList.remove("hidden");
    landing.classList.add("active-view");

    // Ensure landing elements are instantly visible
    gsap.set("#view-landing .landing-avatar", { opacity: 1, scale: 1, filter: "blur(0px)" });
    gsap.set("#view-landing .landing-title", { opacity: 1, y: 0 });
    gsap.set("#view-landing .landing-subtitle", { opacity: 1, y: 0 });
    gsap.set("#view-landing .landing-actions", { opacity: 1, y: 0 });
    gsap.set("#view-landing .landing-scroll", { opacity: 1, y: 0 });

    gsap.to("#nav-rail, #bottom-nav, #canvas-effect-selector", { opacity: 1, pointerEvents: "auto", duration: 0 });
    document.querySelector('[data-target="view-landing"]').classList.add("active");
    return;
  }

  localStorage.setItem('analytics_last_splash', now.toString());

  const tl = gsap.timeline();

  tl.to(".splash-logo", { opacity: 1, duration: 1, ease: "power2.out" })
    .to(".splash-progress", { opacity: 1, duration: 0.5 })
    .to(".splash-bar", { width: "100%", duration: 2, ease: "power1.inOut" })
    .to("#view-splash", {
      opacity: 0,
      scale: 1.1,
      filter: "blur(10px)",
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        document.getElementById("view-splash").classList.add("hidden");
        document.getElementById("view-splash").classList.remove("active-view");

        const landing = document.getElementById("view-landing");
        landing.classList.remove("hidden");
        landing.classList.add("active-view");

        // Initial Reveal of Landing Content
        gsap.fromTo("#view-landing .landing-avatar",
          { opacity: 0, scale: 0.9, filter: "blur(10px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1, ease: "power3.out" }
        );
        gsap.fromTo("#view-landing .landing-title",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out" }
        );
        gsap.fromTo("#view-landing .landing-subtitle",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, delay: 0.4, ease: "power3.out" }
        );
        gsap.fromTo("#view-landing .landing-actions",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: "power3.out" }
        );
        gsap.fromTo("#view-landing .landing-scroll",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "power3.out" }
        );

        // Reveal Nav Rail, Bottom Nav, & Effect Selector
        gsap.to("#nav-rail, #bottom-nav, #canvas-effect-selector", { opacity: 1, pointerEvents: "auto", duration: 1, delay: 0.8 });
        document.querySelector('[data-target="view-landing"]').classList.add("active");
      }
    });
}

// Navigation Logic
const viewOrder = ["view-landing", "view-about", "view-education", "view-skills", "view-projects", "view-certs", "view-contact"];
let currentView = "view-landing";
let isAnimating = false;

function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn, .nav-trigger");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (target === currentView || isAnimating) return;
      switchView(target);
    });
  });

  const btnPrev = document.getElementById("nav-prev");
  const btnNext = document.getElementById("nav-next");

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (isAnimating) return;
      if (currentView === "view-project-detail") {
        switchView("view-projects");
        return;
      }
      const currentIndex = viewOrder.indexOf(currentView);
      if (currentIndex > 0) switchView(viewOrder[currentIndex - 1]);
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (isAnimating) return;
      const currentIndex = viewOrder.indexOf(currentView);
      if (currentIndex !== -1 && currentIndex < viewOrder.length - 1) switchView(viewOrder[currentIndex + 1]);
    });
  }

  updateBottomNav();
}

function updateBottomNav() {
  const btnPrev = document.getElementById("nav-prev");
  const btnNext = document.getElementById("nav-next");
  const separator = document.getElementById("nav-separator");

  if (!btnPrev || !btnNext || !separator) return;

  if (currentView === "view-project-detail") {
    btnPrev.style.display = "block";
    btnNext.style.display = "none";
    separator.style.display = "none";
    return;
  }

  const currentIndex = viewOrder.indexOf(currentView);
  if (currentIndex === -1) return;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === viewOrder.length - 1;

  btnPrev.style.display = isFirst ? "none" : "block";
  btnNext.style.display = isLast ? "none" : "block";
  separator.style.display = (isFirst || isLast) ? "none" : "block";
}

function switchView(target) {
  isAnimating = true;

  // Custom Analytics Tracking
  if (typeof analyticsSession !== 'undefined') {
    analyticsSession.pages_visited++;
    logAction(`Navigated to ${target}`);
  }

  // Track Virtual Page View in Google Analytics
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: target.replace('view-', '').charAt(0).toUpperCase() + target.replace('view-', '').slice(1),
      page_location: window.location.href + '#' + target,
      page_path: '/' + target
    });
  }

  const oldView = document.getElementById(currentView);
  const newView = document.getElementById(target);

  // Update nav active state (only for rail buttons)
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const navBtn = document.querySelector(`.nav-btn[data-target="${target}"]`);
  if (navBtn) navBtn.classList.add("active");

  // Hide old view
  gsap.to(oldView, {
    opacity: 0,
    scale: 0.98,
    filter: "blur(10px)",
    duration: 0.5,
    ease: "power2.inOut",
    onComplete: () => {
      oldView.classList.add("hidden");
      oldView.classList.remove("active-view");

      newView.classList.remove("hidden");
      newView.classList.add("active-view");

      // Setup new view
      gsap.set(newView, { opacity: 0, scale: 1.02, filter: "blur(10px)" });

      // Reveal new view
      gsap.to(newView, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          isAnimating = false;
        }
      });

      // Cascade internal elements if they exist
      animateViewContent(target);
    }
  });

  currentView = target;
  updateBottomNav();
}

function animateViewContent(target) {
  // If we are switching to landing, re-run its specific animation
  if (target === 'view-landing') {
    gsap.fromTo("#view-landing .landing-avatar", { opacity: 0, scale: 0.9, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" });
    gsap.fromTo("#view-landing .landing-title", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.1, ease: "power3.out" });
    gsap.fromTo("#view-landing .landing-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });
    gsap.fromTo("#view-landing .landing-actions", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power3.out" });
    return;
  }

  // Generic cascade for other views
  const elements = document.querySelectorAll(`#${target} .opacity-0`);
  if (elements.length > 0) {
    gsap.fromTo(elements,
      { opacity: 0, y: 20, filter: "blur(5px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 }
    );
  }
}

// Project Details Data
const projectData = {
  "1": {
    title: "DairyFlow – Full Stack Management Platform",
    stack: "Node.js, Express.js, PostgreSQL, Supabase, AWS Amplify",
    details: `
      <ul class="list-disc pl-5 space-y-4 text-[#86868b] dark:text-[#888888] font-light leading-relaxed mb-6">
        <li>Developed a full stack platform with role-based access control, integrating a comprehensive ledger system for financial tracking.</li>
        <li>Built an advanced loan tracking module and automated payout workflows to streamline business operations.</li>
        <li>Designed REST APIs and optimized database operations using indexing and server-side query filtering.</li>
        <li>Deployed and managed the application using AWS Amplify with Supabase backend integration.</li>
      </ul>
      <a href="https://kosha.bharathreddy.space/downloads" target="_blank" rel="noopener noreferrer" onclick="window.trackEvent('app_download', '/projects/dairyflow', 'DairyFlow App Download (Detail Popup)');" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:scale-105 transition-transform">
        <i class="ph ph-download-simple text-lg"></i>
        Download App (macOS & Windows)
      </a>
    `
  },
  "2": {
    title: "Self-Hosted Infrastructure & Container Platform",
    stack: "Debian Linux, Docker, Docker Compose, Kubernetes, SMB, YAML",
    details: `
      <ul class="list-disc pl-5 space-y-4 text-[#86868b] dark:text-[#888888] font-light leading-relaxed">
        <li>Built and maintained a self-hosted infrastructure platform on Debian Linux running multiple containerized services using Docker Compose.</li>
        <li>Managed container networking, persistent storage, SMB file sharing, service configurations, and infrastructure troubleshooting across Linux environments.</li>
        <li>Configured YAML-based multi-container deployments with automated service management, health checks, and reliability-focused system administration.</li>
        <li>Implemented container restart policies and monitored system resources, logs, storage utilization, and service uptime to improve operational reliability.</li>
        <li>Explored Kubernetes-based container orchestration concepts with exposure to deployments, scaling, and service management.</li>
      </ul>
    `
  },
  "3": {
    title: "Scalable Cloud Infrastructure with CI/CD",
    stack: "AWS, Docker, GitHub Actions, PostgreSQL",
    details: `
      <ul class="list-disc pl-5 space-y-4 text-[#86868b] dark:text-[#888888] font-light leading-relaxed">
        <li>Designed and deployed scalable cloud infrastructure using AWS EC2, RDS, Application Load Balancer, and Auto Scaling.</li>
        <li>Configured secure VPC networking with IAM-based access control, private/public subnets, and restricted database connectivity.</li>
        <li>Containerized backend services using Docker and implemented CI/CD workflows using GitHub Actions.</li>
        <li>Integrated CloudWatch monitoring and centralized logging for infrastructure visibility, observability, and operational reliability.</li>
        <li>Improved deployment consistency and reduced manual configuration effort through automation workflows.</li>
      </ul>
    `
  },
  "4": {
    title: "Image Fusion System",
    stack: "Python, CNNs, DWT, Laplacian Pyramid, GUI",
    details: `
      <ul class="list-disc pl-5 space-y-4 text-[#86868b] dark:text-[#888888] font-light leading-relaxed">
        <li>Developed a Python GUI-based Image Fusion system using Discrete Wavelet Transform (DWT), Convolutional Neural Networks (CNNs), and Laplacian Pyramid for CT/MRI modalities.</li>
        <li>Integrated complementary anatomical and functional data using different techniques to achieve superior fused images.</li>
        <li>Evaluated rigorously with quantitative metrics for advanced medical analysis and improved diagnostic capability.</li>
      </ul>
    `
  }
};

function initProjectDetails() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (isAnimating) return;
      const id = card.getAttribute('data-project');
      const data = projectData[id];
      if (data) {
        const content = document.getElementById('project-detail-content');
        content.innerHTML = `
          <h2 class="text-3xl font-medium mb-2">${data.title}</h2>
          <div class="text-sm text-[#86868b] dark:text-[#888888] tracking-widest uppercase mb-8">${data.stack}</div>
          ${data.details}
        `;

        // Remove opacity-0 class from content so it gets animated correctly or just force it visible
        content.classList.remove("opacity-0");
        content.classList.remove("translate-y-4");

        switchView('view-project-detail');
      }
    });
  });

  document.getElementById('btn-back-projects').addEventListener('click', () => {
    if (isAnimating) return;
    switchView('view-projects');
  });
}

window.forceDownload = async function(url, filename) {
  try {
    // Attempt to fetch the file as a blob
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    
    // Create an object URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor to trigger the download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download via blob failed, falling back to direct navigation:', error);
    // If CORS prevents fetch, fallback to simply opening the URL
    window.open(url, '_blank');
  }
};
