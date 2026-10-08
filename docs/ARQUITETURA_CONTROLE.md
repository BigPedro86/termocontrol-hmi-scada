# Arquitetura de Controle — TermoControl

**Data:** 29/09/2026 (rev. 3, com os esquemas do queimador e do Novus) · **Status:** base para o firmware. Os itens marcados ⚠️ dependem de confirmação em campo.

> Coloque em `docs/ARQUITETURA_CONTROLE.md`. Este documento **tem prioridade** sobre `docs/REVISAO_SEGURANCA.md` onde os dois divergirem: sempre que a revisão falar em "validar no servidor", a decisão passa a ser do **ESP32**.

**Planta confirmada:**
- **2 aquecedores de água** (AQ01 e AQ02), a GLP.
- **1 queimador por aquecedor:** Riello da série **RS/M** (modulante), com programador de chama **Siemens LFL1.333**.
- Controlador **Novus N2000S-485-24V**. O código do modelo mostra que ele **tem RS-485 (Modbus RTU)**, nos terminais 25/26/27.
- Esquema elétrico: etiqueta do queimador (fotografada no painel) e etiqueta do Novus.

---

## 1. Princípio

**Toda a lógica de processo e de intertravamento fica no ESP32.** O HTML só **mostra** o que o ESP32 publica e **envia pedidos**. Quem aceita ou recusa é o ESP32, e ele informa o motivo.

| Camada | Equipamento | Responsabilidade | O que **não** faz |
|---|---|---|---|
| **0 · Segurança (hardware)** | **LFL1.333**, TS, PG, pressostato de ar, válvulas VS+VR, emergência | Sequência do queimador, chama, bloqueio, cortes | Não depende do ESP32 nem da rede |
| **0 · Regulação local** | **Novus N2000S** | Modula o servomotor do queimador | Não é dispositivo de segurança |
| **1 · Controle (ESP32)** | ESP32 | **Toda a lógica**: permissões, intertravamentos extras, modos, validação de pedidos, bombas, alarmes, supervisão da sequência, leitura do Novus, parada de 24 h | Não aciona válvula, ignição nem ventilador. Não rearma o LFL. Nunca contorna a camada 0 |
| **2 · Supervisão (servidor)** | PC com Node | Porteiro (autentica e carimba usuário e perfil), escrivão (auditoria e histórico), carteiro (repassa) | Não decide nada de processo |
| **2 · Supervisão (HTML)** | Navegador | Ilustrar e enviar pedidos | Não calcula, não valida, não inventa dado |

**Regra de ouro:** o ESP32 só consegue **retirar a permissão** do queimador. Quem acende é sempre o LFL, com pré-purga e supervisão de chama.

---

## 2. Equipamentos existentes

### 2.1 Queimador Riello RS/M: leitura da etiqueta de ligação

A legenda abaixo é a **legenda padrão da Riello** aplicada à etiqueta fotografada. ⚠️ Confirme no manual do modelo exato (placa do queimador) e com multímetro, **com o queimador desenergizado**.

| Sigla | Significado | Papel |
|---|---|---|
| **MB** | Régua de bornes do queimador | Onde se fazem as ligações externas |
| **F** | Fusíveis da linha (tabela na etiqueta: T6 a T16 ou 25 A, conforme o modelo e a tensão) | Proteção |
| **TL** | Termostato ou pressostato **limite (de controle)** | **Desliga normalmente** o queimador ao atingir o valor. **É aqui que entra o contato do ESP32** |
| **TS** | Termostato ou pressostato **de segurança** | Corte de segurança. ⚠️ Verificar se é de **rearme manual** |
| **IN** | Interruptor manual de parada do queimador | Parada local |
| **S** | **Sinal de bloqueio remoto** (lâmpada 230 V) | **Entrada do ESP32**: queimador em bloqueio |
| **TR** | Termostato ou regulação de potência | Na versão /M, a modulação é feita pelo regulador. Aqui, pelo Novus |
| **PG** | Pressostato de gás de **mínima** | Segurança do gás |
| **VR / VS** | Válvula de **regulação** e válvula de **segurança** | As duas válvulas automáticas em série (NBR 12313) ✓ |
| **VPS** | Controle de estanqueidade das válvulas (opcional) | ⚠️ Verificar se está instalado |
| **XP** | Tomada do VPS | — |
| **4 · 5 · V** | Conexão do trem de gás: 4-5 = pressostato PG, V = alimentação das válvulas | **V energizado = válvulas de gás abertas = queimando** |
| **L1 L2 L3** | Motor trifásico do ventilador | — |

**Itens de segurança para conferir em campo** (a etiqueta não mostra todos):
- **pressostato de ar** (normalmente interno ao queimador);
- **pressostato de gás de máxima** (a NBR 12313 pede proteção contra alta pressão de gás);
- **TS com rearme manual**;
- **VPS** instalado ou não.

### 2.2 Siemens LFL1.333 (um por queimador)

Dados da etiqueta: 230 V~, ts máx. 3 s, tv 31 s. Pelo data sheet CC1N7451, a 50 Hz:
- pré-purga de **31 s**;
- TSA (tempo de segurança) de **3 s**;
- pós-purga de **18 s**;
- perda de chama leva a **bloqueio com rearme manual**;
- **operação intermitente: pelo menos um desligamento controlado a cada 24 h**.

### 2.3 Novus N2000S-485-24V: terminais (etiqueta)

| Terminais | Função |
|---|---|
| 1-2 | Alimentação 24 V (ca/cc) |
| 3-4 · 5-6 | Saídas de controle I/O4 e I/O3 (relés abrir e fechar o servomotor) |
| 7-8-9 · 10-11-12 | Alarmes I/O2 e I/O1 (NA, C, NF) |
| 13 (−) · 14 (+) | Saída 4–20 mA (I/O5) |
| 15 (+) · 16 (−) | Entrada digital (I/O6) |
| 17 (+) · 18 (−) | Fonte auxiliar 24 Vcc |
| 21-24 | Entrada do sensor (Pt100, mV, T/C, mA) |
| **25 (D1) · 26 (D0) · 27 (C)** | **RS-485 Modbus RTU** |
| 28-29-30 | Potenciômetro de posição do servomotor (só indicação, sem efeito no controle) |

⚠️ **Confirmar:**
- quantos Novus existem (um por aquecedor?);
- o que cada um mede. A placa do painel diz **"PRESSÃO VAPOR"**, mas o equipamento é aquecedor de água. Verifique o tipo de entrada configurado e **corrija a placa do painel**;
- o que aciona o **TL** hoje: um termostato próprio ou um relé de alarme do Novus.

---

## 3. Ligações ESP32 ↔ campo (por aquecedor)

> Toda ligação em 230 V deve ser feita por profissional habilitado (NR-10). No firmware, **use nomes de sinal** definidos em um único arquivo (`firmware/io_map.h`), nunca números de pino espalhados no código.

### 3.1 Saída de permissão → em série com o TL

- Um **relé de interface** com contato **NA**, energizado pelo ESP32 para permitir o queimador.
- O contato fica **em série com o TL**, no circuito de termostatos da régua MB. Abrir o contato equivale ao TL "atingido": o LFL faz um **desligamento controlado**, com pós-purga.
- **Nunca** em paralelo nem no lugar de TS, PG, IN ou do pressostato de ar.
- Se o ESP32 desligar, travar ou reiniciar, o relé abre e o queimador para de forma controlada.
- O driver do relé leva **pull-down**, para o relé não fechar no boot.

### 3.2 Entradas do queimador (230 V~ → isoladas)

Use módulos optoacoplados para 230 VAC ou relés de interface com bobina 230 VAC. **Nunca ligue 230 V em pino do ESP32.**

| Sinal | Origem na etiqueta | Uso |
|---|---|---|
| `AQx_LOCKOUT` | Sinal **S** (em paralelo com a lâmpada de bloqueio) | Alarme "Bloqueio — rearme local" e contagem de bloqueios |
| `AQx_GAS_VALVES` | Borne **V** do trem de gás (VR/VS energizadas) | **Queimando**: retorno real da chama |
| `AQx_FAN` | Contator do motor do ventilador (contato auxiliar) | Mostra a purga; detecta válvulas abertas sem ventilador |
| `AQx_CHAIN_OK` | Tensão depois de TS e IN | Mostra que a cadeia de segurança está OK |

### 3.3 Reset do LFL: proibido pelo ESP32 e pelo HTML

O rearme é **somente pelo botão local** do LFL, com o operador vendo o queimador. O ESP32 conta os bloqueios. Com **3 bloqueios em 24 h** (configurável), gera o alarme "Bloqueios repetidos — chamar manutenção".

### 3.4 Novus via RS-485 Modbus RTU

**Ligação:**
- ESP32 com **transceptor RS-485 isolado**, ligado aos terminais 25 (D1), 26 (D0) e 27 (C, referência).
- Cabo par trançado blindado, **terminação de 120 Ω** nas pontas do barramento e malha aterrada em um só ponto.
- Com dois Novus, os dois ficam no mesmo barramento, com endereços diferentes.

**Configuração no Novus:** parâmetros `bAud` (19200 ou 9600) e `Addr` (1, 2…). Formato 8 bits de dados, sem paridade, 1 stop bit.

**Registradores** (tabela oficial *N1100/N2000/N3000 – Tabela de Registradores*; o N2000S não é citado nominalmente nela):

| Endereço | Nome | Uso | Acesso na fase 1 |
|---|---|---|---|
| 0000 | SV ativo | Setpoint em uso | **Somente leitura** |
| 0001 | PV | Variável medida | Leitura |
| 0002 | MV | Saída de controle (0–1000 = 0,0–100,0 %) | Leitura: **modulação real** |
| 0006 / 0009 | Status Word 1 / 2 | Alarmes, modo Auto, RUN | Leitura |
| Status Word 3 | Erros de sensor | Qualidade da PV | Leitura |

⚠️ **Antes de usar qualquer registrador**, valide cada endereço no equipamento real: ler e comparar com o display. Funções Modbus suportadas: **03, 05 e 06** (não há função 16, então não use escrita múltipla).

**Regras:**
- **Fase 1: somente leitura.** O ESP32 não escreve nada no Novus.
- **Escrita do setpoint (fase posterior, decisão do responsável):** apenas o registrador 0000, dentro de limites guardados no ESP32, com auditoria. **Nunca** escrever modo (0046), habilitação de controle (0047) nem parâmetros de configuração.
- **Sem comunicação Modbus por 5 s:** alarme "Sem comunicação com o controlador". **O Novus continua regulando sozinho.**
- Se o Novus medir a mesma temperatura que o PT100 do ESP32, o ESP32 compara as duas e gera o alarme "Divergência de medição" quando a diferença passar de X °C (configurável).

### 3.5 Demais sinais por aquecedor

| Sinal | Tipo | Uso |
|---|---|---|
| `AQx_PUMP_CMD` | Saída a relé | Bomba de circulação |
| `AQx_PUMP_FB` | Entrada (auxiliar do contator ou fluxostato) | **Prova de circulação real** |
| `AQx_TEMP` | PT100 via MAX31865 | Temperatura própria do ESP32 |
| `AQx_PRESS` | 4–20 mA | Pressão de água (NAMUR NE43) |

Sinais gerais: `ESTOP_OK`, `BUZZER` (alarme sonoro do painel).

**Tanque de expansão TX01** (confirmado: chave de nível baixo, pressostato e bomba de reposição, sem transmissor de pressão):

| Sinal | Tipo | Ligação | Significado |
|---|---|---|---|
| `TX01_LEVEL_SW` | Entrada digital | Contato **NF**: fechado = nível normal | **Aberto = nível baixo OU fio rompido** (falha segura) |
| `TX01_PRESS_SW` | Entrada digital | Contato que **fecha com pressão baixa** | Fechado = pedido de reposição; aberto = pressão normal (fio rompido = bomba não liga, nunca sobrepressão) |
| `TX01_PUMP_CMD` | Saída a relé | Contator da bomba de reposição | — |
| `TX01_PUMP_FB` | Entrada digital | Contato auxiliar do contator | Retorno real da bomba |

**Proteção de hardware recomendada:** a chave de nível também em série com a bobina do contator da bomba de reposição, para a bomba não rodar a seco mesmo se o ESP32 falhar.

**Lógica no ESP32:**
1. **Nível baixo** (`TX01_LEVEL_SW` aberto, com atraso de confirmação de 2 s para ignorar oscilação da água):
   - bomba de reposição **bloqueada** na hora;
   - **os dois queimadores perdem a permissão na hora** (`blockReasons`: `TANK_LOW_LEVEL`);
   - **as bombas de circulação param** depois da pós-circulação (para dissipar o calor do trocador). Se a pressão de água do aquecedor cair abaixo de LL, param na hora;
   - alarme **crítico** "Nível baixo no tanque de expansão — sistema parado";
   - **trava:** depois que o nível voltar ao normal, o sistema continua parado até o rearme `TANK_LEVEL_RESET` (Supervisor ou Manutenção, auditado). A partida volta a exigir comando.
2. **Reposição automática:** bomba liga com `TX01_PRESS_SW` fechado (pressão baixa) e nível normal; desliga quando o pressostato abrir (a histerese é a do próprio pressostato).
3. **Proteções da bomba de reposição:**
   - tempo mínimo desligada entre partidas: 30 s (provisório);
   - mais de 10 partidas por hora (provisório): alarme "Reposição frequente — possível vazamento";
   - ligada por mais de 10 min seguidos (provisório): desliga, trava e alarme "Reposição prolongada — possível vazamento" (rearme por Supervisor ou Manutenção);
   - comando sem retorno em 5 s: alarme "Falha na bomba de reposição".
4. **Comandos:** `TX01_PUMP_STOP` (qualquer perfil logado; passa para Manual-Desligado) e `TX01_AUTO` (volta ao automático; Supervisor ou Manutenção). Não existe "ligar manual" da bomba de reposição.

**Na tela:** "Nível normal" / "NÍVEL BAIXO"; "Pressão normal" / "Pressão baixa"; bomba "Ligada/Desligada · Automático/Manual". Sem valor numérico. "SEM DADOS" sem comunicação.

### 3.6 Contagem de E/S (com o Novus em Modbus)

| Tipo | Por aquecedor | ×2 | Gerais | **Total** |
|---|---|---|---|---|
| Saídas a relé | 2 (permissão, bomba) | 4 | 2 (bomba de reposição TX01, buzzer) | **6** |
| Entradas digitais isoladas | 5 (bloqueio, válvulas, ventilador, cadeia OK, bomba) | 10 | 4 (emergência, chave de nível TX01, pressostato TX01, retorno bomba TX01) | **14** |
| Entradas 4–20 mA | 1 (pressão) | 2 | — | **2** |
| PT100 | 1 | 2 | — | **2** |
| RS-485 | — | — | 1 barramento | **1** |

Recomendação: um **controlador industrial baseado em ESP32** (trilho DIN, entradas 24 V isoladas, relés, 4–20 mA e RS-485 isolada), ou um ESP32 com expansões (MCP23017 com optoacopladores, ADS1115, transceptor RS-485 isolado).

---

## 4. Lógica do firmware (por aquecedor)

1. **Quem regula:** o **Novus** modula a potência. O **TL** (termostato limite ou relé do Novus ⚠️) faz o liga/desliga normal. O ESP32 dá a **permissão de operação**, em série com o TL. O ESP32 **não** faz liga/desliga por setpoint próprio, para não brigar com o TL e o Novus.
2. **Permissão.** O relé fecha somente se:
   - houver um pedido de partida ativo;
   - não houver parada ativa;
   - `CHAIN_OK` estiver presente;
   - `PUMP_FB` estiver presente há pelo menos 10 s;
   - não houver bloqueio;
   - a temperatura e a pressão estiverem OK e dentro da faixa;
   - o Modbus estiver OK, ou houver uma política definida para falha de comunicação;
   - `ESTOP_OK` estiver presente;
   - o tempo mínimo desligado tiver passado.

   Cada condição não atendida gera um código em `blockReasons`.
3. **Parada tem prioridade**, para qualquer perfil logado, e trava até um novo pedido de partida.
4. **Limite de temperatura de software:** acima do setpoint do Novus e abaixo do TS. Trava e exige rearme de usuário autorizado.
5. **Supervisão da sequência:**
   - permissão sem `GAS_VALVES` em 60 s → alarme "Falha na partida";
   - **`GAS_VALVES` sem permissão** → alarme **crítico** "Discrepância: contato colado ou jumper";
   - `GAS_VALVES` sem `FAN` → alarme crítico.
6. **Parada controlada de 24 h** (LFL1 intermitente), em horário configurável.
7. **Bomba:** pós-circulação (padrão de 3 min, configurável). Comando sem retorno em 5 s → alarme e permissão retirada.
8. **Alarmes no ESP32:** H/HH e L/LL, histerese, atraso, travamento. Alarmes do Novus vêm pelas Status Words.
9. **Qualidade de cada medição** (`OK`, `FAULT`, `NOT_MEASURED`, `COMM_LOST`).
10. **Reinício do ESP32:** boot sem permissão, com o alarme "Controlador reiniciado". Configuração em NVS.
11. **Queda do servidor ou do Wi-Fi:** o ESP32 continua a lógica local e aciona o buzzer se houver alarme. ⚠️ Confirmar.

---

## 5. Protocolo (ESP32 → servidor → HTML)

**Estado publicado pelo ESP32:**

```json
{
  "type": "state", "seq": 1832, "uptime_s": 86400, "estopOk": true,
  "heaters": [{
    "id": "AQ01",
    "burner": {
      "phase": "RUNNING", "permission": true, "requested": true,
      "blockReasons": [], "lockout": false, "lockoutCount24h": 0, "runHours": 12.4
    },
    "temp":  { "value": 71.3, "quality": "OK" },
    "press": { "value": 2.1,  "quality": "OK" },
    "novus": {
      "commOk": true, "pv": 71.0, "sp": 72.0, "mv": 45.0,
      "auto": true, "alarms": [false, false], "quality": "OK"
    },
    "pump": { "cmd": true, "fb": true },
    "chainOk": true
  }],
  "alarms": [{ "code": "AQ01_TEMP_H", "severity": "H", "active": true, "latched": true, "since": 1832000 }],
  "allowedActions": { "AQ01": ["BURNER_STOP", "PUMP_STOP"] }
}
```

Fases possíveis (deduzidas de `FAN`, `GAS_VALVES` e `LOCKOUT`): `OFF`, `WAIT_PUMP`, `PURGE`, `RUNNING`, `POST_PURGE`, `LOCKOUT`.

**Pedido e resposta:** mesmo formato da rev. 2:

```json
{ "type": "command", "id": "uuid", "target": "AQ01", "command": "BURNER_START",
  "user": "joao", "role": "Supervisor", "reason": "Início de turno" }
```

```json
{ "type": "ack", "id": "uuid", "accepted": false, "reason": "PUMP_NOT_CONFIRMED" }
```

Lista branca de comandos:
- `BURNER_START`, `BURNER_STOP`
- `PUMP_START`, `PUMP_STOP`
- `ALARM_ACK`
- `SW_LIMIT_RESET` (só perfis autorizados)
- `SET_CONFIG` (só Admin)
- `NOVUS_SET_SP` só entra depois da decisão da seção 3.4

---

## 6. O que sai do servidor e do HTML

| Hoje | Passa para |
|---|---|
| Intertravamentos calculados em `CommandModal.tsx` e `HeaterDetail.tsx` | ESP32 (`blockReasons`, `allowedActions`) |
| Campo de setpoint editável | Mostra o SP lido do Novus. A edição só entra com `NOVUS_SET_SP` aprovado |
| Servidor `alarms.ts` e validações de faixa | ESP32 |
| Gráficos com `Math.random` | Histórico real (PV, MV e temperatura do ESP32) |
| GLP | Continua no servidor (registro administrativo) |

---

## 7. ⚠️ Pendências

1. **Identificar os fios** da régua MB (TL, TS, IN, S, V) com multímetro, com o queimador desenergizado, feito pelo eletricista.
2. **O que é o TL hoje** (termostato próprio ou relé do Novus?) e se o **TS é de rearme manual**.
3. **Pressostato de gás de máxima**, pressostato de ar e VPS: estão instalados?
4. **Quantos Novus existem**, o que medem, e a correção da placa "PRESSÃO VAPOR".
5. **Escrita do setpoint no Novus**: por enquanto não (fase 1 somente leitura). Decidir depois.
6. **Hardware do controlador** (3.6).
7. **Tanque TX01**: definido (seção 3.5). Confirmar em campo os contatos: chave de nível NF e pressostato que fecha com pressão baixa.
8. **Queda do servidor** (4.11).
9. Enquadramento na **NR-13** (engenheiro responsável).
