// state.js — estado canônico do jogo (substitui variáveis globais Oracle)

const MAX_JOGADORES = 9;
const MAX_COFRINHOS = 4;
const MAX_ACOES     = 5;
const MAX_BENS      = 4;

const state = {
  gameId:          null,
  userId:          null,

  // Configuração da partida
  salario:         4,
  rodada:          1,
  jogador:         1,
  rodadas:         30,
  qtJogadores:     6,
  tempo:           360,
  incremento:      2,
  juros:           10,
  taxaImpostos:    30,
  rendimento:      10,
  ensinaAcoes:     'N',
  tipoDado:        0,
  emiteSom:        1,
  proximaPergunta: 1,

  // Bens: 0=Celular, 1=Moto, 2=Carro, 3=Casa
  valorBem:   [10, 20, 50, 100],
  despesaBem: [10, 10, 10, 10],
  nomesBens:  ['Celular', 'Moto', 'Carro', 'Casa'],

  // Ações: 0=Banco, 1=Energia, 2=Seguradora, 3=Saneamento, 4=Telecom
  dividendos:  [0, 0, 0, 20, 20],
  valorAcao:   [5, 20, 5, 15, 15],
  nomesAcoes:  ['Banco', 'Energia', 'Seguradora', 'Saneamento', 'Telecom'],

  // Por jogador (tamanho = MAX_JOGADORES)
  jogadores:            [],
  jogadoresDinheiro:    [],
  jogadoresEmprestimos: [],
  jogadoresPresentes:   [],
  jogadoresPosicao:     [],
  jogadoresCores:       [],
  jogadoresSysId:       [],  // id do usuário do sistema vinculado (null = avulso)
  jogadoresFotos:       [],  // base64 foto do usuário vinculado
  jogadoresPersonagem:  [],  // emoji do personagem escolhido (null = sem personagem)

  // Tridimensional: [jogador][cofrinho][rodada]
  jogadoresCofrinhos:   [],
  // Bidimensional: [jogador][acao]
  jogadoresAcoes:       [],
  // Bidimensional: [jogador][bem]
  jogadoresBens:        [],
  // Bidimensional: [jogador][rodada]
  jogadoresCalculadora: [],

  fim:      false,
  mensagem: true,

  // Donos das casas de bônus: índice = posição no tabuleiro, valor = índice do jogador (null = sem dono)
  casasDonos: [],

  // Rodada em que cada jogador usou a opção Banco pela última vez (null = nunca usou)
  jogadoresBancoUso: [],

  // Extrato: conta corrente por evento
  extrato: [],
};

function initState() {
  state.jogadores            = Array.from({ length: MAX_JOGADORES }, (_, i) => `Jogador ${i + 1}`);
  state.jogadoresDinheiro    = Array(MAX_JOGADORES).fill(0);
  state.jogadoresEmprestimos = Array(MAX_JOGADORES).fill(0);
  state.jogadoresPresentes   = Array(MAX_JOGADORES).fill('S');
  state.jogadoresPosicao     = Array(MAX_JOGADORES).fill(0);
  state.jogadoresCores       = Array.from({ length: MAX_JOGADORES }, (_, i) => String(i + 1));
  state.jogadoresSysId       = Array(MAX_JOGADORES).fill(null);
  state.jogadoresFotos       = Array(MAX_JOGADORES).fill(null);
  state.jogadoresPersonagem  = Array(MAX_JOGADORES).fill(null);

  state.jogadoresCofrinhos = Array.from({ length: MAX_JOGADORES }, () =>
    Array.from({ length: MAX_COFRINHOS }, () => Array(state.rodadas).fill(0))
  );
  state.jogadoresAcoes = Array.from({ length: MAX_JOGADORES }, () =>
    Array(MAX_ACOES).fill(0)
  );
  state.jogadoresBens = Array.from({ length: MAX_JOGADORES }, () =>
    Array(MAX_BENS).fill(0)
  );
  state.jogadoresCalculadora = Array.from({ length: MAX_JOGADORES }, () =>
    Array(state.rodadas).fill(0)
  );
  state.extrato    = [];
  if (!state.casasDonos || state.casasDonos.length !== 64) {
    state.casasDonos = new Array(64).fill(null);
  }
  if (!state.jogadoresBancoUso || state.jogadoresBancoUso.length !== MAX_JOGADORES) {
    state.jogadoresBancoUso = Array(MAX_JOGADORES).fill(null);
  }
}

// ── Regras de Negócio ─────────────────────────────────────────────────────────

// Bônus de cada posição do tabuleiro (espelho de board.js — array estático)
const _CASAS_BONUS_VALS = [
   0,  5, 0, 0,   0, 0,  0, -4,  0, 0,   0, 0,  0, 0,  0, -3,
   0,  0, 0, 0,   8, 0,  0,  0,  0,  0,   0,20,  0, 0,-20,  0,
   0,  0, 0, 0,   0, 0, -6,  0,-10,  0,   0, 0,  0, 0,  0,  0,
   0,  0, 0, 0, -12, 0,  0,  0,  0,  0,   0,-11, 0,-7,  0,  0,
];

function salarioDaRodada() {
  return state.salario + state.rodada * state.incremento;
}

// Valor de revenda de mercado de um bem, sensível à oferta em circulação
function calcValorMercadoBem(b) {
  const total = state.jogadoresBens.reduce((s, bens) => s + (bens[b] || 0), 0);
  const fator = Math.max(0.3, 1 - (total - 1) * 0.1);
  return Math.round(state.valorBem[b] * fator * 0.5);
}

// RN-05: rendimento dos cofrinhos (juros compostos; primeiro aporte dobra)
function calcCofrinho(p, c) {
  let acumulado = 0;
  for (let r = 0; r < state.rodadas; r++) {
    const aporte = state.jogadoresCofrinhos[p][c][r];
    if (aporte === 0) continue;

    if (acumulado === 0) {
      // Primeira contribuição dobra
      acumulado = aporte * 2;
    } else {
      // Rodadas seguintes: aplica juros compostos sobre acumulado, depois soma aporte
      acumulado = acumulado * (1 + state.rendimento / 100) + aporte;
    }
  }
  return acumulado;
}

// RN-06: riqueza líquida de um jogador
function calcNetWorth(p) {
  let cofAccum = 0;
  for (let c = 0; c < 3; c++) {
    cofAccum += calcCofrinho(p, c);
  }
  const stockValue = state.jogadoresAcoes[p].reduce(
    (sum, qty, a) => sum + qty * state.valorAcao[a], 0
  );
  // Bens valem seu preço de mercado (depreciado pela oferta em circulação)
  const bensValue = state.jogadoresBens[p].reduce(
    (sum, qty, b) => sum + qty * calcValorMercadoBem(b), 0
  );
  // Casas do tabuleiro: cada imóvel vale 2× o bônus da posição
  const casasValue = state.casasDonos.reduce(
    (sum, dono, i) => dono === p ? sum + Math.max(0, _CASAS_BONUS_VALS[i]) * 2 : sum, 0
  );
  const riqueza  = cofAccum + state.jogadoresDinheiro[p] - state.jogadoresEmprestimos[p] + stockValue + bensValue + casasValue;
  const imposto  = riqueza * (state.taxaImpostos / 100);
  const cof3     = calcCofrinho(p, 3);
  const deducao  = Math.min(cof3, imposto);
  return {
    cofAccum,
    stockValue,
    bensValue,
    casasValue,
    riqueza,
    imposto,
    deducao,
    liquido: riqueza - imposto + deducao,
  };
}

// RN-07: ranking (retorna array de índices ordenados por riqueza_liquida DESC)
function calcRanking() {
  return Array.from({ length: state.qtJogadores }, (_, i) => i)
    .filter(i => state.jogadoresPresentes[i] === 'S')
    .sort((a, b) => calcNetWorth(b).liquido - calcNetWorth(a).liquido);
}

// ── Serializers → payload API ────────────────────────────────────────────────

function toTabuleiroPayload() {
  return {
    salario:         state.salario,
    rodada:          state.rodada,
    jogador:         state.jogador,
    rodadas:         state.rodadas,
    qtJogadores:     state.qtJogadores,
    tempo:           state.tempo,
    incremento:      state.incremento,
    juros:           state.juros,
    taxaImpostos:    state.taxaImpostos,
    rendimento:      state.rendimento,
    ensinaAcoes:     state.ensinaAcoes,
    valorBem:        [...state.valorBem],
    despesaBem:      [...state.despesaBem],
    dividendos:      [...state.dividendos],
    valorAcao:       [...state.valorAcao],
    proximaPergunta: state.proximaPergunta,
    tipoDado:        state.tipoDado,
    emiteSom:        state.emiteSom,
    casasDonos:      JSON.stringify(state.casasDonos),
    bancoUso:        JSON.stringify(state.jogadoresBancoUso),
  };
}

function toCofrinhoPayload() {
  const rows = [];
  for (let p = 0; p < state.qtJogadores; p++) {
    for (let c = 0; c < MAX_COFRINHOS; c++) {
      for (let r = 0; r < state.rodadas; r++) {
        const v = state.jogadoresCofrinhos[p][c][r];
        if (v !== 0) rows.push({ jogador: p, cofrinho: c, rodada: r, valor: v });
      }
    }
  }
  return rows;
}

function toBensPayload() {
  const rows = [];
  for (let p = 0; p < state.qtJogadores; p++) {
    for (let b = 0; b < MAX_BENS; b++) {
      const q = state.jogadoresBens[p][b];
      if (q !== 0) rows.push({ jogador: p, bem: b, qtde: q });
    }
  }
  return rows;
}

function toAcoesPayload() {
  const rows = [];
  for (let p = 0; p < state.qtJogadores; p++) {
    for (let a = 0; a < MAX_ACOES; a++) {
      const q = state.jogadoresAcoes[p][a];
      if (q !== 0) rows.push({ jogador: p, acao: a, qtde: q, vlAcao: state.valorAcao[a] });
    }
  }
  return rows;
}

function toJogadoresPayload() {
  return Array.from({ length: state.qtJogadores }, (_, p) => ({
    nrJogador:    p,
    noJogador:    state.jogadores[p],
    vlDinheiro:   state.jogadoresDinheiro[p],
    vlDeve:       state.jogadoresEmprestimos[p],
    nrPosicao:    state.jogadoresPosicao[p],
    aoPresente:   state.jogadoresPresentes[p],
    sysUserId:    state.jogadoresSysId[p] || null,
    noPersonagem: state.jogadoresPersonagem[p] || null,
  }));
}

function toExtratoPayload() {
  return state.extrato.map((e, seq) => ({
    seq,
    jogador:      e.jogador,
    rodada:       e.rodada,
    tipo:         e.tipo,
    descricao:    e.descricao ?? '',
    valor:        e.valor ?? 0,
    dadoValor:    e.dadoValor ?? null,
    perguntaId:   e.perguntaId ?? null,
    acertou:      e.acertou ?? null,
    cofrinhoIdx:  e.cofrinhoIdx ?? null,
    bemIdx:       e.bemIdx ?? null,
    acaoIdx:      e.acaoIdx ?? null,
    salarioRodada: e.salarioRodada ?? null,
    peJuros:      e.peJuros ?? null,
    peRendimento: e.peRendimento ?? null,
    peImpostos:   e.peImpostos ?? null,
    vlIncremento: e.vlIncremento ?? null,
    saldoAntes:   e.saldoAntes ?? 0,
    saldoDepois:  e.saldoDepois ?? 0,
    dividaAntes:  e.dividaAntes ?? 0,
    dividaDepois: e.dividaDepois ?? 0,
  }));
}

function toSavePayload() {
  return {
    gameId:    state.gameId,
    tabuleiro: toTabuleiroPayload(),
    cofrinhos: toCofrinhoPayload(),
    bens:      toBensPayload(),
    acoes:     toAcoesPayload(),
    jogadores: toJogadoresPayload(),
    extrato:   toExtratoPayload(),
  };
}

// ── Deserializer ← resposta API ───────────────────────────────────────────────

function fromLoadResponse(data) {
  const t = data.tabuleiro;
  state.gameId           = t.game_id;
  state.salario          = parseFloat(t.vl_salario);
  state.rodada           = parseInt(t.nr_rodada);
  state.jogador          = parseInt(t.nr_jogador);
  state.rodadas          = parseInt(t.qt_rodadas);
  state.qtJogadores      = parseInt(t.qt_jogadores);
  state.tempo            = parseInt(t.qt_tempo);
  state.incremento       = parseFloat(t.vl_incremento);
  state.juros            = parseFloat(t.pe_juros);
  state.taxaImpostos     = parseFloat(t.pe_impostos);
  state.rendimento       = parseFloat(t.pe_rendimento);
  state.ensinaAcoes      = t.ao_ensina_acoes ? t.ao_ensina_acoes.trim() : 'N';
  state.proximaPergunta  = parseInt(t.nr_proximapergunta);
  state.tipoDado         = parseInt(t.ao_tipodado);
  state.emiteSom         = parseInt(t.ao_som);
  state.valorBem         = [t.vl_bem1, t.vl_bem2, t.vl_bem3, t.vl_bem4].map(parseFloat);
  state.despesaBem       = [t.pe_bem1, t.pe_bem2, t.pe_bem3, t.pe_bem4].map(parseFloat);
  state.dividendos       = [t.pe_acao1, t.pe_acao2, t.pe_acao3, t.pe_acao4, t.pe_acao5].map(parseFloat);
  state.valorAcao        = [t.vl_acao1, t.vl_acao2, t.vl_acao3, t.vl_acao4, t.vl_acao5].map(parseFloat);
  try {
    state.casasDonos = JSON.parse(t.ao_casas_donos || 'null') || new Array(64).fill(null);
  } catch { state.casasDonos = new Array(64).fill(null); }
  try {
    state.jogadoresBancoUso = JSON.parse(t.ao_banco_uso || 'null') || Array(MAX_JOGADORES).fill(null);
  } catch { state.jogadoresBancoUso = Array(MAX_JOGADORES).fill(null); }

  initState();

  data.jogadores.forEach(j => {
    const p = j.nr_jogador;
    state.jogadores[p]            = j.no_jogador;
    state.jogadoresDinheiro[p]    = parseFloat(j.vl_dinheiro);
    state.jogadoresEmprestimos[p] = parseFloat(j.vl_deve);
    state.jogadoresPosicao[p]     = parseInt(j.nr_posicao);
    state.jogadoresPresentes[p]   = j.ao_presente ? j.ao_presente.trim() : 'S';
    state.jogadoresSysId[p]      = j.sys_user_id ?? null;
    state.jogadoresFotos[p]      = j.user_foto ?? null;
    state.jogadoresPersonagem[p] = j.no_personagem ?? null;
  });

  data.cofrinhos.forEach(c => {
    state.jogadoresCofrinhos[c.jogador][c.cofrinho][c.rodada] = parseFloat(c.valor);
  });

  data.acoes.forEach(a => {
    state.jogadoresAcoes[a.jogador][a.acao] = parseInt(a.qtde);
    state.valorAcao[a.acao] = parseFloat(a.vl_acao);
  });

  data.bens.forEach(b => {
    state.jogadoresBens[b.jogador][b.bem] = parseInt(b.qtde);
  });

  state.extrato = (data.extrato || []).map(e => ({
    jogador:      e.jogador,
    rodada:       e.rodada,
    tipo:         e.tipo,
    descricao:    e.descricao || '',
    valor:        parseFloat(e.valor),
    dadoValor:    e.dado_valor != null ? parseInt(e.dado_valor) : null,
    perguntaId:   e.pergunta_id != null ? parseInt(e.pergunta_id) : null,
    acertou:      e.acertou != null ? e.acertou : null,
    cofrinhoIdx:  e.cofrinho_idx != null ? parseInt(e.cofrinho_idx) : null,
    bemIdx:       e.bem_idx != null ? parseInt(e.bem_idx) : null,
    acaoIdx:      e.acao_idx != null ? parseInt(e.acao_idx) : null,
    salarioRodada: e.salario_rodada != null ? parseFloat(e.salario_rodada) : null,
    peJuros:      e.pe_juros != null ? parseFloat(e.pe_juros) : null,
    peRendimento: e.pe_rendimento != null ? parseFloat(e.pe_rendimento) : null,
    peImpostos:   e.pe_impostos != null ? parseFloat(e.pe_impostos) : null,
    vlIncremento: e.vl_incremento != null ? parseFloat(e.vl_incremento) : null,
    saldoAntes:   parseFloat(e.saldo_antes) || 0,
    saldoDepois:  parseFloat(e.saldo_depois) || 0,
    dividaAntes:  parseFloat(e.divida_antes) || 0,
    dividaDepois: parseFloat(e.divida_depois) || 0,
  }));
}

export {
  state, initState,
  salarioDaRodada, calcCofrinho, calcNetWorth, calcRanking, calcValorMercadoBem,
  toSavePayload, fromLoadResponse,
};
