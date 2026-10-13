# Correções de 13/10/2026: integração IHM ↔ servidor ↔ ESP32

Códigos A-1 a A-12 desta rodada. Citar nos commits, como pede o `AGENTS.md`.

## Resultado das verificações

| Verificação | Antes | Depois |
|---|---|---|
| `npx tsc --noEmit` (front) | OK | OK |
| `npm run build` (front) | OK | OK |
| `cd server && npm run build` | OK | OK |
| Testes do servidor (`npx jest`) | 7 de 8 (caminho `c:/` fixo) | **10 de 10** |
| Testes nativos do firmware | 76 de 76 | **82 de 82** (6 novos; 4 deles falham no código antigo) |
| Ponta a ponta (servidor + `fake-esp32` + cliente IHM) | a tela não recebia nenhum `state` | estado, partida, ack, alarmes e perda do ESP32 funcionando |

O build para o ESP32 (`pio run -e esp32`) **não foi feito** nesta análise, porque o ambiente não tinha o toolchain. Rode-o antes de gravar a placa.

## O que foi corrigido

### Firmware
- **A-1:** `allowedActions` passa a oferecer `BURNER_START` com o queimador parado. Antes, ele nunca aparecia, porque `NOT_REQUESTED` está sempre na lista com o queimador parado. A regra agora é a mesma do `handleCommand`. A permissão de saída continua exigindo a lista vazia, então nenhum intertravamento mudou.
- **A-2:** o alvo `SYS` é aceito para `ALARM_ACK` e `ALARM_SILENCE`. Antes, era recusado com `INVALID_TARGET`.
- **A-3:** um alarme travado é destravado ao ser reconhecido depois de normalizar, ou ao normalizar depois de reconhecido. Antes, `resetLatched()` nunca era chamado e os alarmes ficavam na lista para sempre. O alarme "Controlador ESP32 reiniciado" agora é publicado até alguém reconhecer.
- **A-4:** os alarmes `DISCREP_GAS_NO_PERM` e `DISCREP_GAS_NO_FAN` passaram a ser separados. Antes, o de ventilador nunca disparava (`false` fixo em `main.cpp`).
- **A-5:** watchdog de servidor. Com 10 s sem nenhuma mensagem do servidor (ele manda ping a cada 2 s), o ESP32 trata como desconectado e aplica o `STOP_BURNERS`. Também foram ativados o `enableHeartbeat` e o `setReconnectInterval`. Antes, só o evento de desconexão parava os queimadores, e esse evento não acontece com TCP "meio aberto". **Teste de bancada obrigatório:** tirar o cabo de rede do servidor e cronometrar.
- **A-6:** cada alarme é publicado com `description` e com o `acked` real. `novus.auto` passa a ser `null` (N/M), seguindo a regra 6.

### Servidor
- **A-7:** o `state` vai sempre como `{ type:'state', payload }`. Antes, a IHM lia `payload`, o servidor mandava o formato plano, e a tela nunca atualizava.
- **A-8:** o `id` do comando vem da IHM e volta no `ack`. Antes, todo comando terminava em "Timeout" e a recusa do ESP32 nunca aparecia. O `reason` também é repassado.
- **A-10:** `POST /alarms/:id/ack` repassa `ALARM_ACK` com o código ao ESP32. A IHM recebe os alarmes atuais já na conexão, mesmo sem login (regra 7). Um alarme malformado não derruba mais o processamento do `state`.
- **A-11:** quando o ESP32 cai, temperatura, pressão e Novus passam a `COMM_LOST` com valor `null`, e `allowedActions` fica vazio. Um comando enviado nessa situação recebe `DEVICE_OFFLINE` na hora.
- **A-12:** criação e exclusão de usuários e alteração de configuração (valor antigo e novo) passam a ser auditadas (regra 9).
- **Segurança:**
  - `auth.ts` não tem mais o segredo JWT padrão.
  - O ESP32 não sobrescreve mais o nome de exibição.
  - Os testes usam segredos gerados na hora e banco em memória.
  - `tools/trocar-senha.ts` agora carrega o `.env`.

### IHM
- **A-9:** a tela nunca bloqueia `BURNER_STOP`, `PUMP_STOP` e `TX01_PUMP_STOP`, para nenhum perfil. Isso corrige a volta do achado C2. As demais restrições de `supervisorOnly` continuam.
- O reconhecimento de alarmes na faixa superior usa o mesmo caminho da página de alarmes.
- O bipe não recria mais o `AudioContext` a cada segundo.
- Usuários que não são Admin não consultam mais `/audit`, o que eliminava os erros 403 a cada 5 s.
- Os gráficos de tendência leem o formato real do histórico (última hora) e mostram falha no lugar de 0.
- Os motivos de recusa e de bloqueio estão traduzidos com os códigos reais do firmware.
- O Vite roda na porta 5173, porque a 3000 é do servidor. A sobra do Gemini foi removida.

### Simulador
- `server/tools/fake-esp32.js` voltou a rodar. O arquivo estava em Latin-1 e os template literals tinham sumido.
- O segredo agora vem do `server/.env`, e os alarmes seguem o formato do firmware.
- Uso: `cd server && node tools/fake-esp32.js`. As teclas L, R, N, P, T, E e Q simulam falhas.

## Faça antes de qualquer teste em campo

1. **Troque o `JWT_SECRET` e o `DEVICE_SECRET`.** O `DEVICE_SECRET` atual estava commitado nos testes e no simulador, e o zip recebido continha `server/.env` e `data/scada.db`. Depois de trocar, grave o novo segredo no ESP32 pelo portal.
2. A partir de agora, gere os pacotes só com `scripts/empacotar.sh` ou `scripts/empacotar.ps1`.
3. Rode `pio run -e esp32` e `pio test -e native`.
4. Faça o teste de bancada do A-5 (queda do servidor) e o roteiro `docs/TESTE_BANCADA_FASE3.md`.
5. O `docs/PENDENCIAS_RESPONSAVEL_TECNICO.md` precisa estar assinado antes de operar um queimador.

## Ainda em aberto (não alterado nesta rodada)

- **C8:** o portal Wi-Fi `TermoControl_AP` continua sem senha. Sugestão: `wm.autoConnect("TermoControl_AP", <senha>)` ou portal aberto só por botão físico.
- **C9:** uma segunda conexão de dispositivo derruba a primeira. O certo é recusar a segunda e alarmar, mas isso exige detectar o socket morto (ping/pong nativo do `ws`) para não trancar o ESP32 verdadeiro do lado de fora depois de uma queda de rede.
- Não há TLS (`wss://`), e o segredo trafega na URL. Use uma rede de automação isolada.
- `supervisorOnly` é decidido na tela e deveria ir para a matriz de perfis no ESP32 (regra 8). Decisão do responsável técnico.
- `FAULT_RESET` e `LOCKOUT_COUNT_RESET` existem no firmware, mas não têm botão na tela.
- O bundle tem 806 kB: dá para dividir com `import()` dinâmico.
- O `PLANO.md` está desatualizado, por exemplo na Fase 5 e no "watchdog 10 s" da Fase 4, que só agora existe.
