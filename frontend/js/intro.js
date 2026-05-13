// intro.js — animação da tela de introdução (requer GSAP carregado antes)

const DESTINO = '/lista.html';

const riquezas = [
  '💰','💎','🪙','💵','🏆',
  '📈','💳','👑','🏦','📊',
  '🧾','💲','🎲','🏠','⭐',
];

const coinSound = document.getElementById('coinSound');

// ── Timeline principal ────────────────────────────────────────────────────────

const tl = gsap.timeline({ onComplete: encerrar });

// Título aparece
tl.to('#titulo', { opacity: 1, duration: 1.8 });

// Cofre abre
tl.to('#porta', { rotate: -130, duration: 2.5, ease: 'power2.inOut' });

// Patinhas entra
tl.to('#patinhas', { left: '6vw', duration: 3.5, ease: 'power3.out' });

// Subtítulo aparece junto com a entrada
tl.to('#subtitulo', { opacity: 1, duration: 1.8 }, '-=2');

// Chuva de riqueza: 40 itens
for (let i = 0; i < 40; i++) {
  tl.call(criarRiqueza);
  tl.to({}, { duration: 0.28 });
}

// Celebração: Patinhas pula
tl.to('#patinhas', { scale: 1.09, duration: 0.35, repeat: 6, yoyo: true });

// Frase final
tl.to('#subtitulo', { opacity: 0, duration: 0.8 });
tl.to('#subtitulo', {
  opacity: 1,
  duration: 1.5,
  onStart() {
    document.getElementById('subtitulo').textContent =
      'Estratégia, bom senso e perseverança definem quem vence.';
  },
});

// Fade out geral
tl.to('#intro', { opacity: 0, duration: 2.5, delay: 3 });

// ── Funções ───────────────────────────────────────────────────────────────────

function criarRiqueza() {
  const item = document.createElement('div');
  item.className = 'riqueza';
  item.textContent = riquezas[Math.floor(Math.random() * riquezas.length)];
  document.body.appendChild(item);

  const startX = Math.random() * window.innerWidth;
  const endX   = window.innerWidth  / 2 + (Math.random() * 400 - 200);
  const endY   = window.innerHeight / 2 + (Math.random() * 220 - 110);

  gsap.set(item, { left: startX, top: -80, scale: 0.4 });
  gsap.to(item, { opacity: 1, scale: 1.2, duration: 0.25 });
  gsap.to(item, {
    left: endX, top: endY,
    rotation: 720,
    duration: 1.8,
    ease: 'power3.in',
    onStart() {
      if (coinSound) { coinSound.currentTime = 0; coinSound.play().catch(() => {}); }
    },
    onComplete() { explosao(endX, endY); item.remove(); },
  });
}

function explosao(x, y) {
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('div');
    p.className = 'particula';
    document.body.appendChild(p);
    gsap.set(p, { left: x, top: y });
    gsap.to(p, {
      x: Math.random() * 280 - 140,
      y: Math.random() * 280 - 140,
      opacity: 0, scale: 0,
      duration: 1.8,
      onComplete: () => p.remove(),
    });
  }
}

function encerrar() {
  window.location.href = DESTINO;
}

// ── Botão Pular ───────────────────────────────────────────────────────────────

document.getElementById('pular').addEventListener('click', () => {
  gsap.killTweensOf('*');
  gsap.to('#intro', {
    opacity: 0, duration: 0.8,
    onComplete: encerrar,
  });
});
