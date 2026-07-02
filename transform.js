const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace body background
html = html.replace('bg-bgDark text-textMain', 'bg-[#f5f5f7] dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-white transition-colors duration-500');

// Replace white text/bg classes
html = html.replace(/\b(text-|bg-|border-|from-|via-|to-)(white)(?:\/(\d+))?\b/g, (match, prop, color, opacity) => {
  const op = opacity ? `/${opacity}` : '';
  return `${prop}black${op} dark:${prop}white${op}`;
});

// Specific replacements
html = html.replace(/text-textMuted/g, 'text-[#86868b] dark:text-[#888888]');
html = html.replace(/bg-\[#0a0a0a\]\/90/g, 'bg-[#f5f5f7]/90 dark:bg-[#0a0a0a]/90');
html = html.replace(/via-\[#0a0a0a\]\/20/g, 'via-[#f5f5f7]/20 dark:via-[#0a0a0a]/20');

// Nav rail
const nav_rail_html = `<nav id="nav-rail" class="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-8 px-8 py-3 bg-black/5 dark:bg-white/5 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-full opacity-0 pointer-events-none transition-all duration-300">
    <!-- Theme Toggle -->
    <button id="theme-toggle" class="text-[#86868b] dark:text-[#888888] hover:text-black dark:hover:text-white transition-colors mr-4" title="Toggle Theme">
      <i class="ph ph-sun text-xl dark:hidden block"></i>
      <i class="ph ph-moon text-xl hidden dark:block"></i>
    </button>
    <div class="w-[1px] h-6 bg-black/10 dark:bg-white/10 mr-4"></div>`;
html = html.replace(/<nav id="nav-rail" class="[^"]*">/, nav_rail_html);

// Add the Download CV button in landing page
const old_actions = `        <div class="landing-actions opacity-0 flex gap-6">
          <button class="nav-trigger glass-button" data-target="view-about">Explore Profile</button>
          <a href="https://github.com/bharath9812" target="_blank" class="icon-button"><i class="ph ph-github-logo"></i></a>
          <a href="https://www.linkedin.com/in/bharath-reddy-mandadhi" target="_blank" class="icon-button"><i class="ph ph-linkedin-logo"></i></a>
        </div>`;
const new_actions = `        <div class="landing-actions opacity-0 flex flex-wrap justify-center gap-6">
          <button class="nav-trigger glass-button" data-target="view-about">Explore Profile</button>
          <a href="../assets/Bharath_May_2k26.pdf" download class="glass-button bg-black text-white dark:bg-white dark:text-[#0a0a0a] font-medium border-none hover:bg-black/80 dark:hover:bg-white/90">Download CV</a>
          <div class="flex gap-4">
            <a href="https://github.com/bharath9812" target="_blank" class="icon-button"><i class="ph ph-github-logo"></i></a>
            <a href="https://www.linkedin.com/in/bharath-reddy-mandadhi" target="_blank" class="icon-button"><i class="ph ph-linkedin-logo"></i></a>
          </div>
        </div>`;
html = html.replace(old_actions, new_actions);

// Fix GSAP canvas color - it's hardcoded to white in app.js, we will just update app.js too via another script

// Add tailwind dark mode class config
html = html.replace("tailwind.config = {", "tailwind.config = {\n      darkMode: 'class',");

// Also ensure html tag has correct class if user wants it default
// I'll leave it without default class so it can be handled by app.js

fs.writeFileSync(indexPath, html);
console.log("Updated index.html");
