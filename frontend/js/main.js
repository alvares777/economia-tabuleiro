// main.js — ponto de entrada; conecta tudo

import { state, initState, toSavePayload, fromLoadResponse, salarioDaRodada } from './state.js';
import { saveGame, loadGame, getQuestions } from './api.js';
import { renderTabuleiro, atualizarPosicoes, getNomeCasa, CASAS_BONUS } from './board.js';
import {
  atualizarIndicadores, mostrarMensagem, mostrarPergunta,
  renderJogadores, renderCofrinhos, renderAcoes, renderBens,
  carregarVariaveis, salvarVariaveis, renderResumo, tocarSom, fmt,
  navPerguntaOperador, irParaPerguntaOperador,
} from './ui.js';

window._navPerguntaOperador  = navPerguntaOperador;
window._irParaPerguntaOperador = irParaPerguntaOperador;

// ── Inicialização ─────────────────────────────────────────────────────────────

let _autoSaveDebounce = null;
let _animando = false;         // bloqueia dado durante animação de movimento
let _esperandoProximo = false; // bloqueia dado até o operador avançar o jogador

function _setEsperandoProximo(val) {
  _esperandoProximo = val;
  window._esperandoProximo = val; // expõe para o script inline do dado
  const btn = document.getElementById('btnDadoRolar');
  if (btn) btn.disabled = val;
}

async function init() {
  initState();

  // Carrega perguntas
  try {
    const { perguntas } = await getQuestions();
    window._perguntas = perguntas.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
  } catch (e) {
    console.warn('Não foi possível carregar perguntas:', e.message);
    window._perguntas = {};
  }

  // Verifica se há gameId na URL
  const params  = new URLSearchParams(location.search);
  const gameId  = params.get('gameId');
  const autoId  = localStorage.getItem('economia_last_game');

  const novoJogo = params.get('new') === '1';
  if (novoJogo) {
    localStorage.removeItem('economia_last_game');
  } else if (gameId) {
    await carregarPartida(state.userId, gameId);
  } else if (autoId) {
    try {
      await carregarPartida(state.userId, autoId);
    } catch {
      console.log('Auto-save não encontrado, iniciando novo jogo');
    }
  }

  renderTabuleiro();
  atualizarIndicadores();
  renderJogadores();
  mostrarPainel('divTabuleiro');
}

async function carregarPartida(userId, gameId) {
  const data = await loadGame(userId, gameId);
  fromLoadResponse(data);
  state.gameId = gameId;
  localStorage.setItem('economia_last_game', gameId);
  renderTabuleiro();
  atualizarIndicadores();
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

function agendarAutoSave() {
  clearTimeout(_autoSaveDebounce);
  _autoSaveDebounce = setTimeout(async () => {
    try {
      const result = await saveGame(toSavePayload());
      state.gameId = result.gameId;
      localStorage.setItem('economia_last_game', result.gameId);
    } catch (e) {
      console.warn('Auto-save falhou:', e.message);
    }
  }, 500);
}

// ── Ações de dado ─────────────────────────────────────────────────────────────

window.rolarDado = function(valor) {
  const sal = salarioDaRodada();
  const ganho = sal * valor;
  const p = state.jogador - 1;
  state.jogadoresDinheiro[p] += ganho;
  tocarSom('moeda');
  mostrarMensagem(`🎲 Dado: <strong>${valor}</strong><br>Salário: R$ ${fmt(sal)}<br>Recebeu: <strong>R$ ${fmt(ganho)}</strong>`, 'ok');
  atualizarIndicadores();
  agendarAutoSave();
};

// ── Fluxo completo dado → pergunta → movimento ────────────────────────────────

// Chamado pelo inline script após a animação do dado
window._onDadoRolado = function(v) {
  // Atualiza display central (dado)
  const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const dadoCentro = document.getElementById('dadoCentro');
  if (dadoCentro) {
    dadoCentro.textContent = FACES[v - 1];
    dadoCentro.classList.remove('acender');
    void dadoCentro.offsetWidth;
    dadoCentro.classList.add('acender');
  }

  // Abre pergunta da sequência e incrementa ponteiro
  const questIdx = state.proximaPergunta;
  state.proximaPergunta = (state.proximaPergunta % 38) + 1;
  const varEl = document.getElementById('varProxPergunta');
  if (varEl) varEl.value = state.proximaPergunta;

  _perguntaComResultado(questIdx,
    () => _modalMovimento(v, true),   // Acertou → dinheiro + movimento
    () => _modalMovimento(v, false)   // Errou   → só movimento
  );
};

// Abre o modal de pergunta no modo "dado" (botões Acertou/Errou)
function _perguntaComResultado(idx, onAcertou, onErrou) {
  if (!window._perguntas || !window._perguntas[idx]) {
    onAcertou(); // sem banco de perguntas → assume acerto
    return;
  }
  const q = window._perguntas[idx];
  document.getElementById('modalPerguntaTexto').innerHTML = `<strong>${q.pergunta}</strong>`;
  document.getElementById('modalRespostaTexto').innerHTML = q.resposta;

  const collapse = document.getElementById('collapseResposta');
  if (collapse) collapse.classList.remove('show');

  // Troca footer para modo resultado e oculta navegação do operador
  document.getElementById('modalPerguntaFooterNormal').style.display    = 'none';
  document.getElementById('modalPerguntaFooterResultado').style.display = '';
  const comboDiv = document.getElementById('comboNavPerguntas');
  if (comboDiv) comboDiv.style.display = 'none';

  const modal = new bootstrap.Modal(document.getElementById('modalPerguntas'));

  const restaurar = () => {
    document.getElementById('modalPerguntaFooterNormal').style.display    = '';
    document.getElementById('modalPerguntaFooterResultado').style.display = 'none';
  };

  const elModal = document.getElementById('modalPerguntas');

  document.getElementById('btnQAcertou').onclick = () => {
    restaurar();
    elModal.addEventListener('hidden.bs.modal', () => onAcertou(), { once: true });
    modal.hide();
  };
  document.getElementById('btnQErrou').onclick = () => {
    restaurar();
    elModal.addEventListener('hidden.bs.modal', () => onErrou(), { once: true });
    modal.hide();
  };

  modal.show();
  tocarSom('pergunta');
}

let _movimentoUsado = false; // flag JS puro — imune à transição CSS do Bootstrap

// Abre modal de movimento; comDinheiro=true → jogador acertou a pergunta
function _modalMovimento(v, comDinheiro) {
  _movimentoUsado = false; // nova rodada: libera o uso

  const p   = state.jogador - 1;
  const sal = salarioDaRodada();
  const ganho = sal * v;

  document.getElementById('valorDadoModal').textContent = v;

  const corpo = document.querySelector('#modalMovimento .modal-body p');
  if (corpo) {
    corpo.innerHTML = comDinheiro
      ? `✅ Acertou! Ganhará <strong>R$ ${fmt(ganho)}</strong> ao avançar. Para onde vai?`
      : `❌ Não acertou. Nenhum dinheiro desta vez. Escolha como movimentar.`;
  }

  const btnSo = document.getElementById('btnSoDinheiro');
  if (btnSo) btnSo.style.display = comDinheiro ? '' : 'none';

  const m = new bootstrap.Modal(document.getElementById('modalMovimento'));

  document.getElementById('btnAvancar').onclick = () => {
    if (_movimentoUsado) return;
    _movimentoUsado = true;
    window._valorDadoAtual = 0; // impede que navbar use o mesmo valor
    m.hide();
    if (comDinheiro) {
      state.jogadoresDinheiro[p] += ganho;
      tocarSom('moeda');
      atualizarIndicadores();
      agendarAutoSave();
    }
    window.avancarJogador(v);
  };

  document.getElementById('btnVoltar').onclick = () => {
    if (_movimentoUsado) return;
    _movimentoUsado = true;
    window._valorDadoAtual = 0; // impede que navbar use o mesmo valor
    m.hide();
    window.voltarJogador(v);
  };

  if (btnSo) {
    btnSo.onclick = () => {
      if (_movimentoUsado) return;
      _movimentoUsado = true;
      window._valorDadoAtual = 0; // impede que navbar use o mesmo valor
      m.hide();
      window.rolarDado(v); // dá o dinheiro via rolarDado e mostra mensagem
    };
  }

  m.show();
}

// Anima o pião do jogador p, avançando/voltando totalCasas casas em frameCount passos visuais.
// Usa no máx. 12 frames para não demorar mais de ~2s mesmo com movimentos grandes.
function animarMovimento(p, totalCasas, direcao, onFim) {
  if (totalCasas <= 0) { onFim(); return; }

  const btnDado = document.getElementById('btnDadoRolar');
  if (btnDado) btnDado.disabled = true;
  _animando = true;

  const FRAMES   = Math.min(totalCasas, 12);
  const STEP_MS  = FRAMES <= 6 ? 210 : 130;
  const startPos = state.jogadoresPosicao[p];
  let frame = 0;

  function proximo() {
    frame++;
    // Posição proporcional ao frame atual (distribui as casas uniformemente)
    const casasAcumuladas = Math.round(frame * totalCasas / FRAMES);
    state.jogadoresPosicao[p] = ((startPos + casasAcumuladas * direcao) % 64 + 64) % 64;
    atualizarPosicoes(p); // p recebe classe piao-movendo → salto CSS

    if (frame < FRAMES) {
      setTimeout(proximo, STEP_MS);
    } else {
      setTimeout(() => {
        _animando = false;
        if (btnDado) btnDado.disabled = false;
        onFim();
      }, STEP_MS);
    }
  }

  proximo();
}

window.avancarJogador = function(valor) {
  if (_animando) return;
  const p     = state.jogador - 1;
  const casas = valor; // movimento = valor do dado (1–6); dinheiro é calculado separadamente
  animarMovimento(p, casas, +1, () => {
    processarCasa(p);
    atualizarPosicoes();
    atualizarIndicadores();
    _setEsperandoProximo(true);
    mostrarPainel('divCofrinhos'); // RN-11: abrir cofrinhos após movimento
    agendarAutoSave();
  });
};

window.voltarJogador = function(valor) {
  if (_animando) return;
  const p     = state.jogador - 1;
  const casas = Math.min(valor, state.jogadoresPosicao[p]); // nunca passa da posição 0
  animarMovimento(p, casas, -1, () => {
    processarCasa(p);
    atualizarPosicoes();
    atualizarIndicadores();
    _setEsperandoProximo(true);
    mostrarPainel('divCofrinhos'); // RN-11: abrir cofrinhos após movimento
    agendarAutoSave();
  });
};

window.soDinheiro = function(valor) {
  window.rolarDado(valor);
};

function processarCasa(p) {
  const pos  = state.jogadoresPosicao[p];
  const nome = getNomeCasa(pos);
  const bonus = CASAS_BONUS[pos];

  if (bonus !== 0) {
    const sal = salarioDaRodada();
    const val = Math.abs(bonus) * sal;
    if (bonus > 0) {
      state.jogadoresDinheiro[p] += val;
      mostrarMensagem(`🎉 ${nome}<br>Recebeu: <strong>R$ ${fmt(val)}</strong>`, 'ok');
      tocarSom('bom');
    } else {
      state.jogadoresDinheiro[p] = Math.max(0, state.jogadoresDinheiro[p] - val);
      mostrarMensagem(`😢 ${nome}<br>Pagou: <strong>R$ ${fmt(val)}</strong>`, 'erro');
      tocarSom('ruim');
    }
  } else if (nome === 'ESTRELA') {
    const bônus = salarioDaRodada() * 5;
    state.jogadoresDinheiro[p] += bônus;
    mostrarMensagem(`⭐ ESTRELA!<br>Recebeu: <strong>R$ ${fmt(bônus)}</strong>`, 'ok');
    tocarSom('bom');
  } else if (nome === 'INQUEBRÁVEIS') {
    mostrarPergunta(state.proximaPergunta);
    state.proximaPergunta = (state.proximaPergunta % 38) + 1;
  } else if (nome === 'Joga de novo') {
    _setEsperandoProximo(false); // jogador rola o dado novamente sem trocar de vez
    mostrarMensagem('🎲 Joga de novo! Role o dado mais uma vez.', 'ok');
    tocarSom('bom');
  }
}

// ── Próximo jogador / rodada ──────────────────────────────────────────────────

window.proximoJogador = function() {
  // RN-02 a RN-04: cobranças de fim de turno
  cobrarCustosBens();
  cobrarJuros();
  receberDividendos();

  let proximo = state.jogador;
  do {
    proximo = proximo >= state.qtJogadores ? 1 : proximo + 1;
    if (proximo === state.jogador) break;
  } while (state.jogadoresPresentes[proximo - 1] !== 'S');

  if (proximo <= state.jogador) {
    state.rodada++;
    if (state.rodada > state.rodadas) {
      state.fim = true;
      tocarSom('fim');
      mostrarMensagem('🏆 Fim de jogo!<br>Verifique o ranking final no painel Resumo.', 'ok');
    }
  }

  state.jogador = proximo;
  _setEsperandoProximo(false);
  atualizarPosicoes(); // atualiza pião ativo + centro
  atualizarIndicadores();
  renderResumo();
  agendarAutoSave();
};

// Navegação para o jogador anterior (sem cobranças de fim de turno)
window.anteriorJogador = function() {
  let anterior = state.jogador;
  do {
    anterior = anterior <= 1 ? state.qtJogadores : anterior - 1;
    if (anterior === state.jogador) break;
  } while (state.jogadoresPresentes[anterior - 1] !== 'S');
  state.jogador = anterior;
  atualizarPosicoes();
  atualizarIndicadores();
};

function cobrarCustosBens() {
  const p = state.jogador - 1;
  let total = 0;
  for (let b = 0; b < 4; b++) {
    const qty = state.jogadoresBens[p][b];
    if (qty > 0) {
      total += qty * state.valorBem[b] * (state.despesaBem[b] / 100);
    }
  }
  if (total > 0) state.jogadoresDinheiro[p] = Math.max(0, state.jogadoresDinheiro[p] - total);
}

function cobrarJuros() {
  const p = state.jogador - 1;
  const juros = state.jogadoresEmprestimos[p] * (state.juros / 100);
  if (juros > 0) state.jogadoresDinheiro[p] = Math.max(0, state.jogadoresDinheiro[p] - juros);
}

function receberDividendos() {
  const p = state.jogador - 1;
  let total = 0;
  for (let a = 0; a < 5; a++) {
    const qty = state.jogadoresAcoes[p][a];
    if (qty > 0) {
      total += qty * (state.dividendos[a] / 100) * state.valorAcao[a];
    }
  }
  if (total > 0) state.jogadoresDinheiro[p] += total;
}

// ── Operações de jogador ──────────────────────────────────────────────────────

window.renomearJogador = function(p, nome) {
  state.jogadores[p] = nome;
  atualizarIndicadores();
};

window.togglePresente = function(p, presente) {
  state.jogadoresPresentes[p] = presente ? 'S' : 'N';
};

window.depositarCofrinho = function(c) {
  const input = document.getElementById(`depositoCofrinho${c}`);
  const valor = parseFloat(input?.value) || 0;
  if (valor <= 0) return;
  if (valor > state.jogadoresDinheiro[state.jogador - 1]) {
    mostrarMensagem('Saldo insuficiente!', 'erro');
    return;
  }
  const p = state.jogador - 1;
  const r = state.rodada - 1;
  state.jogadoresCofrinhos[p][c][r] += valor;
  state.jogadoresDinheiro[p] -= valor;
  if (input) input.value = 0;
  renderCofrinhos();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.comprarAcao = function(a) {
  const p   = state.jogador - 1;
  const val = state.valorAcao[a];
  if (state.jogadoresDinheiro[p] < val) { mostrarMensagem('Saldo insuficiente!', 'erro'); return; }
  state.jogadoresDinheiro[p] -= val;
  state.jogadoresAcoes[p][a]++;
  renderAcoes();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.venderAcao = function(a) {
  const p = state.jogador - 1;
  if (state.jogadoresAcoes[p][a] <= 0) return;
  state.jogadoresAcoes[p][a]--;
  state.jogadoresDinheiro[p] += state.valorAcao[a];
  renderAcoes();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.comprarBem = function(b) {
  const p   = state.jogador - 1;
  const val = state.valorBem[b];
  if (state.jogadoresDinheiro[p] < val) { mostrarMensagem('Saldo insuficiente!', 'erro'); return; }
  state.jogadoresDinheiro[p] -= val;
  state.jogadoresBens[p][b]++;
  renderBens();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.devolverBem = function(b) {
  const p = state.jogador - 1;
  if (state.jogadoresBens[p][b] <= 0) return;
  state.jogadoresBens[p][b]--;
  state.jogadoresDinheiro[p] += state.valorBem[b] * 0.5; // devolve 50%
  renderBens();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.emprestarDinheiro = function() {
  const valor = parseFloat(prompt('Valor do empréstimo:') || 0);
  if (!valor || valor <= 0) return;
  const p = state.jogador - 1;
  state.jogadoresEmprestimos[p] += valor;
  state.jogadoresDinheiro[p]    += valor;
  atualizarIndicadores();
  agendarAutoSave();
};

window.pagarEmprestimo = function() {
  const p = state.jogador - 1;
  const deve = state.jogadoresEmprestimos[p];
  if (deve <= 0) { mostrarMensagem('Sem dívidas!', 'ok'); return; }
  const valor = parseFloat(prompt(`Pagar quanto? (Deve: R$ ${fmt(deve)}):`) || 0);
  if (!valor || valor <= 0) return;
  const pago = Math.min(valor, state.jogadoresDinheiro[p]);
  state.jogadoresEmprestimos[p] = Math.max(0, deve - pago);
  state.jogadoresDinheiro[p]    = Math.max(0, state.jogadoresDinheiro[p] - pago);
  atualizarIndicadores();
  agendarAutoSave();
};

// ── Salvar / Carregar ─────────────────────────────────────────────────────────

window.salvarJogo = async function() {
  try {
    const result = await saveGame(toSavePayload());
    state.gameId = result.gameId;
    localStorage.setItem('economia_last_game', result.gameId);
    mostrarMensagem('✅ Jogo salvo com sucesso!', 'ok');
  } catch (e) {
    mostrarMensagem(`❌ Erro ao salvar: ${e.message}`, 'erro');
  }
};

window.irParaLista = function() {
  location.href = '/lista.html';
};

window.confirmarNovaPartida = function() {
  if (confirm('Iniciar uma partida do zero? O jogo atual não será perdido — você poderá voltar por "Minhas Partidas".')) {
    location.href = '/?new=1';
  }
};

// ── Controle de painéis ───────────────────────────────────────────────────────

const PAINEIS = ['divTabuleiro', 'divRodadas', 'divCofrinhos', 'divAcoes', 'divBens', 'divVariaveis', 'divJogadores'];

export function mostrarPainel(id) {
  // Persiste variáveis automaticamente ao sair do painel de configuração
  const painelAtivo = PAINEIS.find(p => document.getElementById(p)?.style.display === 'block');
  if (painelAtivo === 'divVariaveis' && id !== 'divVariaveis') {
    salvarVariaveis();
    if (state.jogador > state.qtJogadores) state.jogador = 1;
  }

  PAINEIS.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? 'block' : 'none';
  });

  if (id === 'divCofrinhos')  renderCofrinhos();
  if (id === 'divAcoes')      renderAcoes();
  if (id === 'divBens')       renderBens();
  if (id === 'divJogadores')  renderJogadores();
  if (id === 'divRodadas')    renderResumo();
  if (id === 'divVariaveis')  carregarVariaveis();
}

window.mostrarPainel = mostrarPainel;

window.fecharVariaveis = function() {
  salvarVariaveis();
  if (state.jogador > state.qtJogadores) state.jogador = 1;
  mostrarPainel('divTabuleiro');
  renderTabuleiro();
  atualizarIndicadores();
};

// ── Pergunta avulsa ───────────────────────────────────────────────────────────

window.fazerPergunta = function() {
  mostrarPergunta(state.proximaPergunta);
  state.proximaPergunta = (state.proximaPergunta % 38) + 1;
};

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
