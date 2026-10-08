# AGENTS.md — TermoControl HMI/SCADA

> ⚠️ **Leia primeiro.** Este é um sistema industrial de controle de 2 aquecedores de água a GLP, usado por operadores. Ele trabalha junto com um **programador de chama Siemens LFL1.333** por queimador e com o **controlador Novus N2000S-485-24V** (Modbus RTU).
> A seção **"Regras de segurança"** abaixo é **protegida**: nunca a remova, resuma ou enfraqueça ao editar este arquivo. Ao atualizar a documentação técnica, preserve-a integralmente.
> Documentos obrigatórios: `docs/ARQUITETURA_CONTROLE.md` (tem prioridade) e `docs/REVISAO_SEGURANCA.md`. Cite o código do achado (C1, A3…) nos commits.

## Regras de segurança (PROTEGIDO — não remover)

0. **Toda lógica de processo e de intertravamento fica no ESP32.** O HTML é apenas ilustrador: mostra o que o ESP32 publica e envia pedidos. O HTML nunca calcula intertravamento, nunca valida faixa e nunca decide qual botão habilitar (usa `allowedActions` e `blockReasons` vindos do ESP32). O servidor só autentica, carimba usuário e perfil no pedido, audita, grava histórico e repassa. Ele não toma nenhuma decisão de processo.
1. **O ESP32 não é equipamento de segurança.** A sequência do queimador, a supervisão de chama e o bloqueio são do **LFL1.333**. Os cortes de segurança são de hardware cabeado (pressostatos, limitadores, emergência). O ESP32 só pode **retirar a permissão** (contato NA em série na malha de controle do LFL). Nunca escreva código que acione válvula de gás, ignição ou ventilador diretamente, que coloque o ESP32 em paralelo ou como jumper de qualquer dispositivo de segurança, ou que presuma que o software protege sozinho.
1a. **O ESP32 e o HTML nunca rearmam o LFL.** O terminal 21 (reset remoto) não é usado. O rearme é somente pelo botão local. O ESP32 apenas conta os bloqueios e alarma.
1b. **Novus N2000S-485-24V: RS-485 Modbus RTU** (terminais 25/26/27). **Fase 1 é somente leitura** (PV, SV, MV, Status Words). Registradores só da tabela oficial da Novus, e cada um validado no equipamento real antes do uso. Nunca invente endereços. Nunca escreva modo, habilitação de controle ou parâmetros. A escrita de setpoint (registrador 0000) só entra depois de aprovada pelo responsável, com limites no ESP32 e auditoria. Funções Modbus suportadas: 03, 05 e 06. O Novus regula, e o ESP32 não faz liga/desliga por setpoint próprio (ver `docs/ARQUITETURA_CONTROLE.md` 4.1).
1c. **Planta:** 2 aquecedores de água (AQ01, AQ02), cada um com um queimador Riello RS/M e um LFL1.333. O contato de permissão do ESP32 entra **em série com o TL** e nunca em paralelo ou no lugar de TS, PG, IN ou do pressostato de ar. Entradas do queimador: sinal S (bloqueio), borne V (válvulas de gás), ventilador e cadeia OK, sempre por módulos isolados de 230 V. Nunca "chute" terminal ou pino fora de `firmware/io_map.h`.
2. **Parada tem prioridade.** Um comando `Off` (bomba ou queimador) é aceito em qualquer modo e por qualquer perfil logado, nunca é bloqueado por rate limit e trava o equipamento desligado até um novo comando de partida.
3. **Estado seguro = tudo desligado.** Em dúvida (perda de comunicação, dado inválido, sensor em falha, reinício do controlador, comando desconhecido), desligar e alarmar. Após reinício, o firmware inicia desligado e exige nova partida.
4. **Nunca remova nem enfraqueça intertravamentos** (`checkSafetyInterlocks`, validações do servidor) sem autorização explícita do responsável técnico.
5. **Lista branca de comandos.** Servidor e firmware só aceitam alvos, comandos e valores conhecidos, com faixa física validada. O resto é recusado, auditado e informado à IHM.
6. **A IHM nunca mente.** Proibido `Math.random` ou qualquer dado fabricado em telas de produção. Valor não medido aparece como "N/M". Dado sem comunicação aparece como inválido. "Confirmado" só quando o `state` do ESP32 refletir o comando. Status exibido = retorno do campo, não o comando.
7. **A supervisão nunca desliga.** Visualização e alarmes sonoros funcionam sem login. Logout ou inatividade só retira permissões de comando.
8. **A autoridade é o ESP32.** A matriz de permissões por perfil, a lista branca de comandos, as faixas de setpoint e os alarmes são avaliados no ESP32, com a configuração em NVS. O ESP32 responde a cada pedido com `ack` (aceito ou recusado, e o motivo). O servidor só verifica autenticação e o formato da mensagem.
9. **Tudo auditado:** comandos aceitos e negados, motivo, alteração de configuração (valor antigo/novo), usuários, logins e reconhecimento de alarmes.
10. **Alarmes (ISA-18.2):** pré-aviso H/L antes de HH/LL, com histerese e atraso; limites de alarme sempre abaixo dos cortes de hardware.
11. **Segredos:** nunca em código ou arquivos versionados. Nunca incluir `.env` ou `data/` em zips ou commits.
12. **Mapa de E/S em uma única fonte** usada pelo firmware e pela tela. Nunca duplicar números de pino.
13. **Testes nunca tocam `data/scada.db`.** Use banco em memória ou pasta temporária.
14. Toda tarefa termina com `npx tsc --noEmit` e `npm run build` (front) e `cd server && npm run build` sem erros. Informe o resultado.
15. Mudanças em firmware, servidor e IHM que alterem o protocolo (comandos/campos) devem ser feitas nas três camadas e documentadas na tabela de protocolo abaixo.

## Visão Geral do Projeto

Sistema SCADA industrial para controle de aquecedores a GLP, tanque de expansão e monitoramento em tempo real via ESP32.

**Arquitetura:**
- **Frontend (HMI)**: React + TypeScript + Vite (`/` raiz do repositório)
- **Backend (SCADA Server)**: Node.js + TypeScript + Express + WebSocket (`/server`)
- **Firmware**: ESP32 (Arduino/PlatformIO) em `/firmware`

## Estrutura de Arquivos

```
termocontrol-hmi_scada/
├── context/AppContext.tsx        ← Estado global React + lógica de conexão
├── services/
│   ├── DeviceDriver.ts           ← Interface abstrata (contrato)
│   ├── WebSocketDriver.ts        ← Driver real (ESP32 via servidor)
│   └── MockDriver.ts             ← Driver de simulação local
├── components/
│   ├── Topbar.tsx                ← Status online/offline + alarmes
│   ├── CommandModal.tsx          ← Modal de comandos com intertravamentos
│   ├── Sidebar.tsx               ← Navegação lateral
│   ├── Layout.tsx                ← Layout base
│   ├── BoilerIllustration.tsx    ← SVG animado da caldeira
│   └── TankIllustration.tsx      ← SVG animado do tanque
├── pages/
│   ├── Dashboard.tsx             ← Overview geral
│   ├── HeaterDetail.tsx          ← Detalhes de um aquecedor
│   ├── ExpansionTank.tsx         ← Tanque de expansão
│   ├── GLPManagement.tsx         ← Gestão de GLP
│   ├── Settings.tsx              ← Configurações
│   └── Login.tsx                 ← Autenticação
├── types.ts                      ← Tipos compartilhados (frontend)
├── server/src/index.ts           ← Backend WebSocket + REST
└── docs/PLANO.md                 ← Roadmap e progresso
```

## Fluxo de Dados

```
ESP32 ──WebSocket──► servidor (index.ts)
                          │
                          ├─ merge por id (B4) ──► currentState
                          ├─ watchdog 6s (B1) ──► device_offline broadcast
                          └─ glpState exclusivo (B3)
                                    │
                    ┌───────────────┘
                    ▼
          Navegadores (WebSocketDriver)
                    │
                    ├─ type:'state'         → AppContext.onStateChange
                    ├─ type:'device_online' → AppContext.onOnline → isOnline=true
                    └─ type:'device_offline'→ AppContext.onOffline → isOnline=false
```

## Protocolo WebSocket (Mensagens)

Consulte também `docs/PROTOCOLO.md` para campos detalhados.

### Servidor → Navegadores

| type | payload | Descrição |
|------|---------|-----------|
| `state` | `SystemState` | Estado completo do sistema (ESP32 + GLP do servidor) |
| `device_online` | — | ESP32 voltou online (após watchdog detectar reconexão) |
| `device_offline` | — | ESP32 não enviou state há > 6s |
| `ack` | `{ id, accepted, reason }` | Resposta do ESP32 repassada à IHM |

### Servidor → ESP32

| type | payload | Descrição |
|------|---------|-----------|
| `command` | `{ id, target, command, value, user, role, reason }` | Repasse direto do comando do navegador |

### Navegador → Servidor

| type | Campos | Descrição |
|------|--------|-----------|
| `command` | `{ id, target, command, value, user, role, reason }` | Comando enviado pelo usuário para equipamento |

### ESP32 → Servidor

| type | payload | Descrição |
|------|---------|-----------|
| `state` | `{ seq, uptime_s, estopOk, buzzer{}, heaters[], tank{}, alarms[], allowedActions{} }` | Estado atual completo (plano), alarmes em tempo real e lista de ações permitidas (ver `docs/PROTOCOLO.md`) |
| `ack` | `{ id, accepted, reason }` | Resposta imediata do ESP32 para cada `command` |

## Regras de Negócio Críticas

1. **Watchdog (B1)**: Servidor marca dispositivo offline após **6 s** sem mensagem `state` do ESP32.
2. **Sem state otimista (B2)**: Servidor **nunca** modifica `currentState` ao receber um comando. O estado exibido vem **exclusivamente** do ESP32.
3. **GLP no servidor (B3)**: `glpState` é mantido pelo servidor. O campo `glp` no payload do ESP32 é **ignorado**.
4. **Merge por id (B4)**: Ao receber state do ESP32, o servidor mescla `incoming` sobre `known` — campos ausentes (como `name`, `lowLevelSensor`) são preservados do estado base.
5. **Confirmação de comando (B2)**: A IHM registra `pendingCommands` e verifica se o próximo `state` reflete o valor esperado. Timeout de **5 s** gera alarme de Warning.

## Intertravamentos de SOFTWARE (camada extra — ver "Regras de segurança")

Estas condições são uma camada adicional no firmware/servidor. A segurança real está na cadeia cabeada (programador de chama, STB, pressostatos, fluxostato, emergência). Para o software permitir o **queimador**:
- Comunicação ESP32 online ✓
- Pressão hidrostática ≥ 0.5 bar ✓
- Temperatura < 95°C ✓
- Bomba circuladora LIGADA ✓
- Sem falha de ignição ✓

## Build & Dev

```bash
# Frontend
npm run dev        # Vite dev server (porta 5173)
npm run build      # Build produção
npx tsc --noEmit   # Type check apenas

# Backend
cd server
npm run dev        # nodemon + ts-node
npm run build      # tsc → dist/
```

## Convenções de Código

- TypeScript strict mode em ambos os projetos
- Nomes de IDs: `AQ01`, `AQ02` (aquecedores), `TX01` (tanque), `GLP` (gas)
- Logs via `addLog()` no AppContext — nunca `console.log` direto no frontend
- Comandos GLP: `addReading` (% → kg) e `addRefill` (kg)
