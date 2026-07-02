const canvasEffects = [
  // 0: Constellation
  {
    name: "Constellation",
    particles: [],
    init(w, h) {
      this.particles = Array.from({length: 80}, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5
      }));
    },
    draw(ctx, w, h, isDark, mouse, time) {
      if (isDark && window.innerWidth < 768) {
        mouse = { x: null, y: null };
      }
      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        if (mouse.x && mouse.y) {
          let dx = p.x - mouse.x, dy = p.y - mouse.y;
          let dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 150) {
            p.x += dx/dist * 1.5; p.y += dy/dist * 1.5;
          }
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.6)";
        ctx.fill();
      });
      for (let i = 0; i < this.particles.length; i++) {
        let p1 = this.particles[i];
        if (mouse.x && mouse.y) {
          let dx = p1.x - mouse.x, dy = p1.y - mouse.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 150) {
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${isDark?'255,255,255':'0,0,0'}, ${(isDark?0.05:0.2)*(1-dist/150)})`;
            ctx.stroke();
          }
        }
        for (let j = i + 1; j < this.particles.length; j++) {
          let p2 = this.particles[j];
          let dx = p1.x - p2.x, dy = p1.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 150) {
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${isDark?'255,255,255':'0,0,0'}, ${(isDark?0.05:0.2)*(1-dist/150)})`;
            ctx.stroke();
          }
        }
      }
    }
  },
  // 1: Warp Speed
  {
    name: "Warp Speed",
    stars: [],
    lastTime: 0,
    init(w, h) {
      this.stars = Array.from({length: 200}, () => ({
        x: Math.random() * w - w/2, y: Math.random() * h - h/2, z: Math.random() * w
      }));
      this.lastTime = 0;
    },
    draw(ctx, w, h, isDark, mouse, time) {
      if (!this.lastTime) this.lastTime = time;
      let dt = time - this.lastTime;
      if (dt > 100 || dt <= 0) dt = 16;
      this.lastTime = time;

      // Unify speed across all screen widths and framerates (120hz vs 60hz)
      // Decreased by 70% as requested
      let speed = (w / 20000) * dt;

      ctx.translate(w/2, h/2);
      this.stars.forEach(s => {
        s.z -= speed;
        if (s.z <= 0) { s.x = Math.random() * w - w/2; s.y = Math.random() * h - h/2; s.z = w; }
        let sx = (s.x / s.z) * w; let sy = (s.y / s.z) * w;
        let r = (1 - s.z / w) * 3;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.fillStyle = isDark ? `rgba(255,255,255,${1-s.z/w})` : `rgba(0,0,0,${1-s.z/w})`;
        ctx.fill();
      });
      ctx.translate(-w/2, -h/2);
    }
  },
  // 2: Digital Rain
  {
    name: "Digital Rain",
    drops: [],
    columns: 0,
    init(w, h) {
      this.columns = Math.floor(w / 20);
      this.drops = Array(this.columns).fill(0).map(() => Math.random() * h);
    },
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.fillStyle = isDark ? "rgba(10, 10, 10, 0.05)" : "rgba(245, 245, 247, 0.05)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)";
      ctx.font = "15px monospace";
      for (let i = 0; i < this.drops.length; i++) {
        let text = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(text, i * 20, this.drops[i] * 20);
        if (this.drops[i] * 20 > h && Math.random() > 0.975) this.drops[i] = 0;
        this.drops[i]++;
      }
    }
  },
  // 3: Cyberpunk Grid
  {
    name: "Cyberpunk Grid",
    init(w, h) {},
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.translate(w/2, h/2);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      let speed = (time / 20) % 50;
      for (let i = -w; i < w; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i * 3, h); ctx.stroke();
      }
      for (let i = 0; i < h; i += 50) {
        let y = i + speed;
        ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.translate(-w/2, -h/2);
    }
  },
  // 4: Floating Dust
  {
    name: "Floating Dust",
    dust: [],
    init(w, h) {
      this.dust = Array.from({length: 150}, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 2, a: Math.random() * Math.PI * 2
      }));
    },
    draw(ctx, w, h, isDark, mouse, time) {
      this.dust.forEach(d => {
        d.y -= 0.5; d.x += Math.sin(d.a) * 0.5; d.a += 0.01;
        if (d.y < 0) { d.y = h; d.x = Math.random() * w; }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
        ctx.fill();
      });
    }
  },
  // 5: Hexagon Grid
  {
    name: "Hexagon Grid",
    init(w, h) {},
    draw(ctx, w, h, isDark, mouse, time) {
      let size = 40;
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      let offsetX = (time * 0.05) % size;
      let offsetY = (time * 0.05) % size;
      for (let x = -size; x < w+size; x += size) {
        for (let y = -size; y < h+size; y += size) {
          ctx.beginPath(); ctx.arc(x+offsetX, y+offsetY, 2, 0, Math.PI*2); ctx.stroke();
        }
      }
    }
  },
  // 6: Particle Vortex
  {
    name: "Particle Vortex",
    vortex: [],
    init(w, h) {
      this.vortex = Array.from({length: 300}, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.max(w, h)
      }));
    },
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.translate(w/2, h/2);
      this.vortex.forEach(v => {
        v.angle += 0.005 + (1 / v.radius);
        v.radius -= 0.5;
        if (v.radius < 0) v.radius = Math.max(w, h);
        let x = Math.cos(v.angle) * v.radius;
        let y = Math.sin(v.angle) * v.radius;
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
        ctx.fillRect(x, y, 1, 1);
      });
      ctx.translate(-w/2, -h/2);
    }
  },
  // 7: Neural Network
  {
    name: "Neural Network",
    nodes: [],
    init(w, h) {
      this.nodes = Array.from({length: 100}, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
      }));
    },
    draw(ctx, w, h, isDark, mouse, time) {
      this.nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.beginPath(); ctx.arc(n.x, n.y, 1, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
        ctx.fill();
      });
      ctx.lineWidth = 0.5;
      for(let i=0; i<this.nodes.length; i++) {
        for(let j=i+1; j<this.nodes.length; j++) {
           let dist = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
           if(dist < 100) {
             ctx.beginPath(); ctx.moveTo(this.nodes[i].x, this.nodes[i].y); ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
             ctx.strokeStyle = isDark ? `rgba(255,255,255,${1 - dist/100})` : `rgba(0,0,0,${1 - dist/100})`;
             ctx.stroke();
           }
        }
      }
    }
  },
  // 8: Audio Visualizer
  {
    name: "Audio Visualizer",
    bars: 100,
    init(w, h) {},
    draw(ctx, w, h, isDark, mouse, time) {
      let bw = w / this.bars;
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      for(let i=0; i<this.bars; i++) {
        let bh = (Math.sin(time*0.005 + i*0.1) * Math.cos(time*0.003 + i*0.05) * 0.5 + 0.5) * h * 0.3;
        ctx.fillRect(i*bw, h - bh, bw-1, bh);
      }
    }
  },
  // 9: Swarming Boids
  {
    name: "Boids",
    boids: [],
    init(w, h) {
      this.boids = Array.from({length: 100}, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: Math.random() * 2 - 1, vy: Math.random() * 2 - 1
      }));
    },
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
      this.boids.forEach(b => {
        b.vx += Math.sin(time*0.001 + b.y*0.01) * 0.05;
        b.vy += Math.cos(time*0.001 + b.x*0.01) * 0.05;
        let speed = Math.hypot(b.vx, b.vy);
        if(speed > 2) { b.vx = (b.vx/speed)*2; b.vy = (b.vy/speed)*2; }
        b.x += b.vx; b.y += b.vy;
        if(b.x < 0) b.x = w; if(b.x > w) b.x = 0;
        if(b.y < 0) b.y = h; if(b.y > h) b.y = 0;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-5, 3); ctx.lineTo(-5, -3); ctx.fill();
        ctx.restore();
      });
    }
  },
  // 10: Topography
  {
    name: "Topography",
    init(w, h) {},
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      for(let i=0; i<h; i+=40) {
        ctx.beginPath();
        for(let x=0; x<=w; x+=20) {
          let y = i + Math.sin(x*0.005 + time*0.0005) * 50 * Math.cos(i*0.01 + time*0.0002);
          if(x===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  },
  // 11: Quantum Waveform
  {
    name: "Quantum Waveform",
    init(w, h) {},
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
      ctx.beginPath();
      for(let x=0; x<w; x+=5) {
        let distFromCenter = Math.abs(x - w/2);
        let envelope = Math.exp(-distFromCenter*distFromCenter / 100000);
        let y = h/2 + Math.sin(x*0.05 - time*0.005) * 150 * envelope;
        if(x===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  // 12: Galactic Spiral
  {
    name: "Galactic Spiral",
    stars: [],
    init(w, h) {
      this.stars = Array.from({length: 400}, () => {
        let a = Math.random() * Math.PI * 2;
        let r = Math.random() * Math.max(w,h) * 0.8;
        return { a, r, speed: 10 / (r + 10) };
      });
    },
    draw(ctx, w, h, isDark, mouse, time) {
      ctx.translate(w/2, h/2);
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
      this.stars.forEach(s => {
        s.a -= s.speed * 0.1;
        s.r -= 0.5;
        if(s.r < 0) s.r = Math.max(w,h) * 0.8;
        let x = Math.cos(s.a) * s.r;
        let y = Math.sin(s.a) * s.r;
        ctx.fillRect(x, y, 1.5, 1.5);
      });
      ctx.translate(-w/2, -h/2);
    }
  }
];

// Initialize global controller
window.canvasEffectManager = {
  currentEffectIndex: 0,
  initCanvas: function() {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let width, height;
    let mouse = { x: null, y: null };
    let animationFrameId;
    let isDarkMode = document.documentElement.classList.contains("dark");

    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
    
    const observer = new MutationObserver(() => {
      isDarkMode = document.documentElement.classList.contains("dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width; canvas.height = height;
      if(canvasEffects[window.canvasEffectManager.currentEffectIndex]) {
        canvasEffects[window.canvasEffectManager.currentEffectIndex].init(width, height);
      }
    }
    window.addEventListener("resize", resize);
    
    const select = document.getElementById("bg-effect-select");
    if(select) {
      select.addEventListener("change", (e) => {
        window.canvasEffectManager.currentEffectIndex = parseInt(e.target.value);
        ctx.clearRect(0, 0, width, height);
        if(canvasEffects[window.canvasEffectManager.currentEffectIndex]) {
          canvasEffects[window.canvasEffectManager.currentEffectIndex].init(width, height);
        }
      });
    }

    resize();

    function animate(time) {
      // Don't clear rect completely for digital rain (index 2)
      let current = window.canvasEffectManager.currentEffectIndex;
      if(current !== 2) {
        ctx.clearRect(0, 0, width, height);
      }
      
      if(canvasEffects[window.canvasEffectManager.currentEffectIndex]) {
        canvasEffects[window.canvasEffectManager.currentEffectIndex].draw(ctx, width, height, isDarkMode, mouse, time);
      }
      animationFrameId = requestAnimationFrame(animate);
    }
    animate(0);
  }
};
