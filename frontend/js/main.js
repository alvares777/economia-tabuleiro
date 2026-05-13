// main.js — ponto de entrada; conecta tudo

import { state, initState, toSavePayload, fromLoadResponse, salarioDaRodada, calcCofrinho, calcValorMercadoBem } from './state.js';
import { saveGame, loadGame, getQuestions, apiGetActiveUsers } from './api.js';
import { requireLogin, getUser, isAdmin, logout } from './auth.js';
import { renderTabuleiro, atualizarPosicoes, atualizarDonos, atualizarCentro, getNomeCasa, CASAS_BONUS, COR_JOGADOR, LEGENDA_CASAS } from './board.js';
import {
  atualizarIndicadores, mostrarMensagem, mostrarPergunta,
  renderJogadores, renderCofrinhos, renderAcoes, renderBens,
  carregarVariaveis, salvarVariaveis, renderResumo, renderExtrato, tocarSom, fmt,
  navPerguntaOperador, irParaPerguntaOperador, getPerguntaAtualOperador,
} from './ui.js';

window._navPerguntaOperador    = navPerguntaOperador;
window._irParaPerguntaOperador = irParaPerguntaOperador;
window._state                  = state;
window._calcValorMercadoBem    = calcValorMercadoBem;
window._legendaCasas           = LEGENDA_CASAS;

// ── Inicialização ─────────────────────────────────────────────────────────────

let _autoSaveDebounce = null;
let _animando = false;
let _esperandoProximo = false;

// Qual pergunta foi feita no turno atual e se acertou (para registrar no extrato)
let _ultimaPerguntaDado = { perguntaId: null, acertou: null };

// Pendência de INQUEBRÁVEIS: jogador deve aplicar ≥70% do saldo em cofrinhos antes de avançar
let _pendingInquebraveis = null; // { player, minimo, cofrinhosTotaisAntes }

// Pendência de BOLSA: jogador deve operar na bolsa antes de passar a vez
let _pendingBolsa = null; // { player, tipo: 'verde'|'vermelho'|null, qtdAntes }

function _somarTotalAcoesQtd(p) {
  return (state.jogadoresAcoes?.[p] || []).reduce((s, q) => s + q, 0);
}

function _somarCofrinhoRodadaAtual(p) {
  const r = state.rodada - 1;
  let total = 0;
  for (let c = 0; c < 4; c++) total += state.jogadoresCofrinhos[p][c][r] || 0;
  return total;
}

const _MSG_INQUEBRAVEIS = 'Você pode ser inquebrável economicamente falando! Mas para isso você precisa aplicar no mínimo 70% do seu saldo atual em Cofrinhos';

const _NOMES_COF = ['Emergências', 'Sonhos', 'Aposentadoria', 'Doações'];

function _setEsperandoProximo(val) {
  _esperandoProximo = val;
  window._esperandoProximo = val;
  const jogoEncerrado = !!state.fim;
  const btnDado = document.getElementById('btnDadoRolar');
  if (btnDado) btnDado.disabled = jogoEncerrado || val;
  const btnFim = document.getElementById('btnFim');
  if (btnFim) btnFim.disabled = jogoEncerrado || !val;
  // Após cada movimento, sincroniza a vista ao jogador ativo
  // para garantir que o painel de Cofrinhos mostra o jogador certo
  if (val) {
    state.vista = state.jogador;
    atualizarIndicadores();
  }
}

async function init() {
  if (!requireLogin()) return;

  const user = getUser();
  state.userId = user.id;

  // Popula o ícone de perfil na navbar
  _renderNavPerfil(user);

  // Adiciona item de menu "Usuários" se for admin
  if (isAdmin()) {
    const menuList = document.querySelector('.dropdown-menu.dropdown-menu-dark');
    if (menuList) {
      const hr  = document.createElement('li');
      hr.innerHTML = '<hr class="dropdown-divider">';
      const li  = document.createElement('li');
      li.innerHTML = '<a class="dropdown-item text-info" href="/usuarios.html">👥 Usuários</a>';
      menuList.appendChild(hr);
      menuList.appendChild(li);
    }
  }

  initState();

  // Carrega usuários ativos para seleção de jogadores
  try {
    window._systemUsers = await apiGetActiveUsers();
  } catch {
    window._systemUsers = [];
  }

  try {
    const { perguntas } = await getQuestions();
    window._perguntas = perguntas.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
  } catch (e) {
    console.warn('Não foi possível carregar perguntas:', e.message);
    window._perguntas = {};
  }

  const params   = new URLSearchParams(location.search);
  const gameId   = params.get('gameId');
  const autoId   = localStorage.getItem('economia_last_game');
  const novoJogo = params.get('new') === '1';

  if (novoJogo) {
    localStorage.removeItem('economia_last_game');
  } else if (gameId) {
    await carregarPartida(gameId);
  } else if (autoId) {
    try {
      await carregarPartida(autoId);
    } catch {
      console.log('Auto-save não encontrado, iniciando novo jogo');
    }
  }

  renderTabuleiro();
  atualizarIndicadores();
  renderJogadores();
  mostrarPainel('divTabuleiro');
  if (!state.fim) _iniciarCronometro(state.tempo * 60);
}

function _renderNavPerfil(user) {
  const nav = document.getElementById('navBtnPerfil');
  if (!nav) return;
  if (user.foto) {
    nav.innerHTML = `<img src="${user.foto}" alt="Perfil" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);">`;
  } else {
    const iniciais = (user.nome || 'U').slice(0, 1).toUpperCase();
    nav.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#3498db;color:#fff;font-weight:700;font-size:0.85rem;border:2px solid rgba(255,255,255,0.6);">${iniciais}</span>`;
  }
}

async function carregarPartida(gameId) {
  const data = await loadGame(gameId);
  fromLoadResponse(data);
  state.gameId = gameId;
  localStorage.setItem('economia_last_game', gameId);
  renderTabuleiro();
  atualizarIndicadores();
  if (!state.fim) _iniciarCronometro(state.tempo * 60);
}

// ── Cronômetro ────────────────────────────────────────────────────────────────

let _cronoInterval = null;
let _cronoTotal    = 0;
let _cronoRestante = 0;

function _cronoFmt(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function _cronoAplicarAlerta(restante, total) {
  const el    = document.getElementById('cronometro');
  const frame = document.querySelector('.tabuleiro-frame');
  const pct   = total > 0 ? restante / total : 1;
  el?.classList.remove('cronometro-amarelo', 'cronometro-vermelho');
  frame?.classList.remove('alerta-amarelo', 'alerta-vermelho');
  if (pct <= 0.10) {
    const min = Math.ceil(restante / 60);
    el?.setAttribute('title', `Faltam apenas ${min} minuto${min !== 1 ? 's' : ''} para encerrar automaticamente a partida`);
    el?.classList.add('cronometro-vermelho');
    frame?.classList.add('alerta-vermelho');
  } else if (pct <= 0.25) {
    const min = Math.ceil(restante / 60);
    el?.setAttribute('title', `Faltam apenas ${min} minuto${min !== 1 ? 's' : ''} para encerrar automaticamente a partida`);
    el?.classList.add('cronometro-amarelo');
    frame?.classList.add('alerta-amarelo');
  } else {
    el?.removeAttribute('title');
  }
}

function _cronoTick() {
  if (state.fim) { _pararCronometro(); return; }
  _cronoRestante--;
  const el = document.getElementById('cronometro');
  if (el) el.textContent = _cronoFmt(_cronoRestante);
  _cronoAplicarAlerta(_cronoRestante, _cronoTotal);
  if (_cronoRestante <= 0) {
    _pararCronometro();
    const prorrogar = confirm('⏰ O tempo acabou!\n\nDeseja prorrogar o jogo por mais 10 minutos?');
    if (prorrogar) {
      state.tempo += 10;
      agendarAutoSave();
      _iniciarCronometro(10 * 60);
    } else {
      state.fim = true;
      tocarSom('fim');
      mostrarMensagem('⏰ Tempo esgotado!<br>🏆 Fim de jogo!<br>Verifique o ranking final no painel Resumo.', 'ok');
      _setEsperandoProximo(false);
      renderResumo();
      mostrarPainel('divRodadas');
      agendarAutoSave();
    }
  }
}

function _pararCronometro() {
  clearInterval(_cronoInterval);
  _cronoInterval = null;
  document.getElementById('cronometro')?.classList.remove('cronometro-amarelo', 'cronometro-vermelho');
  document.querySelector('.tabuleiro-frame')?.classList.remove('alerta-amarelo', 'alerta-vermelho');
}

function _iniciarCronometro(segInicial) {
  _pararCronometro();
  _cronoTotal    = segInicial;
  _cronoRestante = segInicial;
  const el = document.getElementById('cronometro');
  if (el) el.textContent = _cronoFmt(_cronoRestante);
  _cronoAplicarAlerta(_cronoRestante, _cronoTotal);
  _cronoInterval = setInterval(_cronoTick, 1000);
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

// ── Registro de eventos (conta corrente) ─────────────────────────────────────

function _registrarEvento(p, tipo, params = {}) {
  state.extrato.push({
    jogador:       p,
    rodada:        state.rodada,
    tipo,
    descricao:     params.descricao ?? '',
    valor:         params.valor ?? 0,
    dadoValor:     params.dadoValor ?? null,
    perguntaId:    params.perguntaId ?? null,
    acertou:       params.acertou ?? null,
    cofrinhoIdx:   params.cofrinhoIdx ?? null,
    bemIdx:        params.bemIdx ?? null,
    acaoIdx:       params.acaoIdx ?? null,
    salarioRodada: salarioDaRodada(),
    peJuros:       state.juros,
    peRendimento:  state.rendimento,
    peImpostos:    state.taxaImpostos,
    vlIncremento:  state.incremento,
    saldoAntes:    params.saldoAntes ?? 0,
    saldoDepois:   state.jogadoresDinheiro[p],
    dividaAntes:   params.dividaAntes ?? state.jogadoresEmprestimos[p],
    dividaDepois:  state.jogadoresEmprestimos[p],
  });
}

// ── Ações de dado ─────────────────────────────────────────────────────────────

window.rolarDado = function(valor) {
  const sal = salarioDaRodada();
  const ganho = sal * valor;
  const p = state.jogador - 1;
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresDinheiro[p] += ganho;
  _registrarEvento(p, 'SALARIO_DADO', {
    descricao: `Dado ${valor} × Sal R$${fmt(sal)} = +R$${fmt(ganho)}`,
    valor: ganho,
    dadoValor: valor,
    perguntaId: _ultimaPerguntaDado.perguntaId,
    acertou:    _ultimaPerguntaDado.acertou,
    saldoAntes,
  });
  _ultimaPerguntaDado = { perguntaId: null, acertou: null };
  tocarSom('moeda');
  mostrarMensagem(`🎲 Dado: <strong>${valor}</strong><br>Salário: R$ ${fmt(sal)}<br>Recebeu: <strong>R$ ${fmt(ganho)}</strong>`, 'ok');
  atualizarIndicadores();
  agendarAutoSave();
};

// ── Fluxo completo dado → pergunta → movimento ────────────────────────────────

window._onDadoRolado = function(v) {
  const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const dadoCentro = document.getElementById('dadoCentro');
  if (dadoCentro) {
    dadoCentro.textContent = FACES[v - 1];
    dadoCentro.classList.remove('acender');
    void dadoCentro.offsetWidth;
    dadoCentro.classList.add('acender');
  }

  const questIdx = state.proximaPergunta;
  state.proximaPergunta = (state.proximaPergunta % 38) + 1;
  const varEl = document.getElementById('varProxPergunta');
  if (varEl) varEl.value = state.proximaPergunta;

  _perguntaComResultado(questIdx,
    () => { _ultimaPerguntaDado = { perguntaId: questIdx, acertou: true };  _modalMovimento(v, true); },
    () => { _ultimaPerguntaDado = { perguntaId: questIdx, acertou: false }; _modalMovimento(v, false); }
  );
};

function _perguntaComResultado(idx, onAcertou, onErrou) {
  if (!window._perguntas || !window._perguntas[idx]) {
    onAcertou();
    return;
  }
  const q = window._perguntas[idx];
  document.getElementById('modalPerguntaTexto').innerHTML = `<strong>${q.pergunta}</strong>`;
  document.getElementById('modalRespostaTexto').innerHTML = q.resposta;

  const collapse = document.getElementById('collapseResposta');
  if (collapse) collapse.classList.remove('show');

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

let _movimentoUsado = false;

function _modalMovimento(v, comDinheiro) {
  _movimentoUsado = false;

  const p   = state.jogador - 1;

  // Ações de Energia (índice 1) dobram o valor do dado
  const temEnergia = (state.jogadoresAcoes?.[p]?.[1] ?? 0) > 0;
  if (temEnergia) v = v * 2;
  const energiaBadge  = document.getElementById('energiaBonus');
  const energiaAlerta = document.getElementById('energiaAlerta');
  if (energiaBadge)  energiaBadge.style.display  = temEnergia ? '' : 'none';
  if (energiaAlerta) energiaAlerta.style.display  = temEnergia ? '' : 'none';

  const sal = salarioDaRodada();

  // Ações de Banco (índice 0) — opção de receber o número da casa atual sem mover
  // Disponível a cada 2 rodadas (suspensa na rodada seguinte ao uso)
  const temBanco        = (state.jogadoresAcoes?.[p]?.[0] ?? 0) > 0;
  const posAtual        = state.jogadoresPosicao[p];
  const bancoUsoRod     = state.jogadoresBancoUso?.[p] ?? null;
  const bancoDisponivel = bancoUsoRod === null || state.rodada >= bancoUsoRod + 2;
  const bancoEl         = document.getElementById('bancoOpcao');
  const bancoTexto      = document.getElementById('bancoOpcaoTexto');
  if (temBanco && bancoDisponivel && comDinheiro) {
    const valBanco = posAtual;
    const nomeCasa = getNomeCasa(posAtual) || `casa ${posAtual}`;
    if (bancoTexto) bancoTexto.innerHTML =
      `Acertou! Receba <strong>R$&nbsp;${fmt(valBanco)}</strong> na casa <em>${nomeCasa}</em> (pos.&nbsp;${posAtual}) sem se mover. <span class="text-warning small">(opção suspensa na próxima rodada)</span>`;
    if (bancoEl) bancoEl.style.display = '';
    window._bancoPending = { p, valBanco, comDinheiro };
  } else {
    if (bancoEl) bancoEl.style.display = 'none';
    window._bancoPending = null;
  }

  // Verifica se o destino é uma casa Estrela (EST) → dado × salário × 3
  const landingPos  = ((state.jogadoresPosicao[p] + v) % 64 + 64) % 64;
  const isEstrela   = comDinheiro && getNomeCasa(landingPos) === 'EST';
  const ganho       = sal * v * (isEstrela ? 3 : 1);

  document.getElementById('valorDadoModal').textContent = v;

  const corpo = document.getElementById('modalMovimentoTexto');
  if (corpo) {
    corpo.innerHTML = comDinheiro
      ? isEstrela
        ? `✅ Acertou! ⭐ Casa Estrela — Dado ${v} × Salário × 3 = <strong>R$ ${fmt(ganho)}</strong> ao avançar. Para onde vai?`
        : `✅ Acertou! Ganhará <strong>R$ ${fmt(ganho)}</strong> ao avançar. Para onde vai?`
      : `❌ Não acertou. Nenhum dinheiro desta vez. Escolha como movimentar.`;
  }

  const btnSo = document.getElementById('btnSoDinheiro');
  if (btnSo) btnSo.style.display = comDinheiro ? '' : 'none';

  const m = new bootstrap.Modal(document.getElementById('modalMovimento'));

  document.getElementById('btnAvancar').onclick = () => {
    if (_movimentoUsado) return;
    _movimentoUsado = true;
    window._valorDadoAtual = 0;
    window._syncBotoesMovimento?.();
    m.hide();
    const saldoAntes = state.jogadoresDinheiro[p];
    if (comDinheiro) {
      state.jogadoresDinheiro[p] += ganho;
      tocarSom('moeda');
      atualizarIndicadores();
      agendarAutoSave();
    }
    _registrarEvento(p, comDinheiro ? 'SALARIO_DADO' : 'MOVIMENTO', {
      descricao: comDinheiro
        ? isEstrela
          ? `⭐ Estrela: Dado ${v} × Sal R$${fmt(sal)} × 3 = +R$${fmt(ganho)}`
          : `Dado ${v} × Sal R$${fmt(sal)} = +R$${fmt(ganho)} (avançou)`
        : `Avançou ${v} casas`,
      valor: comDinheiro ? ganho : 0,
      dadoValor: v,
      perguntaId: _ultimaPerguntaDado.perguntaId,
      acertou:    _ultimaPerguntaDado.acertou,
      saldoAntes,
    });
    _ultimaPerguntaDado = { perguntaId: null, acertou: null };
    window.avancarJogador(v);
  };

  document.getElementById('btnVoltar').onclick = () => {
    if (_movimentoUsado) return;

    const perdaSalario = comDinheiro ? ganho : 0;
    let msg = `⚠️ Ao voltar, o salário da rodada não será aplicado.\n\n`;
    if (perdaSalario > 0) {
      const descMult = isEstrela
        ? ` (dado ${v} × salário R$ ${fmt(sal)} × 3 ⭐ Casa Estrela)`
        : ` (dado ${v} × salário R$ ${fmt(sal)})`;
      msg += `Se avançasse ${v} casa${v > 1 ? 's' : ''}, você receberia R$ ${fmt(perdaSalario)}`
           + descMult + `.\n\n`
           + `Ao voltar você perderá esse valor.\n\n`;
    } else {
      msg += `Você não acertou a pergunta, portanto não receberia salário ao avançar.\n\n`;
    }
    msg += `Confirma que deseja voltar ${v} casa${v > 1 ? 's' : ''}?`;

    if (!confirm(msg)) return;

    _movimentoUsado = true;
    window._valorDadoAtual = 0;
    window._syncBotoesMovimento?.();
    m.hide();
    const saldoAntes = state.jogadoresDinheiro[p];
    _registrarEvento(p, 'MOVIMENTO', {
      descricao: `Voltou ${v} casas`,
      valor: 0,
      dadoValor: v,
      perguntaId: _ultimaPerguntaDado.perguntaId,
      acertou:    _ultimaPerguntaDado.acertou,
      saldoAntes,
    });
    _ultimaPerguntaDado = { perguntaId: null, acertou: null };
    window.voltarJogador(v);
  };

  if (btnSo) {
    btnSo.onclick = () => {
      if (_movimentoUsado) return;
      _movimentoUsado = true;
      window._valorDadoAtual = 0;
      window._syncBotoesMovimento?.();
      m.hide();
      window.rolarDado(v);
    };
  }

  m.show();
}

// Banco: jogador opta por pegar valor absoluto da casa atual sem mover
window._bancoPegarCasa = function() {
  if (_movimentoUsado) return;
  const bp = window._bancoPending;
  if (!bp) return;
  _movimentoUsado = true;
  window._bancoPending = null;
  window._valorDadoAtual = 0;
  window._syncBotoesMovimento?.();

  const modal = bootstrap.Modal.getInstance(document.getElementById('modalMovimento'));
  if (modal) modal.hide();

  const { p, valBanco, comDinheiro } = bp;
  const saldoAntes = state.jogadoresDinheiro[p];

  if (comDinheiro) {
    state.jogadoresDinheiro[p] += valBanco;
    tocarSom('moeda');
  }

  _registrarEvento(p, 'BANCO_CASA', {
    descricao: comDinheiro
      ? `🏦 Banco: +R$${fmt(valBanco)} da casa ${state.jogadoresPosicao[p]} (ficou)`
      : `🏦 Banco: ficou na casa ${state.jogadoresPosicao[p]} sem mover (errou)`,
    valor: comDinheiro ? valBanco : 0,
    perguntaId: _ultimaPerguntaDado?.perguntaId ?? null,
    acertou:    _ultimaPerguntaDado?.acertou ?? null,
    saldoAntes,
    saldoDepois: state.jogadoresDinheiro[p],
  });
  _ultimaPerguntaDado = { perguntaId: null, acertou: null };

  // Registra rodada do uso para suspender a opção na próxima rodada
  if (!state.jogadoresBancoUso) state.jogadoresBancoUso = Array(9).fill(null);
  state.jogadoresBancoUso[p] = state.rodada;

  atualizarIndicadores();
  agendarAutoSave();
};

// Chamado pelo inline script do index.html quando o jogador escolhe a cor da Bolsa
window._bolsaSetPending = function(cor) {
  if (cor === 'branco') {
    _pendingBolsa = null;
    return;
  }
  if (_pendingBolsa) _pendingBolsa.tipo = cor; // 'verde' ou 'vermelho'
};

// Recupera o fluxo de movimento quando o operador fecha o modal de pergunta sem responder
// e depois abre via botão ❓: marca acertou/errou usando a pergunta visível e abre o modal de movimento.
window._marcarRespostaDado = function(acertou) {
  const v = window._valorDadoAtual || 0;
  if (v <= 0) return;
  const questIdx = getPerguntaAtualOperador();
  _ultimaPerguntaDado = { perguntaId: questIdx, acertou };

  const elModal = document.getElementById('modalPerguntas');
  const modalInst = bootstrap.Modal.getInstance(elModal);
  if (modalInst) {
    elModal.addEventListener('hidden.bs.modal', () => _modalMovimento(v, acertou), { once: true });
    modalInst.hide();
  } else {
    _modalMovimento(v, acertou);
  }
};

function animarMovimento(p, totalCasas, direcao, onFim) {
  if (totalCasas <= 0) { onFim(); return; }

  const btnDado = document.getElementById('btnDadoRolar');
  if (btnDado) btnDado.disabled = true;
  _animando = true;

  const startPos = state.jogadoresPosicao[p];
  const path = [];
  for (let i = 1; i <= totalCasas; i++) {
    path.push(((startPos + i * direcao) % 64 + 64) % 64);
  }

  // ── Avatar: foto > personagem > pião numerado ──────────────
  const foto       = state.jogadoresFotos?.[p];
  const personagem = state.jogadoresPersonagem?.[p];
  const cor        = COR_JOGADOR[p] || '#aaa';
  const SIZE       = 62;
  const STEP_MS    = 420;  // ms por casa — lento para todos verem
  const TRANS_MS   = 380;  // ms da transição CSS

  const v = document.createElement('div');
  v.id = 'piao-viajante';

  const baseStyle = `position:fixed;width:${SIZE}px;height:${SIZE}px;z-index:9999;pointer-events:none;
    transition:left ${TRANS_MS}ms ease,top ${TRANS_MS}ms ease;`;

  if (foto) {
    v.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
    v.style.cssText = baseStyle + `border-radius:50%;overflow:hidden;
      border:3px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,0.7);`;
  } else if (personagem) {
    if (personagem.includes('/')) {
      v.innerHTML = `<img src="${personagem}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
      v.style.cssText = baseStyle + `border-radius:50%;overflow:hidden;
        border:3px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,0.7);`;
    } else {
      v.textContent   = personagem;
      v.style.cssText = baseStyle + `font-size:${SIZE - 4}px;display:flex;align-items:center;
        justify-content:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));`;
    }
  } else {
    v.textContent   = String(p + 1);
    v.style.cssText = baseStyle + `border-radius:50%;background:${cor};color:#fff;
      font-size:1.7rem;font-weight:bold;display:flex;align-items:center;justify-content:center;
      border:3px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,0.7);`;
  }

  const casaCenter = (pos) => {
    const el = document.querySelector(`.pos${pos}`);
    if (!el) return { x: window.innerWidth / 2 - SIZE / 2, y: window.innerHeight / 2 - SIZE / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - SIZE / 2, y: r.top + r.height / 2 - SIZE / 2 };
  };

  const sc = casaCenter(startPos);
  v.style.left = sc.x + 'px';
  v.style.top  = sc.y + 'px';
  document.body.appendChild(v);
  v.classList.add('piao-andando');

  let step = 0;
  function moverProximo() {
    if (step >= path.length) {
      v.classList.remove('piao-andando');
      state.jogadoresPosicao[p] = path[path.length - 1];
      atualizarPosicoes();
      setTimeout(() => {
        v.remove();
        _animando = false;
        if (btnDado) btnDado.disabled = false;
        onFim();
      }, 1500);
      return;
    }
    const pos    = path[step];
    state.jogadoresPosicao[p] = pos;
    atualizarPosicoes(p);
    const c = casaCenter(pos);
    v.style.left = c.x + 'px';
    v.style.top  = c.y + 'px';
    step++;
    setTimeout(moverProximo, STEP_MS);
  }

  setTimeout(moverProximo, 40);
}

function _animarCasaPouso(pos, onFim) {
  const DURACAO = 5000;
  const casaEl  = document.querySelector(`.pos${pos}`);
  if (!casaEl) { setTimeout(onFim, DURACAO); return; }

  const casaRect = casaEl.getBoundingClientRect();
  const areaEl   = document.querySelector('.tabuleiro-centro') ?? document.querySelector('.tabuleiro-grid');
  const areaRect = areaEl ? areaEl.getBoundingClientRect() : casaRect;

  const casaCX = casaRect.left + casaRect.width  / 2;
  const casaCY = casaRect.top  + casaRect.height / 2;

  const SCALE = 4;
  const halfW = casaRect.width  * SCALE / 2;
  const halfH = casaRect.height * SCALE / 2;

  // Limites para o centro do clone escalado ficar dentro da área central
  const minCX = Math.min(areaRect.left + halfW + 8, areaRect.left + areaRect.width  / 2);
  const maxCX = Math.max(areaRect.right - halfW - 8, areaRect.left + areaRect.width  / 2);
  const minCY = Math.min(areaRect.top  + halfH + 8, areaRect.top  + areaRect.height / 2);
  const maxCY = Math.max(areaRect.bottom - halfH - 8, areaRect.top + areaRect.height / 2);

  const randCX = () => minCX + Math.random() * (maxCX - minCX);
  const randCY = () => minCY + Math.random() * (maxCY - minCY);
  const delta  = (cx, cy) => [`${cx - casaCX}px`, `${cy - casaCY}px`];

  const NUM_WP = 7;
  const wps = Array.from({ length: NUM_WP }, () => delta(randCX(), randCY()));

  const glow = 'brightness(2) drop-shadow(0 0 35px gold) drop-shadow(0 0 18px rgba(255,200,0,0.7))';

  const keyframes = [
    { transform: 'translate(0px,0px) scale(1)',                                    filter: 'brightness(1)', offset: 0    },
    { transform: `translate(${wps[0][0]},${wps[0][1]}) scale(${SCALE})`,          filter: glow,            offset: 0.12 },
  ];
  for (let i = 1; i < NUM_WP; i++) {
    keyframes.push({
      transform: `translate(${wps[i][0]},${wps[i][1]}) scale(${SCALE})`,
      filter: glow,
      offset: 0.12 + (i / (NUM_WP - 1)) * 0.76,
    });
  }
  keyframes.push({ transform: 'translate(0px,0px) scale(1)', filter: 'brightness(1)', offset: 1 });

  // Clone fixo sobre a casa original
  const clone = casaEl.cloneNode(true);
  clone.style.cssText = `
    position:fixed; left:${casaRect.left}px; top:${casaRect.top}px;
    width:${casaRect.width}px; height:${casaRect.height}px;
    z-index:9999; pointer-events:none; margin:0;
    transform-origin:center; overflow:hidden; border-radius:4px; transition:none;
  `;
  document.body.appendChild(clone);
  casaEl.style.opacity = '0.2';

  const anim = clone.animate(keyframes, { duration: DURACAO, easing: 'ease-in-out', fill: 'forwards' });
  anim.onfinish = () => { clone.remove(); casaEl.style.opacity = ''; onFim(); };
}

window.avancarJogador = function(valor) {
  if (_animando) return;
  const p = state.jogador - 1;
  animarMovimento(p, valor, +1, () => {
    processarCasa(p, valor);
    atualizarPosicoes();
    atualizarDonos();
    atualizarIndicadores();
    _setEsperandoProximo(true);
    agendarAutoSave();
    const painel = _pendingBolsa ? 'divAcoes' : 'divCofrinhos';
    _animarCasaPouso(state.jogadoresPosicao[p], () => mostrarPainel(painel));
  });
};

window.voltarJogador = function(valor) {
  if (_animando) return;
  const p    = state.jogador - 1;
  const casas = Math.min(valor, state.jogadoresPosicao[p]);
  animarMovimento(p, casas, -1, () => {
    processarCasa(p, casas);
    atualizarPosicoes();
    atualizarDonos();
    atualizarIndicadores();
    _setEsperandoProximo(true);
    agendarAutoSave();
    const painel = _pendingBolsa ? 'divAcoes' : 'divCofrinhos';
    _animarCasaPouso(state.jogadoresPosicao[p], () => mostrarPainel(painel));
  });
};

window.soDinheiro = function(valor) {
  window.rolarDado(valor);
};

// Índice do bem correspondente a cada casa $
const _BEM_CASA = { '$ CEL': 0, '$ MOTO': 1, '$ CAR': 2, '$ CASA': 3 };

function _alertaSaldoNeg(p) {
  return state.jogadoresDinheiro[p] < 0
    ? `<br><span class="text-warning">⚠️ Saldo negativo! Saque de um cofrinho se necessário.</span>`
    : '';
}

function processarCasa(p, dadoValor = 0) {
  _pendingBolsa = null; // limpa pendência anterior a cada novo pouso
  const pos   = state.jogadoresPosicao[p];
  const nome  = getNomeCasa(pos);
  const bonus = CASAS_BONUS[pos];

  // Passo 1: aplicar bônus/penalidade da casa (acumula msg para $ squares)
  let bonusTexto = null;
  if (bonus !== 0) {
    const sal = salarioDaRodada();
    const val = Math.abs(bonus) * sal;
    const saldoAntes = state.jogadoresDinheiro[p];
    if (bonus > 0) {
      const dono = state.casasDonos?.[pos];
      if (dono === null || dono === undefined) {
        // Primeira vez: jogador resgata o bônus e vira dono
        state.jogadoresDinheiro[p] += val;
        _registrarEvento(p, 'BONUS_CASA', { descricao: `${nome} (ganhou valor da casa ${pos} * salário da rodada): +R$${fmt(val)} — virou dono`, valor: val, saldoAntes });
        state.casasDonos[pos] = p;
        bonusTexto = `🎉 ${nome}<br>Recebeu: <strong>R$ ${fmt(val)}</strong><br><span class="text-info small">🏠 Você é agora o dono desta casa!</span>`;
        tocarSom('bom');
      } else if (dono === p) {
        // Próprio dono: sem bônus
        bonusTexto = `🏠 ${nome}<br>Esta casa é sua! Nenhum bônus adicional.`;
      } else {
        // Outro jogador é dono: paga aluguel = dadoValor (desconto p/ quem tem Carro)
        const nomeDono       = state.jogadores[dono] || `Jogador ${dono + 1}`;
        const qtdCarros      = state.jogadoresBens[p][2] || 0;
        const fatorAluguel   = qtdCarros >= 2 ? 0.5 : qtdCarros === 1 ? 0.7 : 1.0;
        const aluguel        = Math.round(dadoValor * fatorAluguel * 100) / 100;
        const saldoAntesDono = state.jogadoresDinheiro[dono];
        state.jogadoresDinheiro[p]    -= aluguel;
        state.jogadoresDinheiro[dono] += aluguel;
        const descontoInfo = qtdCarros > 0 ? ` 🚗 desc.${qtdCarros >= 2 ? '50' : '30'}%` : '';
        _registrarEvento(p, 'ALUGUEL_PAGO', {
          descricao: `🏠 Aluguel (casa ${pos} — ${nome}): -R$${fmt(aluguel)}${descontoInfo} → ${nomeDono}`,
          valor: -aluguel, saldoAntes,
        });
        _registrarEvento(dono, 'ALUGUEL_RECEBIDO', {
          descricao: `🏠 Aluguel (casa ${pos} — ${nome}): +R$${fmt(aluguel)} ← ${state.jogadores[p] || `Jogador ${p + 1}`}`,
          valor: aluguel, saldoAntes: saldoAntesDono,
        });
        bonusTexto = `🏠 ${nome}<br>Propriedade de <strong>${nomeDono}</strong><br>Pagou aluguel: <strong>R$ ${fmt(aluguel)}</strong>${descontoInfo}${_alertaSaldoNeg(p)}`;
        tocarSom('ruim');
      }
    } else {
      // Penalidades podem deixar saldo negativo
      state.jogadoresDinheiro[p] -= val;
      const pago = saldoAntes - state.jogadoresDinheiro[p];
      _registrarEvento(p, 'PENALIDADE_CASA', { descricao: `${nome} (casa ${pos}): -R$${fmt(pago)}`, valor: -pago, saldoAntes });
      bonusTexto = `😢 ${nome}<br>Pagou: <strong>R$ ${fmt(val)}</strong>${_alertaSaldoNeg(p)}`;
      tocarSom('ruim');
    }
  }

  // Passo 2: efeito específico da casa
  const bemIdx = _BEM_CASA[nome];

  if (bemIdx !== undefined) {
    // Casa $: pagamento obrigatório + bem adicionado automaticamente ao inventário
    const custo = state.valorBem[bemIdx];
    const saldoAntes = state.jogadoresDinheiro[p];
    state.jogadoresDinheiro[p] -= custo;
    state.jogadoresBens[p][bemIdx]++;
    _registrarEvento(p, 'PAGAMENTO_BEM', {
      descricao: `${nome} (casa ${pos}): comprou ${state.nomesBens[bemIdx]} -R$${fmt(custo)}`,
      valor: -custo,
      bemIdx,
      saldoAntes,
    });
    const prefixo = bonusTexto ? `${bonusTexto}<br>` : '';
    mostrarMensagem(
      `${prefixo}🛒 Comprou <strong>${state.nomesBens[bemIdx]}</strong> (${state.jogadoresBens[p][bemIdx]}x): -R$ ${fmt(custo)}${_alertaSaldoNeg(p)}`,
      state.jogadoresDinheiro[p] < 0 ? 'erro' : 'info'
    );
    tocarSom('ruim');

  } else if (bonusTexto) {
    // Casa só com bônus/penalidade, sem efeito extra
    mostrarMensagem(bonusTexto, bonus > 0 ? 'ok' : 'erro');

  } else if (nome === 'ESTRELA') {
    const bônus = salarioDaRodada() * 5;
    const saldoAntes = state.jogadoresDinheiro[p];
    state.jogadoresDinheiro[p] += bônus;
    _registrarEvento(p, 'ESTRELA', { descricao: `⭐ ESTRELA (casa ${pos}): +R$${fmt(bônus)}`, valor: bônus, saldoAntes });
    mostrarMensagem(`⭐ ESTRELA!<br>Recebeu: <strong>R$ ${fmt(bônus)}</strong>`, 'ok');
    tocarSom('bom');

  } else if (nome === 'N.QUEBRE') {
    const saldo  = state.jogadoresDinheiro[p];
    const minimo = saldo * 0.70;
    _pendingInquebraveis = { player: p, minimo, cofrinhosTotaisAntes: _somarCofrinhoRodadaAtual(p) };
    _registrarEvento(p, 'INQUEBRAVEIS', {
      descricao: `💪 INQUEBRÁVEIS (casa ${pos}): deve aplicar no mínimo R$${fmt(minimo)} em cofrinhos`,
      valor: 0,
      saldoAntes: saldo,
    });
    mostrarMensagem(
      `💪 INQUEBRÁVEIS!<br>${_MSG_INQUEBRAVEIS}<br><br>Mínimo a depositar: <strong>R$ ${fmt(minimo)}</strong>`,
      'ok'
    );
    tocarSom('bom');

  } else if (nome === 'EMERG') {
    const temSeguradora = (state.jogadoresAcoes?.[p]?.[2] ?? 0) > 0;
    const penalidade    = Math.floor(Math.random() * 41) + 10; // inteiro 10–50

    if (temSeguradora) {
      mostrarMensagem(
        `🚨 EMERGÊNCIAS!<br>🛡️ Sua <strong>Seguradora</strong> cobre o prejuízo — sem penalidade!<br>Você pode sacar do cofrinho de <strong>Emergências</strong> se desejar.`,
        'ok'
      );
      tocarSom('bom');
    } else {
      const saldoAntes = state.jogadoresDinheiro[p];
      state.jogadoresDinheiro[p] -= penalidade;
      _registrarEvento(p, 'PENALIDADE_CASA', {
        descricao: `🚨 Emergência (casa ${pos}): -R$ ${penalidade}`,
        valor: -penalidade,
        saldoAntes,
      });
      mostrarMensagem(
        `🚨 EMERGÊNCIAS!<br>Você perdeu <strong>R$ ${penalidade}</strong> em gastos emergenciais.<br>Você pode sacar do cofrinho de <strong>Emergências</strong> para cobrir seus gastos se ficar negativo.${_alertaSaldoNeg(p)}`,
        'erro'
      );
      tocarSom('ruim');
      atualizarIndicadores();
      agendarAutoSave();
    }

  } else if (nome === 'SONHOS') {
    mostrarMensagem(
      `💭 SONHOS!<br>Você pode sacar do cofrinho de <strong>Sonhos</strong> para cobrir seus gastos, se ficar negativo.`,
      'info'
    );

  } else if (nome === 'BOLSA') {
    _pendingBolsa = { player: p, tipo: null, qtdAntes: _somarTotalAcoesQtd(p) };
    document.getElementById('bolsaDadoBotoes').style.display = '';
    document.getElementById('bolsaDadoResultado').style.display = 'none';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalBolsaDado')).show();

  } else if (nome === 'Joga de novo') {
    _setEsperandoProximo(false);
    mostrarMensagem('🎲 Joga de novo! Role o dado mais uma vez.', 'ok');
    tocarSom('bom');
  }
}

// ── Próximo jogador / rodada ──────────────────────────────────────────────────

const _MSG_BOLSA = 'Você precisa operar na bolsa antes de passar a vez, não tenha medo! Renda variável pode trazer boas surpresas';

window.proximoJogador = function() {
  if (_pendingBolsa && _pendingBolsa.player === state.jogador - 1) {
    const qtdAtual = _somarTotalAcoesQtd(_pendingBolsa.player);
    const { tipo, qtdAntes } = _pendingBolsa;
    const bloqueadoVerde    = tipo === 'verde'    && qtdAtual <= qtdAntes;
    const bloqueadoVermelho = tipo === 'vermelho' && qtdAntes > 0 && qtdAtual >= qtdAntes;
    if (tipo === null || bloqueadoVerde || bloqueadoVermelho) {
      mostrarMensagem(_MSG_BOLSA, 'erro');
      mostrarPainel('divAcoes');
      return;
    }
    _pendingBolsa = null;
  }

  if (_pendingInquebraveis && _pendingInquebraveis.player === state.jogador - 1) {
    const depositado = _somarCofrinhoRodadaAtual(_pendingInquebraveis.player) - _pendingInquebraveis.cofrinhosTotaisAntes;
    const minimo     = _pendingInquebraveis.minimo;
    if (depositado < minimo - 0.01) {
      const falta = minimo - depositado;
      mostrarMensagem(
        `💪 INQUEBRÁVEIS — depósito pendente!<br>` +
        `Mínimo exigido: <strong>R$ ${fmt(minimo)}</strong><br>` +
        `Depositado até agora: <strong>R$ ${fmt(depositado)}</strong><br>` +
        `Faltam: <strong class="text-danger">R$ ${fmt(falta)}</strong><br><br>` +
        `Deposite em qualquer cofrinho do jogador ativo antes de clicar FIM.`,
        'erro'
      );
      state.vista = state.jogador;
      atualizarIndicadores();
      mostrarPainel('divCofrinhos');
      return;
    }
    _pendingInquebraveis = null;
  }

  cobrarCustosBens();
  cobrarJuros();
  receberRendaBens();
  receberDividendos();

  let proximo = state.jogador;
  do {
    proximo = proximo >= state.qtJogadores ? 1 : proximo + 1;
    if (proximo === state.jogador) break;
  } while (state.jogadoresPresentes[proximo - 1] !== 'S');

  if (proximo <= state.jogador) {
    state.rodada++;
    // Correção do valor das ações: 2 × taxa de juros por rodada
    const fatorAcao = 1 + (2 * state.juros / 100);
    state.valorAcao = state.valorAcao.map(v => Math.round(v * fatorAcao * 100) / 100);
    if (state.rodada > state.rodadas) {
      state.fim = true;
      _pararCronometro();
      tocarSom('fim');
      mostrarMensagem('🏆 Fim de jogo!<br>Verifique o ranking final no painel Resumo.', 'ok');
    }
  }

  state.jogador = proximo;
  state.vista   = proximo;   // sincroniza visualização com o jogador ativo
  _setEsperandoProximo(false);
  atualizarPosicoes();
  atualizarIndicadores();
  renderResumo();
  mostrarPainel('divTabuleiro');
  agendarAutoSave();
};

// Navega para o jogador ANTERIOR para consulta (não avança o turno)
window.anteriorJogador = function() {
  let anterior = state.vista;
  do {
    anterior = anterior <= 1 ? state.qtJogadores : anterior - 1;
    if (anterior === state.vista) break;
  } while (state.jogadoresPresentes[anterior - 1] !== 'S');
  state.vista = anterior;
  atualizarIndicadores();
  atualizarCentro();
  _renderPainelAtivo();
};

// Navega para o PRÓXIMO jogador para consulta (não avança o turno)
window.proximoVista = function() {
  let proximo = state.vista;
  do {
    proximo = proximo >= state.qtJogadores ? 1 : proximo + 1;
    if (proximo === state.vista) break;
  } while (state.jogadoresPresentes[proximo - 1] !== 'S');
  state.vista = proximo;
  atualizarIndicadores();
  atualizarCentro();
  _renderPainelAtivo();
};

function cobrarCustosBens() {
  const p = state.jogador - 1;
  let total = 0;
  for (let b = 0; b < 4; b++) {
    const qty = state.jogadoresBens[p][b];
    if (qty > 0) total += qty * state.valorBem[b] * (state.despesaBem[b] / 100);
  }
  if (total > 0) {
    // Moto: cada moto reduz 25% da manutenção (cap -50%)
    const qtdMotos   = state.jogadoresBens[p][1] || 0;
    const descMoto   = Math.min(0.5, qtdMotos * 0.25);
    const totalFinal = Math.round(total * (1 - descMoto) * 100) / 100;
    const saldoAntes = state.jogadoresDinheiro[p];
    state.jogadoresDinheiro[p] = Math.max(0, state.jogadoresDinheiro[p] - totalFinal);
    const pago = saldoAntes - state.jogadoresDinheiro[p];
    const descInfo = qtdMotos > 0 ? ` 🏍️ desc.${descMoto * 100}%` : '';
    _registrarEvento(p, 'CUSTO_BENS', {
      descricao: `Manutenção de bens: -R$${fmt(pago)}${descInfo}`,
      valor: -pago,
      saldoAntes,
    });
  }
}

function cobrarJuros() {
  const p = state.jogador - 1;
  const juros = state.jogadoresEmprestimos[p] * (state.juros / 100);
  if (juros > 0) {
    const saldoAntes  = state.jogadoresDinheiro[p];
    const dividaAntes = state.jogadoresEmprestimos[p];
    state.jogadoresDinheiro[p] = Math.max(0, state.jogadoresDinheiro[p] - juros);
    const pago = saldoAntes - state.jogadoresDinheiro[p];
    _registrarEvento(p, 'JUROS_PAGOS', {
      descricao: `Juros ${state.juros}% s/ dívida R$${fmt(dividaAntes)}: -R$${fmt(pago)}`,
      valor: -pago,
      saldoAntes,
      dividaAntes,
    });
  }
}

function receberRendaBens() {
  const p = state.jogador - 1;
  const qtdCEL  = state.jogadoresBens[p][0] || 0;
  const qtdCASA = state.jogadoresBens[p][3] || 0;
  const rendaCEL  = qtdCEL  * 3;
  const rendaCASA = qtdCASA * 10;
  const total = rendaCEL + rendaCASA;
  if (total > 0) {
    const saldoAntes = state.jogadoresDinheiro[p];
    state.jogadoresDinheiro[p] += total;
    const partes = [];
    if (rendaCEL  > 0) partes.push(`Celular ${qtdCEL}×R$3: +R$${fmt(rendaCEL)}`);
    if (rendaCASA > 0) partes.push(`Casa ${qtdCASA}×R$10: +R$${fmt(rendaCASA)}`);
    _registrarEvento(p, 'RENDA_BENS', {
      descricao: `Renda de bens: ${partes.join(' | ')}`,
      valor: total,
      saldoAntes,
    });
  }
}

function receberDividendos() {
  const p = state.jogador - 1;
  let total = 0;
  const partes = [];
  for (let a = 0; a < 5; a++) {
    const qty  = state.jogadoresAcoes[p][a];
    const taxa = state.dividendos[a];
    if (qty > 0 && taxa > 0) {
      const val = qty * (taxa / 100) * state.valorAcao[a];
      total += val;
      partes.push(`${state.nomesAcoes[a]} ${qty}×${taxa}%: +R$${fmt(val)}`);
    }
  }
  if (total > 0) {
    const saldoAntes = state.jogadoresDinheiro[p];
    state.jogadoresDinheiro[p] += total;
    const detalhe = partes.length > 1 ? `${partes.join(' | ')} | Total: +R$${fmt(total)}` : partes[0];
    _registrarEvento(p, 'DIVIDENDOS', {
      descricao: `Dividendos: ${detalhe}`,
      valor: total,
      saldoAntes,
    });
  }
}

// ── Leilão de Bens ────────────────────────────────────────────────────────────

window._executarLeilao = function(vendIdx, b, winner, lance) {
  const nomes = ['Celular', 'Moto', 'Carro', 'Casa'];
  const nomeVend   = vendIdx < 0 ? 'Banco' : (state.jogadores[vendIdx] || `Jogador ${vendIdx + 1}`);
  const nomeWinner = state.jogadores[winner] || `Jogador ${winner + 1}`;

  // Debita lance do vencedor
  const saldoWinnerAntes = state.jogadoresDinheiro[winner];
  state.jogadoresDinheiro[winner] -= lance;
  state.jogadoresBens[winner][b]  += 1;
  _registrarEvento(winner, 'LEILAO_COMPRA', {
    descricao: `🔨 Leilão: comprou 1× ${nomes[b]} por R$${fmt(lance)} (vendedor: ${nomeVend})`,
    valor: -lance, saldoAntes: saldoWinnerAntes, bemIdx: b,
  });

  // Credita ao vendedor (se for jogador)
  if (vendIdx >= 0) {
    const saldoVendAntes = state.jogadoresDinheiro[vendIdx];
    state.jogadoresDinheiro[vendIdx] += lance;
    state.jogadoresBens[vendIdx][b]  -= 1;
    _registrarEvento(vendIdx, 'LEILAO_VENDA', {
      descricao: `🔨 Leilão: vendeu 1× ${nomes[b]} por R$${fmt(lance)} para ${nomeWinner}`,
      valor: lance, saldoAntes: saldoVendAntes, bemIdx: b,
    });
  }

  atualizarIndicadores();
  renderBens();
  agendarAutoSave();
  mostrarMensagem(
    `🔨 Leilão concluído!<br><strong>${nomeWinner}</strong> comprou 1× <strong>${nomes[b]}</strong> por <strong>R$ ${fmt(lance)}</strong> de <strong>${nomeVend}</strong>.`,
    'ok'
  );
};

// ── Operações de jogador ──────────────────────────────────────────────────────

// Forçar jogador ativo (útil para corrigir ordem via Variáveis)
window.forcarRodadaAtual = function(novaRodada) {
  if (novaRodada < 1 || novaRodada > state.rodadas) return;
  state.rodada = novaRodada;
  atualizarIndicadores();
  agendarAutoSave();
};

window.forcarJogadorAtual = function(novoJogador) {
  if (novoJogador < 1 || novoJogador > state.qtJogadores) return;
  if (state.jogadoresPresentes[novoJogador - 1] !== 'S') return;
  state.jogador = novoJogador;
  state.vista   = novoJogador;
  atualizarPosicoes();
  atualizarIndicadores();
  _renderPainelAtivo();
  agendarAutoSave();
};

window.renomearJogador = function(p, nome) {
  state.jogadores[p] = nome;
  atualizarIndicadores();
};

window.selecionarUsuarioSistema = function(p, userId) {
  if (!userId) {
    state.jogadoresSysId[p] = null;
    state.jogadoresFotos[p] = null;
    renderJogadores();
    renderTabuleiro();
    return;
  }
  const user = (window._systemUsers || []).find(u => String(u.id) === String(userId));
  if (!user) return;
  state.jogadores[p]       = user.nome;
  state.jogadoresSysId[p]  = user.id;
  state.jogadoresFotos[p]  = user.foto || null;
  renderJogadores();
  atualizarIndicadores();
  renderTabuleiro();
  agendarAutoSave();
};

window.selecionarPersonagem = function(p, emoji) {
  document.getElementById('seletor-backdrop')?.remove();
  state.jogadoresPersonagem[p] = emoji || null;
  renderJogadores();
  atualizarPosicoes();
  atualizarIndicadores();
  agendarAutoSave();
};

window.fazerLogout = function() {
  logout();
};

window.destacarJogadoresUmAUm = async function() {
  const presentes = [];
  for (let p = 0; p < state.qtJogadores; p++) {
    if (state.jogadoresPresentes[p] === 'S') presentes.push(p);
  }

  for (const p of presentes) {
    const piao = document.querySelector(`.piao[data-jogador="${p}"]`);
    if (!piao) continue;

    const rect = piao.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const sz   = 88;

    const foto       = state.jogadoresFotos?.[p];
    const personagem = state.jogadoresPersonagem?.[p];
    const cor        = COR_JOGADOR[p] || '#888';
    const nome       = state.jogadores[p] || `Jogador ${p + 1}`;

    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;z-index:9990;width:${sz}px;height:${sz}px;` +
      `left:${cx - sz/2}px;top:${cy - sz/2}px;border-radius:50%;` +
      `border:3px solid rgba(255,255,255,0.95);display:flex;align-items:center;` +
      `justify-content:center;pointer-events:none;overflow:hidden;` +
      `box-shadow:0 0 0 4px white,0 0 28px rgba(255,215,0,0.9),0 0 56px rgba(255,215,0,0.5);` +
      `transition:transform 0.3s ease,opacity 0.3s ease;transform:scale(0.2);opacity:0;`;

    if (foto) {
      const img = document.createElement('img');
      img.src = foto;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      ov.appendChild(img);
    } else if (personagem && personagem.includes('/')) {
      const img = document.createElement('img');
      img.src = personagem;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      ov.appendChild(img);
    } else if (personagem) {
      ov.style.background = 'rgba(0,0,0,0.5)';
      ov.style.fontSize   = '2.6em';
      ov.style.lineHeight = '1';
      ov.textContent      = personagem;
    } else {
      ov.style.background = cor;
      ov.style.fontSize   = '2em';
      ov.style.fontWeight = '900';
      ov.style.color      = '#fff';
      ov.style.textShadow = '0 0 6px rgba(0,0,0,0.8)';
      ov.textContent      = p + 1;
    }

    const label = document.createElement('div');
    label.textContent  = nome;
    label.style.cssText = `position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);` +
      `white-space:nowrap;font-size:13px;font-weight:700;color:#fff;` +
      `text-shadow:0 0 6px #000,0 0 3px #000;background:rgba(0,0,0,0.75);` +
      `padding:2px 10px;border-radius:6px;`;
    ov.appendChild(label);

    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ov.style.transform = 'scale(1)';
      ov.style.opacity   = '1';
    }));

    await new Promise(r => setTimeout(r, 1000));

    ov.style.transform = 'scale(0.2)';
    ov.style.opacity   = '0';
    await new Promise(r => setTimeout(r, 320));
    ov.remove();
  }
};

window.togglePresente = function(p, presente) {
  state.jogadoresPresentes[p] = presente ? 'S' : 'N';
};

window.depositarCofrinho = function(c) {
  const input = document.getElementById(`depositoCofrinho${c}`);
  const valor = parseFloat(input?.value) || 0;
  if (valor <= 0) return;
  const p = state.vista - 1;
  if (valor > state.jogadoresDinheiro[p]) {
    mostrarMensagem('Saldo insuficiente!', 'erro');
    return;
  }
  const r = state.rodada - 1;
  const primeiroAporte = state.jogadoresCofrinhos[p][c].every(v => v === 0);
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresCofrinhos[p][c][r] += valor;
  state.jogadoresDinheiro[p] -= valor;
  _registrarEvento(p, 'COFRINHO', {
    descricao: `Depósito ${_NOMES_COF[c]}: -R$${fmt(valor)}`,
    valor: -valor,
    cofrinhoIdx: c,
    saldoAntes,
  });
  if (primeiroAporte) {
    _registrarEvento(p, 'BONUS_COFRINHO', {
      descricao: `Primeiro aporte no cofrinho valeu o dobro`,
      valor: valor,
      cofrinhoIdx: c,
      saldoAntes: state.jogadoresDinheiro[p],
    });
  }
  if (input) input.value = 0;
  renderCofrinhos();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.sacarCofrinho = function(c) {
  const input = document.getElementById(`saqueCofrinho${c}`);
  const valor = parseFloat(input?.value) || 0;
  if (valor <= 0) return;
  const p = state.vista - 1;
  const disponivel = calcCofrinho(p, c);
  if (disponivel <= 0) { mostrarMensagem('Cofrinho vazio!', 'erro'); return; }
  if (valor > disponivel + 0.01) { mostrarMensagem('Valor supera o saldo do cofrinho!', 'erro'); return; }

  const sacar = Math.min(valor, disponivel);
  const frac  = 1 - sacar / disponivel;
  for (let r = 0; r < state.rodadas; r++) {
    state.jogadoresCofrinhos[p][c][r] *= frac;
  }
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresDinheiro[p] += sacar;
  _registrarEvento(p, 'SAQUE_COFRINHO', {
    descricao: `Saque ${_NOMES_COF[c]}: +R$${fmt(sacar)}`,
    valor: sacar,
    cofrinhoIdx: c,
    saldoAntes,
  });
  if (input) input.value = 0;
  renderCofrinhos();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.comprarAcao = function(a) {
  const p   = state.vista - 1;
  const val = state.valorAcao[a];
  if (state.jogadoresDinheiro[p] < val) { mostrarMensagem('Saldo insuficiente!', 'erro'); return; }
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresDinheiro[p] -= val;
  state.jogadoresAcoes[p][a]++;
  _registrarEvento(p, 'COMPRA_ACAO', {
    descricao: `Comprou 1× ${state.nomesAcoes[a]} por R$${fmt(val)}`,
    valor: -val,
    acaoIdx: a,
    saldoAntes,
  });
  renderAcoes();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.venderAcao = function(a) {
  const p   = state.vista - 1;
  if (state.jogadoresAcoes[p][a] <= 0) return;
  const val = state.valorAcao[a];
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresAcoes[p][a]--;
  state.jogadoresDinheiro[p] += val;
  _registrarEvento(p, 'VENDA_ACAO', {
    descricao: `Vendeu 1× ${state.nomesAcoes[a]}: +R$${fmt(val)}`,
    valor: val,
    acaoIdx: a,
    saldoAntes,
  });
  renderAcoes();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.comprarBem = function(b) {
  const p   = state.vista - 1;
  const val = state.valorBem[b];
  if (state.jogadoresDinheiro[p] < val) { mostrarMensagem('Saldo insuficiente!', 'erro'); return; }
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresDinheiro[p] -= val;
  state.jogadoresBens[p][b]++;
  _registrarEvento(p, 'COMPRA_BEM', {
    descricao: `Comprou ${state.nomesBens[b]} por R$${fmt(val)}`,
    valor: -val,
    bemIdx: b,
    saldoAntes,
  });
  renderBens();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.devolverBem = function(b) {
  const p      = state.vista - 1;
  if (state.jogadoresBens[p][b] <= 0) return;
  const refund = state.valorBem[b] * 0.5;
  const saldoAntes = state.jogadoresDinheiro[p];
  state.jogadoresBens[p][b]--;
  state.jogadoresDinheiro[p] += refund;
  _registrarEvento(p, 'DEVOLUCAO_BEM', {
    descricao: `Devolveu ${state.nomesBens[b]}: +R$${fmt(refund)} (50%)`,
    valor: refund,
    bemIdx: b,
    saldoAntes,
  });
  renderBens();
  atualizarIndicadores();
  tocarSom('moeda');
  agendarAutoSave();
};

window.emprestarDinheiro = function() {
  const valor = parseFloat((prompt('Valor do empréstimo:') || '0').replace(',', '.'));
  if (!valor || valor <= 0) return;
  const p = state.vista - 1;
  const saldoAntes  = state.jogadoresDinheiro[p];
  const dividaAntes = state.jogadoresEmprestimos[p];
  state.jogadoresEmprestimos[p] += valor;
  state.jogadoresDinheiro[p]    += valor;
  _registrarEvento(p, 'EMPRESTIMO', {
    descricao: `Empréstimo +R$${fmt(valor)} (dívida → R$${fmt(state.jogadoresEmprestimos[p])})`,
    valor,
    saldoAntes,
    dividaAntes,
  });
  atualizarIndicadores();
  agendarAutoSave();
};

window.pagarEmprestimo = function() {
  const p    = state.vista - 1;
  const deve = state.jogadoresEmprestimos[p];
  if (deve <= 0) { mostrarMensagem('Sem dívidas!', 'ok'); return; }
  const valor = parseFloat((prompt(`Pagar quanto? (Deve: R$ ${fmt(deve)}):`) || '0').replace(',', '.'));
  if (!valor || valor <= 0) return;
  const saldo = state.jogadoresDinheiro[p];
  if (valor > saldo) {
    mostrarMensagem(
      `Você não tem esse valor.<br>Os <strong>R$ ${fmt(saldo)}</strong> que tem em caixa serão totalmente utilizados para pagar a dívida.`,
      'info'
    );
  }
  const pago = Math.min(valor, saldo);
  const saldoAntes  = saldo;
  const dividaAntes = state.jogadoresEmprestimos[p];
  state.jogadoresEmprestimos[p] = Math.max(0, deve - pago);
  state.jogadoresDinheiro[p]    = Math.max(0, state.jogadoresDinheiro[p] - pago);
  _registrarEvento(p, 'PAGAMENTO_EMPRESTIMO', {
    descricao: `Pagou dívida -R$${fmt(pago)} (dívida → R$${fmt(state.jogadoresEmprestimos[p])})`,
    valor: -pago,
    saldoAntes,
    dividaAntes,
  });
  atualizarIndicadores();
  agendarAutoSave();
};

// ── Extrato ───────────────────────────────────────────────────────────────────

window.abrirExtrato = function(p) {
  const nome = state.jogadores[p] || `Jogador ${p + 1}`;
  document.getElementById('extratoTitulo').textContent = `📋 Extrato — ${nome}`;
  renderExtrato(p);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalExtrato')).show();
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

function _renderPainelAtivo() {
  const id = PAINEIS.find(pid => document.getElementById(pid)?.style.display === 'block');
  if      (id === 'divCofrinhos')  renderCofrinhos();
  else if (id === 'divAcoes')      renderAcoes();
  else if (id === 'divBens')       renderBens();
  else if (id === 'divJogadores')  renderJogadores();
  else if (id === 'divRodadas')    renderResumo();
  else if (id === 'divVariaveis')  carregarVariaveis();
}

export function mostrarPainel(id) {
  const painelAtivo = PAINEIS.find(p => document.getElementById(p)?.style.display === 'block');
  if (painelAtivo === 'divVariaveis' && id !== 'divVariaveis') {
    salvarVariaveis();
    if (state.jogador > state.qtJogadores) state.jogador = 1;
    if (state.vista   > state.qtJogadores) state.vista   = state.jogador;
  }

  PAINEIS.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? 'block' : 'none';
  });

  if (id === 'divCofrinhos')  renderCofrinhos();
  if (id === 'divAcoes')      renderAcoes();
  if (id === 'divTabuleiro')  atualizarPosicoes();
  if (id === 'divBens')       renderBens();
  if (id === 'divJogadores')  renderJogadores();
  if (id === 'divRodadas')    renderResumo();
  if (id === 'divVariaveis')  carregarVariaveis();
}

window.mostrarPainel = mostrarPainel;
window._tipoDado = () => state.tipoDado;

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
