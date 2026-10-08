# Padrão Visual da IHM — TermoControl

**Data:** 30/09/2026 · Base: ISA-101 (IHM de alto desempenho) e ISA-18.2 (alarmes)

> Coloque em `docs/PADRAO_VISUAL.md`. **Toda tela nova ou alterada segue este documento.** Se algum valor não estiver aqui, pergunte antes de inventar.
>
> **Referência visual aprovada:** imagens em `docs/referencia/` (Visão Geral, Detalhe do Aquecedor 01 e folha de padrão). Reproduza o layout, as cores, os tamanhos e o alinhamento dessas imagens. Os valores numéricos nelas são só de exemplo.

---

## 1. Diagnóstico medido (versão de 30/09)

As telas foram abertas num navegador e medidas elemento por elemento, com o ESP32 simulado.

| Item | Encontrado | Padrão |
|---|---|---|
| Tamanhos de fonte | **11 diferentes**: 6, 8, 9, 10, 11, 12, 14, 18, 20, 24 e 30 px | **5 tamanhos**, mínimo 12 px |
| Texto de 6 a 10 px | 90 ocorrências (SRV/ESP, escalas, rótulos) | Proibido: ilegível a 1–2 m do monitor |
| Título de página | 3 estilos: 24 px em caixa alta espaçada (Aquecedor, Tanque, Eventos) × 30 px normal (GLP, Alarmes, Mapa, Config) | Um estilo só |
| Pesos | 900 (`font-black`) usado 131 vezes, mas a fonte só é carregada até 700: o navegador simula o negrito | 400 / 600 / 700 |
| Fonte | Inter vem do Google Fonts. **Sem internet na planta, cai para a fonte do sistema** (aconteceu no teste) | Fonte instalada no próprio projeto |
| Espaçamento de letras | 6 valores diferentes | 2 (normal e rótulo) |
| Cantos arredondados | 8 raios (4 a 32 px) | 2 (4 e 8 px) |
| Cores | 11 famílias de cor e 27 cores hexadecimais soltas no código | Tokens da seção 3 |
| Tema | Menu escuro + conteúdo claro + sinóptico escuro + card GLP escuro | Um tema só |
| Textos dentro do SVG | Mudam de tamanho com a janela (≈9 px em 1366, ≈18 px em 1920) | Texto fora do SVG (seção 6) |
| Números | Largura variável: os dígitos "dançam" quando o valor muda | Números tabulares |

**Defeitos visuais vistos nas capturas:**
- Na Visão Geral, o painel "Estado geral" fica **por cima do tanque**, e o título dele fica escondido.
- A chama é desenhada **fora** da caixa do aquecedor.
- A metade de cima do sinóptico fica vazia.
- O AQ01 queimando **normalmente** aparece **amarelo** ("aviso"). Amarelo é só para aviso.
- "SEM DADOS" aparece **branco sobre branco** no quadro de estado (ilegível).
- As barras analógicas são sempre roxas. As linhas de limite não têm rótulo. A unidade tem estilos diferentes ("73.1 °C" × "2.4  bar").
- Os botões de comando têm cor pastel e parecem desabilitados. "BLOQUEAR QUEIMADOR" se confunde com o bloqueio do LFL.
- Códigos técnicos aparecem crus na tela ("STOP_COMMANDED", "PUMP_NOT_CONFIRMED").
- Mistura de português e inglês ("BOMBA: Off", "ACK", "Databook", "Tags").
- "Bloqueios 24h: 1.0": contagem com casa decimal.
- Etiqueta "BAR" com 6 px no tanque.
- As fases mostram "Ignição", que o firmware nunca envia, e não mostram "Aguardando bomba", que o firmware envia.
- Subtítulos sem função ("Supervisão de malha fechada", "Estabilização de pressão").
- Em **1366×768**, a Visão Geral e o detalhe do aquecedor precisam de rolagem.

---

## 2. Informações que NÃO podem sumir (inventário)

Ao redesenhar, confira esta lista tela por tela. Os itens marcados **(voltar)** existiam antes e sumiram na versão atual.

**Visão Geral**, por aquecedor:
- fase do queimador;
- temperatura do PT100;
- temperatura PV e setpoint do Novus **(voltar)**;
- modulação;
- pressão;
- bomba: comando e retorno;
- bloqueio;
- alarme ativo.

Gerais: tanque (pressão, nível, bomba), estoque de GLP e comunicação.

**Detalhe do aquecedor:**
- fase;
- permissão;
- restrições (traduzidas);
- cadeia de segurança;
- temperatura do PT100;
- PV, SP e modo Auto/Manual do Novus **(voltar)**;
- comunicação com o Novus;
- pressão;
- modulação;
- bomba: comando e retorno **(voltar)**;
- horas de queima;
- partidas;
- bloqueios em 24 h;
- alarmes do equipamento **(voltar)**;
- tendência 1 h / 8 h / 24 h **(voltar)**;
- comandos com o motivo de cada botão desabilitado.

**Tanque:** pressão, nível (ou "N/M" se não houver sensor), boias alta/baixa, bomba e modo, setpoint.

**Todas as telas:**
- barra superior: planta, data e hora, comunicação (Servidor, ESP32, Novus AQ01, Novus AQ02), idade do dado, usuário ou "Modo visualização";
- faixa de alarmes **sempre visível**.

---

## 3. Tokens de cor (tema único escuro, para sala de controle)

A cor só aparece quando algo pede atenção. O normal é cinza.

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#16191D` | Fundo da aplicação |
| `--surface` | `#1F2328` | Cards e painéis |
| `--surface-2` | `#282D33` | Campos, linhas alternadas, barras vazias |
| `--border` | `#363C44` | Bordas de 1 px |
| `--text` | `#E7EAEE` | Texto e valores |
| `--text-muted` | `#9AA3AD` | Rótulos, unidades, "N/M", "SEM DADOS" |
| `--text-dim` | `#6B7480` | **Só** texto de botão desabilitado (contraste baixo de propósito) |
| `--equip-on` | `#E7EAEE` | Equipamento **ligado** (preenchimento claro) |
| `--equip-off` | `#4A515A` | Equipamento **parado**, tubo sem fluxo |
| `--alarm-crit` | `#F0616A` | **Só** contorno e texto de alarme crítico/HH/LL, bloqueio, falha |
| `--alarm-crit-fill` | `#B8322F` | **Só** fundo de alarme crítico com texto branco (faixa, badge FALHA) |
| `--alarm-warn` | `#F5A524` | **Só** aviso/H/L (texto escuro `#16191D` quando for fundo) |
| `--action` | `#3B82F6` | Marcador de setpoint, foco, borda do botão PARTIR |
| `--action-fill` | `#2F6FDB` | Fundo de botão primário (Entrar, Salvar) com texto branco |
| `--nav-active` | `#26344A` / texto `#B3CEFF` | Item de menu ativo |
| `--flame` | `#FF8A3D` | **Só** o ícone da chama quando a fase for Queimando |
| `--stop` | `#C93C3C` | Botões de PARADA |

As cores foram escolhidas para dar contraste mínimo de 4,5:1 com o fundo nos textos (WCAG AA).

**Regras:**
- Proibido usar indigo, roxo, rosa, ciano ou emerald. Toda cor sai desta tabela, via variável CSS ou tema do Tailwind.
- **Sem dados** = texto "SEM DADOS" em `--text-muted`, 12 px caixa alta, sobre fundo hachurado (`repeating-linear-gradient(135deg, #282D33 0 6px, #22262B 6px 12px)`) com borda `--border`. Nunca vermelho, nunca branco sobre branco.
- **Vermelho e amarelo nunca são decorativos.** Se estão na tela, existe um alarme.
- Alarme não reconhecido: contorno do equipamento pisca a 1 Hz. Reconhecido: contorno fixo.

---

## 4. Tipografia

**Fonte:** Inter **instalada no projeto** (pacote `@fontsource/inter`, pesos 400, 600 e 700), com `system-ui` como reserva. Remova o link do Google Fonts.

**Números:** `font-variant-numeric: tabular-nums` em todo valor de processo.

| Estilo | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|
| `label` | 12 / 16 px, CAIXA ALTA, espaçamento 0,04em | 600 | Rótulos de campo, cabeçalho de tabela, escalas |
| `body` | 14 / 20 px | 400 | Texto, tabelas, menu |
| `title-card` | 16 / 24 px | 600 | Título de card |
| `title-page` | 20 / 28 px | 700 | Título de página (um por tela) |
| `value` | 28 / 32 px | 700, tabular | Valor de processo nos cards e no sinóptico |
| `value-sm` | 16 / 20 px | 600, tabular | Valores em listas e tabelas |

- **Unidade** sempre em `body` 14 px, `--text-muted`, com 4 px de espaço depois do número: `73,1 °C`.
- **Casas decimais fixas:** temperatura 1, pressão 2, modulação 0 (em %), GLP 0 (em kg). **Contagens sem decimal.**
- **Vírgula decimal** (pt-BR). Datas no formato `30/09/2026 10:54:44`.
- Nada abaixo de 12 px. Nada acima de 28 px, exceto o valor principal do sinóptico (até 32 px).

---

## 5. Espaçamento, grade e formas

- **Grade de 8 px:** espaçamentos de 4, 8, 16, 24 e 32. Padding de card = 16 px (compacto) ou 24 px (padrão).
- **Cantos:** 4 px (badge, campo, botão pequeno) e 8 px (card, botão, painel). Nada de 12/16/24/32 px nem `rounded-full`, exceto em indicadores circulares.
- **Bordas:** 1 px `--border`. Sem sombras coloridas e sem gradientes.
- **Ícones:** Lucide com 16 px (em texto) ou 20 px (em títulos e botões), traço de 2 px. Nunca como decoração solta.
- **Layout:**
  - menu lateral de 220 px (recolhível para 64 px);
  - barra superior de 56 px;
  - faixa de alarmes de 40 px, fixa abaixo da barra superior;
  - conteúdo em grade de 12 colunas com 24 px de espaço.
- **Resolução:** 1920×1080 sem rolagem nas telas de processo (Visão Geral, AQ01, AQ02, Tanque). Em 1366×768, nenhuma rolagem horizontal, e a Visão Geral inteira visível.

---

## 6. Componentes (criar em `components/ui/` e usar em TODAS as telas)

1. **`Card`:** `--surface`, borda de 1 px, canto de 8 px, padding de 24 px, título `title-card` com ícone opcional de 20 px. Nenhuma tela monta um card "na mão".
2. **`ValueDisplay`:** rótulo (`label`), valor (`value`), unidade e qualidade. Quando a qualidade não for OK, mostra "FALHA" (vermelho), "N/M" ou "SEM DADOS" (cinza) no lugar do número. Nunca exibe um número com qualidade ruim.
3. **`StatusBadge`:** os estados Ligado · Parado · Queimando · Purga · Aguardando bomba · Pós-purga · **Bloqueio** · Falha · Sem dados. Cores somente da seção 3. Canto de 4 px, texto `label`.
4. **`AnalogBar`** (horizontal):
   - trilho `--surface-2`;
   - faixa normal em cinza claro;
   - zonas H/L em âmbar e HH/LL em vermelho **com rótulo** do limite (12 px);
   - setpoint como triângulo `--action`;
   - valor à direita em `value-sm`;
   - a barra de valor é **cinza claro** e só fica âmbar ou vermelha se estiver em alarme.
5. **`PhaseStepper`:** Parado → Aguardando bomba → Purga → Queimando → Pós-purga, exatamente as fases do firmware. **Bloqueio** aparece à parte, como faixa vermelha "BLOQUEIO — rearme no local". Nunca mostrar fase que o firmware não envia.
6. **`CommandButton`:**
   - partida: fundo `--surface-2` com borda `--action` e texto claro;
   - **parada: fundo sólido `--stop`, texto branco, sempre no mesmo lugar**;
   - desabilitado: `--text-dim` com o motivo logo abaixo em 12 px;
   - altura mínima de 44 px;
   - rótulos: **"PARTIR QUEIMADOR" / "PARAR QUEIMADOR"** e **"LIGAR BOMBA" / "DESLIGAR BOMBA"**. Nunca "bloquear/liberar".
7. **`AlarmStrip`** (faixa fixa):
   - sem alarme: "Sem alarmes ativos" em cinza;
   - com alarme: cor da severidade mais alta, o alarme mais recente, contagem de ativos e não reconhecidos, e os botões **SILENCIAR** e **RECONHECER** separados.
8. **`CommChip`** (barra superior): ícone de 16 px + texto de 12 px "SERVIDOR", "ESP32", "NOVUS AQ01", "NOVUS AQ02", com o estado em texto (OK / FALHA). Nunca só ícone e cor.
9. **`DataTable`:** cabeçalho `label`, linhas de 40 px, `body` 14 px, datas tabulares, estado vazio com texto ("Nenhum evento no período").

---

## 7. Sinóptico (Visão Geral)

- **O SVG desenha só formas:** tubos, aquecedores, bombas, tanque. **Nenhum texto dentro do SVG.** Rótulos e valores são componentes HTML (`ValueDisplay` / `StatusBadge`) posicionados sobre o desenho. Assim a fonte é sempre a mesma em qualquer tamanho de tela.
- **Área:** proporção 16:7, ocupando a largura, com o sinóptico inteiro visível em 1366×768.
- **Desenho:**
  - tubos com traço de 4 px, `--equip-off`;
  - linha de ida com fluxo animado discreto **só** com a bomba confirmada pelo retorno;
  - aquecedor ligado em `--equip-on`, parado em `--equip-off`, e em alarme com contorno vermelho;
  - chama **dentro** do aquecedor, só na fase Queimando.
- **Alinhamento:** os dois aquecedores alinhados pelo centro, na mesma altura. Bombas centradas sobre cada aquecedor. O tanque fica à direita, alinhado pela base dos aquecedores. Nenhum elemento sobrepõe outro.
- **Abaixo do sinóptico:** dois cards de resumo, um por aquecedor, lado a lado e com a mesma estrutura, contendo tudo da seção 2. Clicar no aquecedor abre o detalhe.
- **Legenda:** Ligado · Parado · Aviso · Alarme · Sem dados, com as cores da seção 3.

---

## 8. Textos e traduções

- **Título único por tela**, sem subtítulo decorativo.
- **Tudo em português.** O único termo técnico permitido é "PV/SP".
- **Tradução dos motivos** (`blockReasons`), exibidos sempre traduzidos:

| Código | Texto na tela |
|---|---|
| `STOP_COMMANDED` | Parada comandada pelo operador |
| `SAFETY_CHAIN_OPEN` | Cadeia de segurança aberta |
| `PUMP_NOT_CONFIRMED` | Bomba sem confirmação de funcionamento |
| `LFL_LOCKOUT` | Queimador em bloqueio — rearme no local |
| `SW_TEMP_LIMIT_LATCHED` | Limite de temperatura atuado — rearme necessário |
| `TEMP_SENSOR_FAULT` | Falha no sensor de temperatura |
| `PRESS_SENSOR_FAULT` | Falha no sensor de pressão |
| `PRESSURE_OUT_OF_RANGE` | Pressão fora da faixa |
| `ESTOP_PRESSED` | Emergência acionada |

- A tabela de tradução fica **num único arquivo** (`i18n/pt.ts`), junto com as descrições de alarme e os motivos de `ack`. Código não traduzido aparece como `Código: XYZ` e não como texto solto.

---

## 9. Checklist de aceite (cada tela)

- [ ] Só usa os componentes da seção 6. Nenhum `text-[Npx]`, nenhuma cor hexadecimal ou classe de cor fora dos tokens.
- [ ] 5 estilos de texto, no mínimo 12 px, números tabulares, vírgula decimal.
- [ ] Cantos de 4 e 8 px, espaçamentos múltiplos de 8.
- [ ] Todos os itens da seção 2 presentes.
- [ ] Sem ESP32: tudo "SEM DADOS" em cinza, sem nenhum valor padrão.
- [ ] Vermelho e amarelo aparecem só com alarme.
- [ ] Captura em 1920×1080 e 1366×768 sem sobreposição e sem rolagem horizontal.
