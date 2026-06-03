"use client";

import React, { useEffect, useRef, useState } from "react";

interface Fish {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  size: number;
  color: string;
  finColor: string;
  phase: number;
  wiggleSpeed: number;
  turnSpeed: number;
  isSwimmingAway: boolean;
}

// Low-resource Web Audio API Synthesizer for spatial space drone
class AmbientSynth {
  private ctx: AudioContext | null = null;
  private oscs: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  start() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.06, this.ctx.currentTime); // soft background volume
      
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.Q.setValueAtTime(1.8, this.ctx.currentTime);
      this.filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      // Osc 1: Deep Root note (A2 = 110Hz)
      const osc1 = this.ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(110, this.ctx.currentTime);
      
      // Osc 2: Calming Fifth (E3 = 164.81Hz)
      const osc2 = this.ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(164.81, this.ctx.currentTime);

      // Osc 3: Soft Octave (A3 = 220Hz)
      const osc3 = this.ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(220, this.ctx.currentTime);

      // LFO to slowly sweep the lowpass filter cutoff frequency (creates breathing audio swells)
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // slow swell cycle (12 seconds)
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filter.frequency);

      // Connections
      osc1.connect(this.filter);
      osc2.connect(this.filter);
      osc3.connect(this.filter);
      this.filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc3.start();
      this.lfo.start();

      this.oscs = [osc1, osc2, osc3];
    } catch (e) {
      console.warn("Audio Context init blocked or failed:", e);
    }
  }

  stop() {
    this.oscs.forEach((osc) => {
      try { osc.stop(); } catch (e) {}
    });
    this.oscs = [];
    if (this.lfo) {
      try { this.lfo.stop(); } catch (e) {}
      this.lfo = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

export default function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fishesRef = useRef<Fish[]>([]);
  const synthRef = useRef<AmbientSynth | null>(null);

  // States
  const [remainingRests, setRemainingRests] = useState<number>(10);
  const [popupState, setPopupState] = useState<{ fishId: number; x: number; y: number } | null>(null);
  const [customInputActive, setCustomInputActive] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  
  const [isBreakActive, setIsBreakActive] = useState<boolean>(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  
  // Refs for closure-safe state access
  const popupStateRef = useRef(popupState);
  const isBreakActiveRef = useRef(isBreakActive);
  
  useEffect(() => { popupStateRef.current = popupState; }, [popupState]);
  useEffect(() => { isBreakActiveRef.current = isBreakActive; }, [isBreakActive]);

  // Load remaining rests from localStorage
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const stored = localStorage.getItem("palmera_fish_rests");
    let count = 10;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayStr) {
          count = parsed.remaining;
        } else {
          localStorage.setItem("palmera_fish_rests", JSON.stringify({ date: todayStr, remaining: 10 }));
        }
      } catch (e) {
        // ignore
      }
    } else {
      localStorage.setItem("palmera_fish_rests", JSON.stringify({ date: todayStr, remaining: 10 }));
    }
    setRemainingRests(count);
  }, []);

  const updateRemainingRests = (newCount: number) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    localStorage.setItem("palmera_fish_rests", JSON.stringify({ date: todayStr, remaining: newCount }));
    setRemainingRests(newCount);
  };

  // Sound synthesizer sync
  useEffect(() => {
    if (isBreakActive && audioEnabled) {
      if (!synthRef.current) {
        synthRef.current = new AmbientSynth();
        synthRef.current.start();
      }
    } else {
      if (synthRef.current) {
        synthRef.current.stop();
        synthRef.current = null;
      }
    }
    return () => {
      synthRef.current?.stop();
    };
  }, [isBreakActive, audioEnabled]);

  // Lock timer and automatic exit fullscreen
  useEffect(() => {
    if (!isBreakActive || breakTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsBreakActive(false);
          // Exit fullscreen automatically
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreakActive, breakTimeLeft]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.stop();
    };
  }, []);

  // Fullscreen helper
  const enterFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if ((docEl as any).webkitRequestFullscreen) {
      (docEl as any).webkitRequestFullscreen();
    } else if ((docEl as any).msRequestFullscreen) {
      (docEl as any).msRequestFullscreen();
    }
  };

  // Canvas and animation setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // MutationObserver and fish visibility helpers
    let lastCheckTime = 0;
    const CHECK_INTERVAL = 500;
    
    const getBlockingElements = (): DOMRect[] => {
      const elements = document.querySelectorAll('*');
      const blocks: DOMRect[] = [];
      const excludedSelectors = ['.popup-content'];
      
      elements.forEach(el => {
        if (el.matches(excludedSelectors.join(', '))) return;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Exclude elements with negative z-index (background layers)
        const zIndex = parseInt(style.zIndex);
        if (!isNaN(zIndex) && zIndex < 0) return;
        
        if (
          (style.position === 'fixed' || style.position === 'absolute' || style.position === 'sticky') &&
          rect.width > 50 && rect.height > 50 &&
          style.display !== 'none' && style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0
        ) {
          blocks.push(rect);
        }
      });
      return blocks;
    };
    
    const isFishBlocked = (fish: Fish, blocks: DOMRect[]): boolean => {
      const r = fish.size * 0.5;
      return blocks.some(b => 
        fish.x + r > b.left && fish.x - r < b.right &&
        fish.y + r > b.top && fish.y - r < b.bottom
      );
    };
    
    const checkAndRepositionFish = () => {
      const now = Date.now();
      if (now - lastCheckTime < CHECK_INTERVAL) return;
      lastCheckTime = now;
      if (popupStateRef.current || isBreakActiveRef.current) return;
      
      const blocks = getBlockingElements();
      const margin = Math.min(80, Math.max(20, Math.min(width, height) * 0.1));
      
      const visibleFish = fishesRef.current.filter(fish => 
        !fish.isSwimmingAway && 
        fish.x > margin && fish.x < width - margin &&
        fish.y > margin && fish.y < height - margin &&
        !isFishBlocked(fish, blocks)
      );
      
      if (visibleFish.length === 0 && fishesRef.current.length > 0) {
        const fish = fishesRef.current.find(f => !f.isSwimmingAway);
        if (fish) {
          const safeW = width - margin * 2;
          const safeH = height - margin * 2;
          if (safeW > 0 && safeH > 0) {
            let attempts = 0;
            do {
              fish.targetX = margin + Math.random() * safeW;
              fish.targetY = margin + Math.random() * safeH;
              attempts++;
            } while (isFishBlocked(fish, blocks) && attempts < 15);
          }
        }
      }
    };
    
    // MutationObserver to detect layout changes
    const mutationObserver = new MutationObserver(() => {
      checkAndRepositionFish();
    });
    mutationObserver.observe(document.body, { 
      childList: true, subtree: true, 
      attributes: true, attributeFilter: ['style', 'class'] 
    });

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createFish = (id: number, isOrange: boolean): Fish => {
      const size = 35 + Math.random() * 20;
      const baseSpeed = 0.35 + Math.random() * 0.3;
      
      const color = isOrange
        ? `rgba(${235 + Math.floor(Math.random() * 20)}, ${115 + Math.floor(Math.random() * 40)}, ${20 + Math.floor(Math.random() * 15)}, 0.45)`
        : `rgba(${200 + Math.floor(Math.random() * 30)}, ${215 + Math.floor(Math.random() * 25)}, ${230 + Math.floor(Math.random() * 25)}, 0.35)`;
      
      const finColor = isOrange
        ? "rgba(249, 115, 22, 0.22)"
        : "rgba(186, 230, 253, 0.18)";

      return {
        id,
        x: Math.random() * width,
        y: Math.random() * height,
        targetX: Math.random() * width,
        targetY: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        speed: baseSpeed,
        baseSpeed,
        size,
        color,
        finColor,
        phase: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.04 + Math.random() * 0.03,
        turnSpeed: 0.008 + Math.random() * 0.006,
        isSwimmingAway: false
      };
    };

    const fishes: Fish[] = [];
    for (let i = 0; i < remainingRests; i++) {
      fishes.push(createFish(i, i % 2 === 0));
    }
    fishesRef.current = fishes;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      fishesRef.current.forEach((fish) => {
        if (fish.x > width) fish.x = Math.random() * width;
        if (fish.y > height) fish.y = Math.random() * height;
        if (!fish.isSwimmingAway) {
          fish.targetX = Math.random() * width;
          fish.targetY = Math.random() * height;
        }
      });
      
      checkAndRepositionFish();
    };

    window.addEventListener("resize", handleResize);

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "A" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.closest(".popup-content")
      ) {
        return;
      }

      setPopupState(null);
      setCustomInputActive(false);

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const currentFishes = fishesRef.current;
      for (let i = 0; i < currentFishes.length; i++) {
        const fish = currentFishes[i];
        if (fish.isSwimmingAway) continue;

        const dx = clickX - fish.x;
        const dy = clickY - fish.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fish.size * 0.95) {
          setPopupState({
            fishId: fish.id,
            x: e.clientX,
            y: e.clientY
          });
          break;
        }
      }
    };

    window.addEventListener("click", handleGlobalClick);

    const spineWidths = [0.4, 0.75, 1.0, 1.05, 0.95, 0.8, 0.65, 0.5, 0.35, 0.2, 0.15, 0.35];
    const N = spineWidths.length;

    let time = 0;
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const animate = () => {
      if (!isTabVisible) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      time++;
      ctx.clearRect(0, 0, width, height);
      
      // Check fish visibility every 120 frames (~2 seconds)
      if (time % 120 === 0) {
        checkAndRepositionFish();
      }

      const currentFishes = fishesRef.current;
      for (let fIdx = currentFishes.length - 1; fIdx >= 0; fIdx--) {
        const fish = currentFishes[fIdx];

        if (fish.isSwimmingAway) {
          fish.speed = Math.min(fish.speed + 0.1, 4.5);
          const margin = 100;
          if (
            fish.x < -margin ||
            fish.x > width + margin ||
            fish.y < -margin ||
            fish.y > height + margin
          ) {
            currentFishes.splice(fIdx, 1);
            continue;
          }
        } else {
          const dx = fish.targetX - fish.x;
          const dy = fish.targetY - fish.y;
          const distToTarget = Math.sqrt(dx * dx + dy * dy);

          if (distToTarget < 60) {
            fish.targetX = Math.random() * width;
            fish.targetY = Math.random() * height;
          }
        }

        const dx = fish.targetX - fish.x;
        const dy = fish.targetY - fish.y;

        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - fish.angle;
        
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        fish.angle += angleDiff * fish.turnSpeed;

        fish.x += Math.cos(fish.angle) * fish.speed;
        fish.y += Math.sin(fish.angle) * fish.speed;

        fish.phase += fish.wiggleSpeed;

        const spinePoints: { x: number; y: number }[] = [];
        for (let i = 0; i < N; i++) {
          const s = (i / (N - 1)) * fish.size;
          const baseX = fish.x - Math.cos(fish.angle) * s;
          const baseY = fish.y - Math.sin(fish.angle) * s;

          const amp = fish.size * 0.1 * Math.pow(i / (N - 1), 1.3);
          const wiggle = Math.sin(fish.phase - i * 0.5) * amp;

          const sx = baseX - Math.sin(fish.angle) * wiggle;
          const sy = baseY + Math.cos(fish.angle) * wiggle;

          spinePoints.push({ x: sx, y: sy });
        }

        const pointsWithAngle: { x: number; y: number; angle: number }[] = [];
        for (let i = 0; i < N; i++) {
          let segAngle = fish.angle;
          if (i > 0) {
            const prev = spinePoints[i - 1];
            const curr = spinePoints[i];
            segAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x) + Math.PI;
          }
          pointsWithAngle.push({ ...spinePoints[i], angle: segAngle });
        }

        const leftSide: { x: number; y: number }[] = [];
        const rightSide: { x: number; y: number }[] = [];

        for (let i = 0; i < N; i++) {
          const pt = pointsWithAngle[i];
          const w = spineWidths[i] * fish.size * 0.12;

          const nx = Math.sin(pt.angle);
          const ny = -Math.cos(pt.angle);

          leftSide.push({ x: pt.x + nx * w, y: pt.y + ny * w });
          rightSide.push({ x: pt.x - nx * w, y: pt.y - ny * w });
        }

        ctx.fillStyle = fish.finColor;
        
        ctx.beginPath();
        ctx.moveTo(leftSide[2].x, leftSide[2].y);
        const finLAngle = pointsWithAngle[2].angle + Math.PI / 2 + Math.PI / 5;
        const finLX = leftSide[2].x + Math.cos(finLAngle) * fish.size * 0.3;
        const finLY = leftSide[2].y + Math.sin(finLAngle) * fish.size * 0.3;
        ctx.quadraticCurveTo(finLX, finLY, leftSide[4].x, leftSide[4].y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(rightSide[2].x, rightSide[2].y);
        const finRAngle = pointsWithAngle[2].angle - Math.PI / 2 - Math.PI / 5;
        const finRX = rightSide[2].x + Math.cos(finRAngle) * fish.size * 0.3;
        const finRY = rightSide[2].y + Math.sin(finRAngle) * fish.size * 0.3;
        ctx.quadraticCurveTo(finRX, finRY, rightSide[4].x, rightSide[4].y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(spinePoints[0].x, spinePoints[0].y);

        for (let i = 0; i < N; i++) {
          ctx.lineTo(leftSide[i].x, leftSide[i].y);
        }

        for (let i = N - 1; i >= 0; i--) {
          ctx.lineTo(rightSide[i].x, rightSide[i].y);
        }

        ctx.closePath();
        ctx.fillStyle = fish.color;
        ctx.fill();
        
        const eyeW = fish.size * 0.035;
        const eyeOffsetAngle = Math.PI / 4.5;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        const eyeLX = spinePoints[0].x + Math.cos(fish.angle + eyeOffsetAngle) * fish.size * 0.18;
        const eyeLY = spinePoints[0].y + Math.sin(fish.angle + eyeOffsetAngle) * fish.size * 0.18;
        ctx.beginPath();
        ctx.arc(eyeLX, eyeLY, eyeW, 0, Math.PI * 2);
        ctx.fill();

        const eyeRX = spinePoints[0].x + Math.cos(fish.angle - eyeOffsetAngle) * fish.size * 0.18;
        const eyeRY = spinePoints[0].y + Math.sin(fish.angle - eyeOffsetAngle) * fish.size * 0.18;
        ctx.beginPath();
        ctx.arc(eyeRX, eyeRY, eyeW, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Gentle Waves
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      for (let x = 0; x < width + 30; x += 30) {
        const y = height * 0.25 + Math.sin(x * 0.003 + time * 0.005) * 25 + Math.cos(x * 0.0015 + time * 0.003) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      for (let x = 0; x < width + 30; x += 30) {
        const y = height * 0.65 + Math.sin(x * 0.0025 - time * 0.004) * 20 + Math.cos(x * 0.002 + time * 0.002) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      for (let x = 0; x < width + 30; x += 30) {
        const y = height * 0.45 + Math.sin(x * 0.0035 + time * 0.003) * 30 + Math.sin(x * 0.001 - time * 0.005) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      mutationObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [remainingRests]);

  const triggerBreak = (seconds: number) => {
    if (popupState === null) return;
    
    const clickedFishId = popupState.fishId;
    const fish = fishesRef.current.find((f) => f.id === clickedFishId);
    
    if (fish) {
      fish.isSwimmingAway = true;
      fish.speed = 3.5;
      const currentAngle = fish.angle;
      fish.targetX = fish.x + Math.cos(currentAngle) * (window.innerWidth + 500);
      fish.targetY = fish.y + Math.sin(currentAngle) * (window.innerHeight + 500);
    }

    const newRemaining = Math.max(0, remainingRests - 1);
    updateRemainingRests(newRemaining);

    setPopupState(null);
    setCustomInputActive(false);
    setBreakTimeLeft(seconds);
    setIsBreakActive(true);
    // Enable audio by default when starting break if it was clicked
    setAudioEnabled(true);

    // Enter Fullscreen mode (F11)
    enterFullscreen();
  };

  const handleCustomStart = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      triggerBreak(Math.floor(mins * 60));
    }
  };

  return (
    <>
      <div 
        className="absolute inset-0 -z-10 w-full h-full overflow-hidden"
        style={{
          background: "radial-gradient(circle at 50% 50%, #0d1e26 0%, #07131a 60%, #03070a 100%)"
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.03] blur-[150px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/[0.02] blur-[130px] pointer-events-none animate-pulse duration-[10000ms]" />
      </div>

      {popupState && (
        <div 
          className="popup-content fixed bg-[#090d16]/95 border border-[#f97316]/25 backdrop-blur-xl text-white rounded-2xl p-4.5 shadow-2xl z-[99999] w-64 space-y-3.5 animate-in fade-in zoom-in-95 duration-250 font-sans"
          style={{
            left: Math.min(popupState.x, window.innerWidth - 280),
            top: Math.min(popupState.y, window.innerHeight - 200)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-orange-400 font-sans">
              Tomar un Descanso
            </h4>
            <p className="text-[10px] text-stone-350 leading-normal font-sans">
              Consume una unidad de pez (Quedan: <span className="font-extrabold text-orange-400">{remainingRests}</span> para hoy).
            </p>
          </div>

          {!customInputActive ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1 font-sans">
              <button 
                onClick={() => triggerBreak(300)}
                className="py-2 px-3 bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 rounded-xl transition-all cursor-pointer text-center"
              >
                5 Minutos
              </button>
              <button 
                onClick={() => triggerBreak(600)}
                className="py-2 px-3 bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 rounded-xl transition-all cursor-pointer text-center"
              >
                10 Minutos
              </button>
              <button 
                onClick={() => setCustomInputActive(true)}
                className="col-span-2 py-2 px-3 bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 rounded-xl text-orange-400 transition-all cursor-pointer text-center"
              >
                Personalizar...
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomStart} className="space-y-3.5 pt-1 font-sans">
              <div className="space-y-1.5 font-sans">
                <label className="text-[9px] font-bold text-stone-400 uppercase">Minutos a descansar</label>
                <input 
                  type="number" 
                  step="any"
                  min="0.05"
                  required
                  autoFocus
                  placeholder="Ej. 15 o 1.5"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-xs text-white placeholder-stone-500 outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 font-sans"
                />
              </div>
              <div className="flex gap-2 text-xs font-bold font-sans">
                <button 
                  type="button"
                  onClick={() => setCustomInputActive(false)}
                  className="flex-1 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-stone-300 cursor-pointer"
                >
                  Atrás
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-white cursor-pointer"
                >
                  Iniciar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {isBreakActive && (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl text-white select-none pointer-events-auto">
          {/* Spatial glowing background layers & animations */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes cosmicPulse {
              0%, 100% {
                transform: scale(0.85);
                box-shadow: 
                  0 0 80px rgba(249, 115, 22, 0.15),
                  0 0 140px rgba(6, 182, 212, 0.1),
                  inset 0 0 40px rgba(249, 115, 22, 0.05);
                border-color: rgba(249, 115, 22, 0.15);
              }
              50% {
                transform: scale(1.2);
                box-shadow: 
                  0 0 140px rgba(249, 115, 22, 0.35),
                  0 0 200px rgba(6, 182, 212, 0.25),
                  inset 0 0 80px rgba(249, 115, 22, 0.15);
                border-color: rgba(249, 115, 22, 0.35);
              }
            }
            .animate-cosmic-breathing {
              animation: cosmicPulse 6s ease-in-out infinite;
            }
          `}} />

          {/* Atmospheric ambient cosmic nebulae blur spheres */}
          <div className="absolute top-[20%] left-[25%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.04] blur-[150px] pointer-events-none animate-pulse duration-[10000ms]" />
          <div className="absolute bottom-[20%] right-[25%] w-[600px] h-[600px] rounded-full bg-orange-500/[0.04] blur-[160px] pointer-events-none animate-pulse duration-[14000ms]" />

          {/* Large Atmospheric Glowing Breathing Circle (No text, zero stimuli) */}
          <div className="relative flex items-center justify-center">
            <div 
              className="w-80 h-80 rounded-full border-2 bg-radial from-[#13212b]/30 via-transparent to-transparent animate-cosmic-breathing flex items-center justify-center"
              style={{
                transition: "all 3000ms ease-in-out"
              }}
            />
          </div>

          {/* Calming, low contrast Speaker Control Icon in the bottom center */}
          <div className="absolute bottom-10 flex items-center justify-center z-[9999999] opacity-35 hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center text-white"
              title={audioEnabled ? "Silenciar música atmosférica" : "Activar música atmosférica"}
            >
              {audioEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
