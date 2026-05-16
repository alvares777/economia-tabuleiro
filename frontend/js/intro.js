// intro.js — animação cinematográfica da tela de introdução
// 5 atos: Aproximação → Revelação → Herói → Logo → CTA
// Requer GSAP carregado globalmente antes deste arquivo.

const DESTINO = (function(){ try { return localStorage.getItem('economia_token') ? '/lista.html' : '/login.html'; } catch(e){ return '/login.html'; } })();
const REDIRECT_ON_COMPLETE = true;    // ← em produção: true

const $ = (s) => document.querySelector(s);

const trilhaSnd = $('#trilhaSnd');
if (trilhaSnd) trilhaSnd.volume = 0.45;

function play(snd){
  if (!snd) return;
  try{ snd.currentTime = 0; snd.play().catch(()=>{}); }catch(e){}
}

function fadeOutTrilha(duracaoMs){
  if (!trilhaSnd) return;
  const passos = 20;
  const intervalo = duracaoMs / passos;
  const decremento = trilhaSnd.volume / passos;
  const iv = setInterval(() => {
    if (trilhaSnd.volume > decremento) {
      trilhaSnd.volume -= decremento;
    } else {
      trilhaSnd.volume = 0;
      trilhaSnd.pause();
      clearInterval(iv);
    }
  }, intervalo);
}

/* ── ambient dust motes ─────────────────────────────────────────────── */
const dust = $('#dust');
const motes = [];
for(let i=0; i<70; i++){
  const m = document.createElement('div');
  m.className = 'mote';
  m.style.left = Math.random()*100 + 'vw';
  m.style.top  = Math.random()*100 + 'vh';
  const s = 0.4 + Math.random()*1.8;
  m.style.transform = `scale(${s})`;
  dust.appendChild(m);
  motes.push(m);
}
function animateMote(m){
  const dur = 6 + Math.random()*9;
  gsap.fromTo(m,
    { opacity:0, y:0 },
    {
      opacity: 0.2 + Math.random()*0.7,
      y: -50 - Math.random()*80,
      x: (Math.random()*60 - 30),
      duration: dur,
      ease:'sine.inOut',
      onComplete(){
        m.style.left = Math.random()*100 + 'vw';
        m.style.top  = (60 + Math.random()*40) + 'vh';
        animateMote(m);
      }
    }
  );
}

/* ── falling tokens ─────────────────────────────────────────────────── */
const rain = $('#rain');
const tokenSet = [
  {t:'R$',  g:true},  {t:'$',  g:false}, {t:'¢',  g:false},
  {t:'💰', g:false},  {t:'💎', g:false}, {t:'🪙', g:false},
  {t:'📈', g:true},   {t:'🏠', g:false}, {t:'🚗', g:false},
  {t:'🐷', g:true},   {t:'🎲', g:false}, {t:'⭐', g:false},
  {t:'🏦', g:true},   {t:'📊', g:true},  {t:'👑', g:false},
];

function dropToken(delay){
  const cfg = tokenSet[Math.floor(Math.random()*tokenSet.length)];
  const el = document.createElement('div');
  el.className = 'token' + (cfg.g ? ' green' : '');
  el.textContent = cfg.t;
  rain.appendChild(el);

  const startX = Math.random()*100;
  const drift  = (Math.random()*40 - 20);
  const rot    = (Math.random()*720 - 360);
  const scale  = 0.55 + Math.random()*0.9;
  const dur    = 1.7 + Math.random()*1.4;

  gsap.set(el, {
    left: startX + 'vw',
    top: '-12vh',
    rotation: -rot/4,
    scale: scale * 0.5,
    opacity:0,
  });
  gsap.to(el, { opacity:1, scale: scale, duration:0.35, delay });
  gsap.to(el, {
    top: (78 + Math.random()*14) + 'vh',
    left: (startX + drift) + 'vw',
    rotation: rot,
    duration: dur,
    delay,
    ease: 'power2.in',
    onComplete(){
      gsap.to(el, { y:'-=20', duration:0.18, ease:'power2.out',
        onComplete(){
          gsap.to(el, { y:'+=20', duration:0.22, ease:'bounce.out',
            onComplete(){
              gsap.to(el, { opacity:0, duration:0.7, delay:0.3, onComplete(){ el.remove() }});
            }
          });
        }
      });
    }
  });
}

/* ── shockwave on title slam ────────────────────────────────────────── */
function shockwave(){
  const ring = document.querySelector('.shockwave');
  gsap.set(ring, { width:10, height:10, opacity:1, borderWidth:3 });
  gsap.to(ring, {
    width:'180vh', height:'180vh',
    opacity:0,
    borderWidth:1,
    duration:1.2,
    ease:'power3.out'
  });
}

/* ── master timeline ────────────────────────────────────────────────── */
const TL_DUR = 12.5;
let mainTL;

function buildTimeline(){
  motes.forEach((m,i)=> setTimeout(()=>animateMote(m), i*60));

  const tl = gsap.timeline({
    onComplete: onIntroEnd,
    defaults:{ ease:'power3.out' }
  });

  /* ── ACT 1 — Aproximação (0–2.2s) ────────────────────────────── */
  tl.set(['.letterbox.top','.letterbox.bottom'], { scaleY:0.36 }, 0);

  tl.to('#coin-wrap', {
    opacity:1, scale:1,
    duration:1.8, ease:'power2.in'
  }, 0.3);
  tl.to('#coin', {
    rotateY: 1440,
    duration:1.8,
    ease:'power2.in'
  }, 0.3);
  tl.to('#coin-wrap', {
    filter:'drop-shadow(0 0 80px rgba(255,209,92,0.95))',
    duration:1.6
  }, 0.4);

  /* ── ACT 2 — Flash & câmera abre (2.2–3.4s) ──────────────────── */
  tl.to('.flash', { opacity:1, duration:0.15 }, 2.1);
  tl.to('#coin-wrap', { scale:1.6, duration:0.25, ease:'power2.out' }, 2.1);
  tl.to('.flash', { opacity:0, duration:0.55, ease:'power2.out' }, 2.3);

  tl.to('#coin-wrap', {
    top:'-30vh', scale:0.4, opacity:0,
    duration:0.6, ease:'power2.in'
  }, 2.35);

  tl.to('.letterbox.top',    { scaleY:0.06, duration:0.9, ease:'expo.out' }, 2.3);
  tl.to('.letterbox.bottom', { scaleY:0.06, duration:0.9, ease:'expo.out' }, 2.3);

  tl.to('.rays', { opacity:1, duration:1.4 }, 2.3);
  tl.to('.hex',  { opacity:1, duration:1.2 }, 2.5);
  tl.to('.floor',{ opacity:1, duration:1.2 }, 2.4);
  tl.to('.spotlight', { opacity:1, duration:1.2 }, 2.6);

  tl.fromTo('.corner',
    { opacity:0, scale:0.6 },
    { opacity:1, scale:1, duration:0.6, stagger:0.06, ease:'back.out(2.2)' },
    2.7
  );

  tl.to('#skip', { opacity:1, duration:0.5 }, 2.8);

  /* ── ACT 3 — Entrada do herói (3.3–5.5s) ─────────────────────── */
  tl.to('#kaique', {
    opacity:1,
    bottom:'5vh',
    y:0,
    duration:1.2,
    ease:'back.out(1.6)'
  }, 3.3);

  tl.add(()=>{
    gsap.to('#kaique img', {
      y:-10, duration:2.2, repeat:-1, yoyo:true, ease:'sine.inOut'
    });
  }, 4.4);

  const RAIN_START = 3.6;
  for(let i=0; i<46; i++){
    const t = RAIN_START + i*0.09;
    tl.add(()=> dropToken(0), t);
  }

  /* ── ACT 4 — Logo (5.6–8.0s) ─────────────────────────────────── */
  tl.fromTo('.logo-eyebrow',
    { opacity:0, y:-10, letterSpacing:'0.9em' },
    { opacity:1, y:0,  letterSpacing:'0.55em', duration:0.8 },
    5.6
  );
  tl.fromTo('.logo-pre',
    { opacity:0, y:-10 },
    { opacity:1, y:0, duration:0.7 },
    5.8
  );

  tl.fromTo('.logo-main span',
    { y:-260, rotateX:-90, opacity:0 },
    { y:0,    rotateX:0,   opacity:1, duration:0.55, stagger:0.045, ease:'back.out(2.4)' },
    6.25
  );

  // Slam → flash + shockwave + screen shake
  tl.add(()=> shockwave(), 6.95);
  tl.to('.flash', { opacity:0.7, duration:0.08 }, 6.95);
  tl.to('.flash', { opacity:0,   duration:0.45, ease:'power2.out' }, 7.05);
  tl.fromTo('#intro',
    { x:0, y:0 },
    { x:8, y:6, duration:0.06, repeat:5, yoyo:true, ease:'none' },
    6.95
  );

  tl.to('.logo-underline', { width:'62%', duration:0.9, ease:'power3.out' }, 7.1);
  tl.add(()=> shimmerSweep(), 7.4);

  /* ── ACT 5 — CTA + tagline (8.0–11s) ─────────────────────────── */
  tl.to('#tagline', { opacity:1, duration:0.9 }, 8.2);
  tl.to('#cta',     { opacity:1, y:0, duration:0.8, ease:'back.out(1.8)' }, 9.2);

  tl.add(()=>{
    gsap.to('#cta', {
      boxShadow:'0 14px 50px rgba(255,209,92,0.45), inset 0 0 18px rgba(255,209,92,0.25)',
      duration:1.4, repeat:-1, yoyo:true, ease:'sine.inOut'
    });
  }, 10);

  for(let i=0; i<14; i++){
    tl.add(()=> dropToken(0), 8.5 + i*0.18);
  }

  tl.to({}, { duration:0.6 }, 11.5);

  return tl;
}

/* ── shimmer sweep ──────────────────────────────────────────────────── */
function shimmerSweep(){
  const main = document.querySelector('.logo-main');
  main.classList.add('shimmer');
  const styleId = 'shimmerStyle';
  if(!document.getElementById(styleId)){
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .logo-main.shimmer::after{ animation: sweep 1.4s ease-out 1; opacity:1 !important }
      @keyframes sweep {
        0%   { background-position: 200% 0; opacity:0; }
        20%  { opacity:0.95 }
        100% { background-position: -50% 0; opacity:0; }
      }
    `;
    document.head.appendChild(s);
  }
}

/* ── Skip / timer ───────────────────────────────────────────────────── */
function startTimer(){
  let t = Math.ceil(TL_DUR);
  $('#timer').textContent = t;
  const iv = setInterval(()=>{
    t--;
    if(t<=0){ clearInterval(iv); $('#timer').textContent = '0'; return }
    $('#timer').textContent = t;
  }, 1000);
}

function onIntroEnd(){
  if(REDIRECT_ON_COMPLETE){
    fadeOutTrilha(1200);
    gsap.to('#intro', { opacity:0, duration:1.2, onComplete(){ window.location.href = DESTINO; }});
  }
}

function skip(){
  if(mainTL) mainTL.kill();
  gsap.killTweensOf('*');
  fadeOutTrilha(600);
  gsap.to('#intro', { opacity:0, duration:0.6, onComplete(){
    window.location.href = DESTINO;
  }});
}

function bootIntro(){
  document.querySelectorAll('.token').forEach(t=>t.remove());

  gsap.set('#coin-wrap',{ opacity:0, scale:0.05, top:'50%', filter:'drop-shadow(0 0 40px rgba(255,209,92,0))' });
  gsap.set('#coin',     { rotateY:0 });
  gsap.set('.rays',     { opacity:0 });
  gsap.set('.hex',      { opacity:0 });
  gsap.set('.floor',    { opacity:0 });
  gsap.set('.spotlight',{ opacity:0 });
  gsap.set('.corner',   { opacity:0 });
  gsap.set('.letterbox.top',    { scaleY:0.36 });
  gsap.set('.letterbox.bottom', { scaleY:0.36 });
  gsap.set('#kaique',   { opacity:0, bottom:'-10vh', y:40 });
  gsap.set('.logo-eyebrow',{ opacity:0 });
  gsap.set('.logo-pre', { opacity:0 });
  gsap.set('.logo-main span', { opacity:0, y:-260, rotateX:-90 });
  gsap.set('.logo-underline', { width:0 });
  gsap.set('#tagline',  { opacity:0 });
  gsap.set('#cta',      { opacity:0, y:20 });
  gsap.set('#skip',     { opacity:0 });
  gsap.set('.flash',    { opacity:0 });
  gsap.set('#intro',    { opacity:1, x:0, y:0 });
  const main = document.querySelector('.logo-main');
  if (main) main.classList.remove('shimmer');

  mainTL = buildTimeline();
  startTimer();
  play(trilhaSnd);
}

$('#skip').addEventListener('click', skip);
$('#cta') .addEventListener('click', skip);  // CTA também leva ao destino

window.addEventListener('load', bootIntro);
