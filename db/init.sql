-- ============================================================
-- ECONOMIA DOS MILIONÁRIOS — Schema PostgreSQL
-- ============================================================

-- ── Usuários ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS economia_usuarios (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  email     VARCHAR(150) NOT NULL UNIQUE,
  senha     VARCHAR(100) NOT NULL,
  tipo      CHAR(1) NOT NULL DEFAULT 'C',     -- C=Comum, A=Administrador
  situacao  CHAR(1) NOT NULL DEFAULT 'I',     -- A=Ativo, I=Inativo
  foto      TEXT                               -- base64 data URL
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON economia_usuarios(email);

CREATE TABLE IF NOT EXISTS economia_tabuleiro (
  game_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             INTEGER NOT NULL DEFAULT 1,
  saved_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  no_estado           VARCHAR(100),

  vl_salario          NUMERIC(12,2) NOT NULL DEFAULT 4,
  nr_rodada           INTEGER NOT NULL DEFAULT 1,
  nr_jogador          INTEGER NOT NULL DEFAULT 1,

  qt_rodadas          INTEGER NOT NULL DEFAULT 30,
  qt_jogadores        INTEGER NOT NULL DEFAULT 6,
  qt_tempo            INTEGER NOT NULL DEFAULT 360,
  vl_incremento       NUMERIC(12,2) NOT NULL DEFAULT 2,
  pe_juros            NUMERIC(5,2) NOT NULL DEFAULT 10,
  pe_impostos         NUMERIC(5,2) NOT NULL DEFAULT 30,

  vl_bem1  NUMERIC(12,2) NOT NULL DEFAULT 10,
  vl_bem2  NUMERIC(12,2) NOT NULL DEFAULT 20,
  vl_bem3  NUMERIC(12,2) NOT NULL DEFAULT 50,
  vl_bem4  NUMERIC(12,2) NOT NULL DEFAULT 100,
  pe_bem1  NUMERIC(5,2)  NOT NULL DEFAULT 10,
  pe_bem2  NUMERIC(5,2)  NOT NULL DEFAULT 10,
  pe_bem3  NUMERIC(5,2)  NOT NULL DEFAULT 10,
  pe_bem4  NUMERIC(5,2)  NOT NULL DEFAULT 10,

  pe_acao1  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  pe_acao2  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  pe_acao3  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  pe_acao4  NUMERIC(5,2)  NOT NULL DEFAULT 20,
  pe_acao5  NUMERIC(5,2)  NOT NULL DEFAULT 20,
  vl_acao1  NUMERIC(12,2) NOT NULL DEFAULT 5,
  vl_acao2  NUMERIC(12,2) NOT NULL DEFAULT 20,
  vl_acao3  NUMERIC(12,2) NOT NULL DEFAULT 5,
  vl_acao4  NUMERIC(12,2) NOT NULL DEFAULT 15,
  vl_acao5  NUMERIC(12,2) NOT NULL DEFAULT 15,

  nr_proximapergunta  INTEGER NOT NULL DEFAULT 1,
  ao_tipodado         SMALLINT NOT NULL DEFAULT 0,
  ao_som              SMALLINT NOT NULL DEFAULT 1,
  pe_rendimento       NUMERIC(5,2) NOT NULL DEFAULT 10,
  ao_ensina_acoes     CHAR(1) NOT NULL DEFAULT 'N',
  ao_casas_donos      TEXT,
  ao_banco_uso        TEXT
);

CREATE INDEX idx_tabuleiro_user_saved
  ON economia_tabuleiro(user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS economia_cofrinho (
  id        BIGSERIAL PRIMARY KEY,
  game_id   UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL DEFAULT 1,
  jogador   SMALLINT NOT NULL,
  cofrinho  SMALLINT NOT NULL,
  rodada    SMALLINT NOT NULL,
  valor     NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_cofrinho_game ON economia_cofrinho(game_id);

CREATE TABLE IF NOT EXISTS economia_bens (
  id       BIGSERIAL PRIMARY KEY,
  game_id  UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL DEFAULT 1,
  jogador  SMALLINT NOT NULL,
  bem      SMALLINT NOT NULL,
  qtde     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_bens_game ON economia_bens(game_id);

CREATE TABLE IF NOT EXISTS economia_acoes (
  id       BIGSERIAL PRIMARY KEY,
  game_id  UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL DEFAULT 1,
  jogador  SMALLINT NOT NULL,
  acao     SMALLINT NOT NULL,
  qtde     INTEGER NOT NULL DEFAULT 0,
  vl_acao  NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_acoes_game ON economia_acoes(game_id);

CREATE TABLE IF NOT EXISTS economia_jogadores (
  id          BIGSERIAL PRIMARY KEY,
  game_id     UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL DEFAULT 1,
  nr_jogador    SMALLINT NOT NULL,
  no_jogador    VARCHAR(100) NOT NULL DEFAULT '',
  vl_dinheiro   NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_deve       NUMERIC(12,2) NOT NULL DEFAULT 0,
  nr_posicao    SMALLINT NOT NULL DEFAULT 0,
  ao_presente   CHAR(1) NOT NULL DEFAULT 'S',
  sys_user_id   INTEGER REFERENCES economia_usuarios(id) ON DELETE SET NULL,
  no_personagem TEXT
);
CREATE INDEX idx_jogadores_game ON economia_jogadores(game_id);

CREATE TABLE IF NOT EXISTS economia_perguntas (
  id        SMALLINT PRIMARY KEY,
  pergunta  TEXT NOT NULL,
  resposta  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS economia_extrato (
  id             BIGSERIAL PRIMARY KEY,
  game_id        UUID NOT NULL REFERENCES economia_tabuleiro(game_id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL DEFAULT 1,
  jogador        SMALLINT NOT NULL,
  rodada         SMALLINT NOT NULL,
  seq            INTEGER NOT NULL DEFAULT 0,
  tipo           VARCHAR(30) NOT NULL,
  descricao      TEXT,
  valor          NUMERIC(12,2) NOT NULL DEFAULT 0,
  dado_valor     SMALLINT,
  pergunta_id    SMALLINT,
  acertou        BOOLEAN,
  cofrinho_idx   SMALLINT,
  bem_idx        SMALLINT,
  acao_idx       SMALLINT,
  salario_rodada NUMERIC(12,2),
  pe_juros       NUMERIC(5,2),
  pe_rendimento  NUMERIC(5,2),
  pe_impostos    NUMERIC(5,2),
  vl_incremento  NUMERIC(12,2),
  saldo_antes    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_depois   NUMERIC(12,2) NOT NULL DEFAULT 0,
  divida_antes   NUMERIC(12,2) NOT NULL DEFAULT 0,
  divida_depois  NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_extrato_game ON economia_extrato(game_id, jogador, rodada);

-- ============================================================
-- SEED: 38 perguntas (extraídas do ECONOMIA_TABULEIRO_PCK.pck)
-- ============================================================
INSERT INTO economia_perguntas (id, pergunta, resposta) VALUES
(1,  'O que o dinheiro representa?',
     '<p>Dinheiro é um meio de troca que as pessoas usam para comprar bens e serviços.</p><p>Ele é gerado pelo governo do país e representa a quantidade de bens e serviços existentes.</p><p>Se tiver mais dinheiro do que bens e serviços, o <strong>preço</strong> das coisas subirá e o dinheiro desvalorizará, isso é <strong>inflação</strong>; e se ocorrer o contrário, o preço das coisas cairá e o dinheiro valorizará, isso é <strong>deflação</strong>.</p><p>Cuidado com o cartão e com o cheque, porque quando o cartão é passado na maquininha ou um cheque é preenchido, aquele valor sairá da sua conta na hora que for cobrado por quem recebeu.</p>'),

(2,  'Por que os preços sobem?',
     '<p>Geralmente porque existe menos produtos do que dinheiro, ou porque muita gente passou a querer aquele produto.</p>'),

(3,  'Por que os preços caem?',
     '<p>Geralmente porque existe MAIS produto do que dinheiro, ou porque ninguém quer aquele produto.</p>'),

(4,  'Por que não adianta o governo imprimir dinheiro?',
     '<p>Porque se não tiver produtos, isso só vai gerar inflação e o valor do dinheiro se perderá.</p>'),

(5,  'O que é inflação?',
     '<p>É quando os preços aumentam.</p>'),

(6,  'O que é deflação?',
     '<p>É quando os preços diminuem.</p>'),

(7,  'Devemos ter no mínimo 4 cofrinhos. Quais são eles?',
     '<p><ul><li>Emergências</li><li>Sonhos</li><li>Aposentadoria</li><li>Doações</li></ul></p>'),

(8,  'O que eu preciso fazer para ter uma aposentadoria?',
     '<p>Guardar todo mês um pouquinho do que eu ganho em algum investimento que vai me dar juros compostos.</p>'),

(9,  'Quais tipos de dinheiro ou Meios de Pagamento existem?',
     '<p><ul><li>Moeda Física</li><li>Moeda Digital</li><li>Cartão de Crédito ou Débito</li><li>PIX</li><li>Cheque</li><li>Criptomoeda</li><li>etc</li></ul></p>'),

(10, 'Qual a diferença entre cartão de crédito e débito?',
     '<p>No Crédito eu vou comprando até atingir meu limite e pago somente no vencimento de minha fatura.</p><p>No Débito o valor gasto sai da minha conta na mesma hora, e caso eu não tenha, a operação será negada.</p>'),

(11, 'O que são juros?',
     '<p>É um acréscimo sobre o valor emprestado.</p>'),

(12, 'O que é renda?',
     '<p>É algum valor que recebo por ter trabalhado ou algum retorno de rendimentos de aplicações que fiz.</p>'),

(13, 'Como o banco consegue LUCRAR emprestando dinheiro?',
     '<p>Através da intermediação entre pessoas. Exemplo: ele guarda dinheiro das pessoas e paga um juro menor a elas do que empresta para outras pessoas.</p><p>Por isso ele tem lucro com essa operação e consegue emprestar.</p>'),

(14, 'O que é despesa?',
     '<p>É algo que me custa por ter algum bem ou serviço, como por exemplo um celular, um carro, uma moto, uma casa, etc.</p>'),

(15, 'Dê um exemplo de consumismo.',
     '<p>É quando a pessoa gasta mais do que tem e geralmente comprando coisas que não precisa para mostrar para aqueles que não gostam dela.</p>'),

(16, 'O que é um empréstimo?',
     '<p>É quando alguma pessoa ou empresa pega um valor a juros prometendo devolver em algum prazo combinado.</p>'),

(17, 'Por que tenho que pagar o empréstimo?',
     '<p>Senão meu nome ficará sujo e posso ser prejudicado em meu emprego e contas bancárias, além de não conseguir um empréstimo se tiver alguma emergência. Além do mais isso é errado: se eu comprei algo e prometi pagar preciso ser fiel à minha promessa.</p>'),

(18, 'O que são juros e multas?',
     '<p>Os juros são uma quantia que aumenta o valor de um empréstimo de dinheiro ou compra de algum produto.</p><p>Juros também é o que se recebe quando emprestamos o dinheiro para alguém ou para um BANCO em algum tipo de investimento ou poupança.</p><p>A multa é uma punição por não ter pago na data combinada, além da multa serão cobrados novos juros pelo tempo que se demorou a mais para pagar.</p>'),

(19, 'O que é dinheiro?',
     '<p>Dinheiro é um meio de troca que as pessoas usam para comprar bens e serviços.</p><p>Dinheiro representa algum valor. Na realidade o dinheiro em si não vale nada, mas sim o que ele representa no momento.</p><p>Ele é gerado pelo governo do país e representa a quantidade de bens e serviços existentes.</p>'),

(20, 'Como funciona a inflação e a deflação?',
     '<p>A inflação é o aumento geral dos PREÇOS dos bens e serviços em uma economia ao longo do tempo.</p><p>A deflação é quando os PREÇOS diminuem.</p><p>Exemplo: Em determinado ano a produção de tomate caiu muito porque choveu demais e começou a faltar a mercadoria, então houve inflação porque o preço do tomate subiu.</p><p>Já em outro ano todas as fazendas tiveram uma grande colheita de tomates e com isso começou a sobrar a mercadoria, então houve deflação porque preço do tomate caiu.</p><p>Isso é o que significa OFERTA e DEMANDA ou OFERTA e PROCURA.</p>'),

(21, 'Como os preços são definidos? Fale sobre a lei da oferta e demanda.',
     '<p>Os preços são definidos pela oferta e demanda, ou oferta e procura de um produto ou serviço.</p><p>Se muitas pessoas querem comprar algo e há pouca oferta, o preço sobe.</p><p>Sempre que fazemos uma compra é preciso analisar o preço do produto.</p>'),

(22, 'O que é poupança? Fale sobre os cofrinhos!',
     '<p>Poupança é uma forma de guardar dinheiro para usar no futuro. É uma reserva financeira que pode ser usada em caso de emergência ou para realizar um objetivo específico.</p><p>Por exemplo: você pode separar seu dinheiro em cofrinhos diferentes e definir o destino para cada quantia.</p><p>É bom separar dinheiro em potes: o que será poupado para o futuro, o que será gasto em emergências e um pote para doações.</p>'),

(23, 'Como fazer um Orçamento ou Planejamento De Renda?',
     '<p>Orçamento é um plano financeiro que ajuda você a controlar seus gastos e economizar dinheiro (POUPAR NO COFRINHO).</p><p>Precisamos desenvolver a ideia de que o planejamento de recursos (recebidos e gastos) é muito importante para termos uma vida organizada e em momentos de crises não ficarmos desesperados ou precisarmos pegar dinheiro a JUROS.</p>'),

(24, 'O que é renda passiva e renda ativa?',
     '<p>Renda é o dinheiro que você ganha por INVESTIR em algo, ou como recompensa pelo seu TRABALHO.</p><p>Existe renda Passiva, que é aquela que você recebe sem trabalhar e renda Ativa que é o fruto direto do trabalho.</p>'),

(25, 'O que é consumo? Fale sobre despesa.',
     '<p>Consumo é quando você usa um produto ou serviço para satisfazer uma necessidade ou desejo pessoal.</p><p>O consumismo é um problemão! Ele é gerado pela compulsão.</p><p>Entenda a diferença entre vontade e necessidade.</p>'),

(26, 'Como funciona o crédito?',
     '<p>O crédito é um empréstimo que você recebe de uma instituição financeira ou de outra pessoa. Você pode usar o crédito para comprar algo agora e pagar depois.</p><p>É preciso entender a importância de que o objeto ou dinheiro emprestado deve ser devolvido no prazo.</p>'),

(27, 'O que é inadimplência?',
     '<p>Inadimplência é quando alguém não cumpre com uma obrigação financeira, ou seja, não realiza algum pagamento que foi combinado até a sua data de vencimento.</p><p>Isso vai gerar mais JUROS e MULTAS e o valor só vai subindo se não pagar logo.</p>'),

(28, 'E o que são juros e multas? (revisão)',
     '<p>Os juros são uma quantia que aumenta o valor de um empréstimo de dinheiro ou compra de algum produto.</p><p>Os juros são para quem emprestou (esse é CREDOR) uma compensação pelo tempo em que ele ficou sem utilizar o valor emprestado ao outro (esse é o DEVEDOR).</p><p>A multa é uma punição por não ter pago na data combinada.</p>'),

(29, 'O que é trabalho?',
     '<p>Trabalho é uma atividade que realizamos para produzir algo ou prestar um serviço em troca de uma remuneração.</p><p>O trabalhador está no trabalho porque precisa do dinheiro e o empregador quer o trabalhador porque não consegue ou não sabe fazer tudo sozinho.</p><p>Receber salário não é favor — é recompensa.</p>'),

(30, 'O que é investimento?',
     '<p>Investimento é quando você usa seu dinheiro para comprar algo que pode gerar mais dinheiro no futuro, como AÇÕES ou IMÓVEIS.</p><p>O dinheiro aplicado pode crescer se for feita uma escolha boa, mas também pode diminuir se for feita uma escolha ruim.</p>'),

(31, 'Fale sobre Tipos de investimentos.',
     '<p>Investir é colocar seu dinheiro em alguma coisa que você acredita que vai fazer seu dinheiro aumentar.</p><p><strong>Ação</strong> é um pedacinho de uma empresa.</p><p><strong>Imóveis</strong> é quando se compra uma casa, um prédio, um comércio.</p><p><strong>Renda fixa</strong> é quando se empresta dinheiro para uma pessoa ou empresa e já se combina qual será a taxa de juros cobrada.</p><p><strong>Moedas internacionais</strong> como Dólar, Euro, etc.</p><p><strong>Criptomoeda</strong> é uma forma de dinheiro digital que usa criptografia para proteger e verificar transações.</p>'),

(32, 'O que é câmbio?',
     '<p>É a diferença de valor entre uma moeda e outra. Exemplo: em 28/04/2023, para comprar 1 dólar precisamos de R$ 4,99 reais.</p>'),

(33, 'O que são impostos?',
     '<p>Impostos são valores pagos ao governo pelos cidadãos e empresas para financiar serviços públicos.</p><p>Por exemplo, quando você compra os itens abaixo você paga de impostos:</p><ul><li>Pão Francês - 16,86%</li><li>Arroz - 17,24%</li><li>Feijão - 17,24%</li><li>Fermento - 38,48%</li><li>Pizza - 36,54%</li><li>Manteiga - 33,77%</li></ul>'),

(34, 'O que são os Bancos?',
     '<p>Os bancos são apenas intermediários entre pessoas e empresas na economia.</p><p>Um banco pega o dinheiro de alguém para guardar e promete devolver com JUROS, enquanto isso ele empresta esse mesmo dinheiro para outra pessoa e cobra dela JUROS maiores para que consiga pagar o que prometeu e ainda ficar com uma parte para ele por causa do serviço prestado e por causa do risco de INADIMPLÊNCIA.</p><p>Taxa de Juros para guardar: 0,6% ao mês / Taxa de Juros para emprestar: 9% ao mês.</p>'),

(35, 'O que é um CREDOR?',
     '<p>É a pessoa ou empresa que empresta valores à outra pessoa ou empresa.</p>'),

(36, 'O que é um DEVEDOR?',
     '<p>É a pessoa ou empresa que pega emprestado valores de outra pessoa ou empresa.</p>'),

(37, 'O que é porcentagem?',
     '<p>Porcentagem é uma forma de representar uma parte de um todo em relação a 100 partes iguais.</p><p>Por exemplo, se você tem 100 balas e quer dar 10 balas para um amigo, você está dando 10% das balas para ele.</p><p>Outro exemplo é pegar R$ 100,00 emprestado com uma taxa de juros de 10%. Isso quer dizer que no prazo combinado pagaremos R$ 110,00 para quem nos emprestou.</p><p>Juros, multas, renda e dividendos são calculados através de porcentagens.</p>'),

(38, 'Fale sobre A lei do retorno.',
     '<p>A Lei do retorno é um conceito de que cada atitude que fazemos em algum momento volta para nós mesmos.</p><p>Em outras palavras, se fazemos o bem ajudando alguém, teremos coisas boas, mas se fazemos o mal o retorno para nós em algum momento será ruim também.</p><p>É como lançar uma semente na terra: se for um pé de fruta, daqui uns anos comeremos fruta; mas se for um espinheiro, daqui uns anos vamos nos furar nele.</p>');
