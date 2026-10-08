# PLANO.md — Roadmap TermoControl HMI/SCADA

> **Última atualização:** 2026-09-24

---

## ✅ Fase 1 — Confiabilidade do Protocolo

Objetivo: garantir que a IHM reflita fielmente o estado real do ESP32, sem falsas leituras, piscadas ou dados perdidos.

### Itens concluídos

- [x] **B1 — Watchdog de presença do dispositivo**
  - Servidor marca o ESP32 como offline após **6 s** sem mensagem `state`
  - Envia `{ type: 'device_offline' }` a todos os navegadores
  - `WebSocketDriver` chama `onOffline()` quando o servidor ou o socket caem
  - `AppContext` gerencia `isOnline` **exclusivamente** pelos eventos `device_online` / `device_offline`
  - `Topbar` exibe alarme piscante **"SEM COMUNICAÇÃO"** quando `isOnline = false`
  - Cards do `Dashboard` e `HeaterDetail` ficam acinzentados (opacity + grayscale) quando offline

- [x] **B2 — Sem state otimista / confirmação de comando**
  - Servidor **apenas repassa** o comando ao ESP32; não toca em `currentState`
  - `AppContext` registra `pendingCommands` com timestamp
  - Verificação a cada `state` recebido: se o campo reflete o valor enviado → comando confirmado, log `✓ Confirmado`
  - Timeout de **5 s**: alarme "Warning" no log e remoção do pending
  - `Topbar` exibe spinner "Aguardando confirmação" enquanto há pendentes

- [x] **B3 — GLP mantido pelo servidor**
  - `glpState` é propriedade exclusiva do servidor (`server/src/index.ts`)
  - Comandos `{ target:'GLP', command:'addReading'|'addRefill' }` são processados no servidor
  - Campo `glp` do payload do ESP32 é **ignorado** (merge nunca sobrescreve `glpState`)
  - Estado final enviado aos navegadores: `{ ...currentState, glp: glpState }`

- [x] **B4 — Merge por id, preservando campos de configuração**
  - `mergeHeaters()`: atualiza campos presentes no payload do ESP32, preserva `name`, `burnerMode`, `setpoint`, `modulation` do estado base
  - `mergeTank()`: idem para `name`, `lowLevelSensor`, `highLevelSensor`, `setpointPressure`
  - Nunca substitui o estado inteiro pelo payload bruto do ESP32

---

## ✅ Fase 2 — Segurança e Autenticação

Objetivo: substituir a senha fixa e o role auto-atribuído por autenticação real no servidor, proteger o WebSocket, evitar falsificação de state pelo cliente e implementar auditoria.

### Itens concluídos

- [x] **S0 — Admin inicial via `.env` do servidor**
  - `server/.env`: `ADMIN_USER`, `ADMIN_PASS_HASH` (bcrypt), `JWT_SECRET`, `DEVICE_SECRET`
  - `server/src/auth.ts`: `seedAdminIfNeeded()` cria o admin no boot se não existir em `server/data/users.json`
  - Usuários persistidos em `server/data/users.json` com hash bcrypt (nunca senha em claro)

- [x] **S1 — Autenticação JWT no WebSocket e REST**
  - `POST /auth/login` retorna `{ token, user: {name, role} }` (JWT 8h)
  - Upgrade WS verifica `?token=<JWT>` → rejeita `401` se inválido/expirado
  - `WebSocketDriver` envia o token como query param; `setToken()` reconecta após login
  - `pages/Login.tsx` reescrito: sem seletor de role, sem senha `1234`; chama `POST /auth/login`

- [x] **S1c — Prevenção de falsificação de state**
  - ESP32 conecta com `?device=true&secret=<DEVICE_SECRET>`
  - Mensagem `{ type: 'state' }` só aceita de clientes `isDevice = true`
  - Navegadores que tentarem enviar `state` são ignorados com log de aviso

- [x] **S2 — Rate limiting de comandos**
  - Máx 10 comandos por minuto por IP
  - Excedente retorna `{ type: 'error', message: '...' }` ao cliente e grava auditoria com `rate_limited`

- [x] **S3 — Auditoria de comandos persistida**
  - `server/src/audit.ts`: grava em `server/data/audit.jsonl` (JSON Lines)
  - Campos: timestamp, username, role, ip, target, command, value, result
  - `GET /audit` (Admin) retorna últimas 200 entradas

- [x] **S4 — Sessão com expiração por inatividade**
  - `AppContext` seta timer de 30 min; reset a cada interação de mouse/teclado/toque
  - Após 30 min sem atividade: logout automático + log de Warning
  - Token JWT expira em 8h no servidor (proteção dupla)

- [x] **UI — Gerenciamento de Usuários (Admin)**
  - `pages/UserManagement.tsx`: criar/listar/excluir usuários via REST (`/users`)
  - Visível apenas para Admin na Sidebar
  - Exibe role colorido, data de criação, último acesso

## ✅ Fase 3 — Persistência e histórico
- [x] SQLite no servidor (ex.: better-sqlite3) — Usando `server/src/db.ts` com `scada.db`.
- [x] Log de auditoria gravado no servidor (quem, o quê, quando, motivo, resultado) — Migrado de JSONL para SQLite (`audit_logs`).
- [x] Histórico de temperatura/pressão a cada 10 s, com retenção configurável — Job de limpeza diário de 7 dias (`telemetry_history`).
- [x] Gráficos de tendência na IHM lendo o histórico — Frontend Dashboard consumindo API via Axios.
- [x] Configurações salvas no servidor — Centralizadas e persistidas na tabela `app_settings`.

## ✅ Fase 4 — Firmware real

- [x] Leitura real dos sensores de Temperatura — Substituídos por PT100 (MAX31865) via SPI.
- [x] Leitura real dos sensores de Pressão — Mapeamento ADC para transmissores 4-20mA (divisor de tensão calibrado para 0-10 bar).
- [x] Watchdog de comunicação — Sem resposta do servidor por 10s, o queimador desliga sozinho.
- [x] Watchdog de hardware do ESP32 — Habilitado (`esp_task_wdt.h`) em 8s para lidar com travamentos severos.
- [x] Lógica automática para AQ02 e bomba do tanque — Malha fechada idêntica à do AQ01 implementada e controlável via WebSocket.
- [x] Wi-Fi configurável (WiFiManager) — Integrado de maneira assíncrona/não-bloqueante; Setup do Wi-Fi não trava o loop do controle PID e intertravamentos.
- [x] Unificar AQ01/AQ02 num array — Eliminada a duplicação no controle, facilitando a adição de novos aquecedores futuramente.

## 🔜 Fase 5 — Alarmes Avançados

- [ ] **A1** — Configuração de limites de alarme por equipamento (hi/lo/hihi/lolo)
- [ ] **A2** — Notificação sonora no navegador (Web Audio API)
- [ ] **A3** — Alarmes persistentes (não somem sem ACK mesmo após reconexão)
- [ ] **A4** — Página dedicada de gerenciamento de alarmes

---

## Notas Técnicas

### IDs dos Equipamentos
| ID | Tipo | Nome |
|----|------|------|
| AQ01 | Aquecedor | Aquecedor 01 |
| AQ02 | Aquecedor | Aquecedor 02 |
| TX01 | Tanque | Tanque de Expansão |
| GLP | GLP | Sistema de GLP |

### Tempos de Timeout
| Parâmetro | Valor |
|-----------|-------|
| Watchdog ESP32 offline | 6 s |
| Timeout de confirmação de comando | 5 s |
| Reconexão WebSocket | 5 s |
