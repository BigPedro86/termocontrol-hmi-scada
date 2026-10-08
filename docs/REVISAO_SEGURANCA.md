# Revisão de Segurança Industrial — TermoControl HMI/SCADA

**Data:** 29/09/2026 · **Versão analisada:** zip de 29/09 (idêntico ao de 25/09) · **Escopo:** firmware ESP32, servidor Node, IHM React

> **Atualização (29/09, tarde):** a arquitetura foi definida em `docs/ARQUITETURA_CONTROLE.md`, e esse documento **tem prioridade**. Toda lógica fica no ESP32, integrada ao Siemens LFL1.333 e ao Novus N2000S. O HTML é só ilustrador. Onde esta revisão diz "validar no servidor", leia "validar no ESP32". O servidor passa a apenas autenticar, auditar, gravar o histórico e repassar.
>
> **Como usar este arquivo:** coloque em `docs/REVISAO_SEGURANCA.md`. No Antigravity, peça uma fase por conversa (seção 6). Cada achado tem um código (C1, A3…) para ser citado nos commits.

**Método:** leitura completa do código e **testes executados**. O servidor foi rodado com um ESP32 simulado, um supervisor e um operador conectados. Os resultados dos testes aparecem como *"Teste nn"*. O firmware foi analisado por leitura (não havia placa disponível).

---

## 1. Premissa que decide tudo

Um ESP32 com Wi-Fi **não é um equipamento de segurança**. Ele não tem certificação SIL (IEC 61508/61511) nem de controle de queimador (EN 298). Pode falhar por software, travar, reiniciar ou receber comandos indevidos pela rede.

Por isso, num aquecedor de água a GLP, **a segurança tem que existir em hardware, cabeada e independente do ESP32**. O ESP32 e o SCADA ficam na camada de *controle e supervisão*. Os "intertravamentos" do software são uma **camada extra**, nunca a principal.

### 1.1 Cadeia de segurança que precisa existir fisicamente (confirmar em campo)

| # | Proteção | Referência | Observação |
|---|---|---|---|
| H1 | **Programador/controlador de chama certificado** por queimador: pré-purga, supervisão de chama, tempo de segurança, bloqueio com **rearme manual local** | NBR 12313, EN 298 | O relé do ESP32 só pode ser a **"demanda de calor"** para o programador. Nunca aciona válvula de gás ou ignição diretamente |
| H2 | **Duas válvulas de bloqueio automático NF em série** na linha de gás | NBR 12313 | Verificar necessidade de teste de estanqueidade (*valve proving*) conforme a potência |
| H3 | **Pressostatos de gás** de baixa e de alta, e **pressostato de ar de combustão** | NBR 12313 | Em série com a cadeia de segurança do programador |
| H4 | **Limitador de temperatura de segurança (STB)** com **rearme manual**, sensor próprio, independente do PT100 de controle | EN 14597 (conceito) | Corta a cadeia do queimador sem depender do ESP32 |
| H5 | **Pressostato de pressão máxima de água** (rearme manual) e de **pressão mínima**; **válvula de segurança (PSV)** dimensionada | NR-13 (se aplicável) | Confirmar com o engenheiro se os aquecedores e o tanque se enquadram como vaso de pressão na NR-13 |
| H6 | **Prova de fluxo real** (fluxostato ou ΔP) em série com a permissão do queimador | Boa prática | Hoje o software usa o *comando* da bomba como se fosse fluxo (ver C6) |
| H7 | **Botão de emergência cabeado**, que corta a cadeia de segurança sem passar pelo ESP32 | NR-12, IEC 60204-1, ISO 13850 | Um botão "desligar" na tela **não é** parada de emergência |
| H8 | **Detector de gás** na casa de máquinas, com corte da válvula geral | Boa prática (avaliar com o responsável técnico) | GLP é mais pesado que o ar: sensor próximo ao piso |
| H9 | **Bloqueio e etiquetagem (LOTO) físico** para manutenção | NR-10, NR-12 | Colocar o equipamento em "Manual/Desligado" na tela **não é** isolamento para manutenção (ver C7) |

**Decisão necessária do responsável técnico:** confirmar item a item o que já existe na instalação. O projeto de automação e a instalação precisam de um responsável habilitado, com ART.

### 1.2 O que o ESP32 deve fazer

- Enviar a **demanda** (liga/desliga) ao programador de chama e comandar as bombas.
- **Ler e reportar** os retornos: chama presente, bloqueio do programador, cadeia de segurança OK, contator da bomba fechado, fluxostato. Hoje ele não lê nenhum retorno.
- Regular a temperatura (Auto), com as proteções de software como camada extra.

---

## 2. Achados críticos (corrigir antes de qualquer operação real)

### C1 — Em modo Auto, o operador não consegue apagar o queimador, e a tela diz que conseguiu

- **Firmware:** `burnerStatus = Off` só é aceito em modo Manual (`main.cpp:180`). Em Auto, o comando é ignorado. `pumpStatus = Off` é revertido no ciclo seguinte, porque a lógica Auto religa a bomba (`main.cpp:261-264`).
- **Tela:** ao enviar, o modal mostra **"ORDEM CONFIRMADA PELO ESP32"** (`CommandModal.tsx:274-278`). Essa mensagem só indica que a mensagem saiu do navegador, não que o ESP32 executou.
- **Consequência:** o operador aperta "APAGAR CHAMA", vê "confirmado" e a chama continua acesa.
- **Regra industrial:** o comando de **parada tem prioridade sobre qualquer modo** (IEC 60204-1). Uma confirmação só pode ser exibida depois que o **retorno do campo** mostrar o novo estado.
- **Correção:** um Off em Auto passa o equipamento para Manual+Desligado (ou "Auto inibido"), com o estado travado até um novo comando de partida. A mensagem de sucesso só aparece quando o `state` do ESP32 refletir o comando.

### C2 — O operador não consegue desligar nada

- **Teste 08/09:** com `supervisorOnly` ligado (o padrão), o servidor bloqueia `burnerStatus Off` e `pumpStatus Off` do Operador. A tela também desabilita os botões DESLIGAR e APAGAR CHAMA para esse perfil (`CommandModal.tsx:23,122,179`).
- **Regra:** qualquer usuário que vê o processo precisa poder **parar** o equipamento. As restrições devem valer só para partir, trocar modo e alterar setpoints.

### C3 — Um comando malformado deixa o aquecedor sem regulação

- **Teste 05/06/07:** o servidor repassa ao ESP32 `burnerMode = "xyz"`, comandos inventados (`AQ01.foo`) e alvos inexistentes (`ZZ99`). Não existe lista de comandos permitidos.
- **Firmware:** aceita qualquer texto como modo (`main.cpp:174`). Com um modo que não é "Auto" nem "Manual", a regulação para. Se o queimador estava aceso, continua aceso até o corte de software de 95 °C. E o Off também não é aceito, porque exige "Manual".
- **Correção:** lista branca de alvos, comandos e valores **no servidor e no firmware**. Qualquer comando fora da lista é recusado, registrado na auditoria e informado à tela.

### C4 — Tanque: setpoint de pressão perigoso e bomba que não para

- **Teste 02:** um setpoint de **3,5 bar é recusado**, porque o servidor valida a pressão com a faixa de temperatura (20–95).
- **Teste 03:** um setpoint de **50 bar é aceito** e repassado. O firmware aceita qualquer valor (`main.cpp:191`).
- **Consequência:** o transmissor mede no máximo 10 bar, então a pressão nunca chega a 50. A bomba de pressurização **fica ligada sem parar**, pressurizando o circuito fechado até a válvula de segurança abrir.
- **Falha de sensor:** com o transmissor em falha (valor −1), a lógica Auto também mantém a bomba ligada para sempre (`main.cpp:279`).
- **Teste 13:** uma pressão de 9,8 bar **não gera nenhum alarme**. Não existe proteção nem alarme de pressão alta em nenhuma camada.
- **Correção:** faixa própria para pressão (ex.: 1,0–6,0 bar, definida pelo projeto), validada no servidor **e** no firmware. Corte de pressão alta no firmware (camada extra), além do pressostato de hardware (H5). Bomba desligada com sensor em falha. Proteção contra funcionamento a seco (nível baixo).

### C5 — A proteção de temperatura é só software, com rearme automático e o mesmo sensor do controle

- O corte a 95 °C (`main.cpp:126`) usa o **mesmo PT100** que faz a regulação. Se esse sensor falhar mostrando um valor baixo e plausível (umidade no cabeçote, por exemplo), o controle e a proteção falham juntos, e **o queimador fica aceso sem limite**.
- O corte se **rearma sozinho** quando a temperatura cai abaixo de 95 °C.
- O setpoint pode ser 95 °C (`main.cpp:172`), que é o próprio valor de corte. O equipamento passaria a operar em cima do limite de segurança.
- **Correção:** STB de hardware (H4). No software: setpoint máximo com margem abaixo do corte (ex.: corte − 10 °C, definido pelo projeto), corte travado exigindo rearme por usuário autorizado, e alarme de discrepância se houver um segundo sensor.

### C6 — "Prova de fluxo" falsa

- A permissão do queimador verifica se a bomba foi **comandada** (`pumpOn`, `main.cpp:130`), não se existe fluxo de verdade.
- **Consequência:** com relé térmico desarmado, contator com defeito ou válvula fechada, o queimador acende sem circulação. Isso causa superaquecimento localizado e ebulição no trocador.
- **Correção:** entrada digital de fluxostato ou contato auxiliar do contator, e intertravamento por essa entrada (H6).

### C7 — Depois de um reinício, o ESP32 volta em Auto e liga sozinho

- Os dois aquecedores iniciam em "Auto" com setpoints fixos no código (`main.cpp:84-85`). Modo e setpoints não são salvos.
- O ESP32 pode reiniciar por queda de energia, brownout ou pelo watchdog de 8 s. Um AQ02 deixado em Manual/Desligado para manutenção **volta em Auto e acende** assim que a comunicação retorna.
- **Correção:** salvar modo e setpoints em NVS. Após um reinício, **iniciar em estado seguro** (Manual/Desligado) e exigir um comando de partida. Gerar o alarme "Controlador reiniciado". E reforçar que manutenção se faz com LOTO físico (H9).

### C8 — Portal Wi-Fi aberto permite sequestrar o controlador

- `wm.autoConnect("SCADA_TERMOCONTROL")` cria um ponto de acesso **sem senha** (`main.cpp:231`). Qualquer pessoa próxima pode se conectar e trocar o IP do servidor por o de um notebook, que passa a enviar comandos ao ESP32.
- O ESP32 não verifica a identidade do servidor, não usa TLS e envia o segredo em texto claro na URL (`main.cpp:240`).
- Os campos do portal são variáveis locais do `setup()` com o portal não bloqueante (`main.cpp:223-238`). Os valores digitados depois nunca são salvos, e o portal passa a apontar para memória já liberada.
- **Correção:** portal com senha forte (ou aberto apenas por botão físico na placa), campos globais com callback de salvamento, `strncpy` com limite, segredo diferente do padrão `123456`. Idealmente: rede cabeada e isolada (VLAN de automação) e TLS (`wss://`) com verificação do certificado do servidor (IEC 62443).

### C9 — Um "ESP32 falso" é aceito, controla a tela e recebe os comandos

- **Teste 16/17/18:** uma segunda conexão com o mesmo segredo foi aceita. Ela enviou 40 °C e **a tela passou a mostrar 40 °C** (o ESP32 real informava outro valor). O falso dispositivo também **recebeu os comandos reais**.
- **Teste 19:** o servidor aceita e repassa `temperature: "quente"`. O estado vindo do dispositivo não é validado.
- **Correção:** apenas **uma** sessão de dispositivo por vez. Se aparecer uma segunda, recusá-la e gerar alarme "dispositivo duplicado". Validar tipos e faixas físicas de cada campo recebido.

### C10 — Os gráficos mostram dados inventados como se fossem reais

- **Dashboard:** chama `/history?limit=60` sem o parâmetro `equipment`. O servidor responde **400 (Teste 22)**, e a tela usa como reserva uma curva gerada com `Math.random()` (`Dashboard.tsx:29-45, 80`).
- **Detalhe do aquecedor** (`HeaterDetail.tsx:39-40`), **Tanque** (`ExpansionTank.tsx:24-25`) e **GLP** (`GLPManagement.tsx:70-71`): as tendências são ruído aleatório em volta do valor atual.
- **Nível do tanque:** fixo em 45 % no firmware (nunca é lido), mas é exibido como medição.
- **Modulação:** o firmware envia 100 % ou 0 % conforme o queimador está aceso ou apagado. Não é uma medição.
- **Dashboard:** o card de pressão mostra "Status: OK" sempre que há comunicação, qualquer que seja o valor (`Dashboard.tsx:145`).
- **Regra (ISA-101):** a IHM nunca exibe dado fabricado como dado de processo. Sem dado, a tela mostra "sem dado" ou "não medido".
- **Correção:** remover todo `Math.random` das telas de produção. Os gráficos leem o histórico real. Campos não medidos aparecem como "N/M".

### C11 — O mapa de E/S da tela não corresponde ao firmware

| Sinal | Tela (`IOMap.tsx:27-50`) | Firmware (`main.cpp:22-38`) |
|---|---|---|
| Bomba AQ01 | GPIO 25 | GPIO 18 |
| Queimador AQ01 | GPIO 26 | GPIO 19 |
| Queimador AQ02 | **GPIO 14** | GPIO 22. No firmware, o GPIO 14 é o **clock SPI dos PT100** |
| Bomba do tanque | **GPIO 12** | GPIO 23. No firmware, o GPIO 12 é o **MISO do SPI** |
| PT100 AQ01/AQ02 (CS) | GPIO 15 / 2 | GPIO 5 / 4 |
| Boias de nível | GPIO 32 / 33 | Não existem no firmware |

- **Consequência:** um eletricista que ligar os fios seguindo a tela coloca o relé do queimador do AQ02 no clock do SPI. O relé ficaria pulsando junto com as leituras de temperatura.
- **Correção:** uma única fonte de verdade para o mapa de E/S (um arquivo usado para gerar o firmware e a tela), revisada contra o diagrama elétrico.

### C12 — O logout por inatividade tira a supervisão da planta

- Após 30 min sem interação (`AppContext.tsx:53`), `doLogout` desconecta o driver (`AppContext.tsx:125-130`). A aplicação mostra **só a tela de login** (`App.tsx`): nenhum valor de processo, e a tela deixa de receber alarmes novos.
- Numa sala de controle, a tela costuma ficar sem toque por mais de 30 min. Um alarme de temperatura que surgir depois disso **não aparece e não toca**.
- **Regra:** a supervisão (visualização e alarmes) nunca é desligada. O logout só retira as **permissões de comando**.
- **Correção:** criar o modo "somente visualização" sem login, com alarmes sonoros ativos. O login passa a servir apenas para comandar.

### C13 — O alarme de temperatura pode ser desativado sem ninguém perceber

- **Teste 20/21:** `PUT /settings` aceitou `alarmTempHiHi = "xyz"`. A partir daí, **130 °C não gerou alarme nenhum**, porque qualquer comparação com um valor inválido dá falso. O servidor também aceitou mínimo 90 com máximo 10.
- Alterações de configuração **não são registradas** na auditoria.
- **Correção:** validar tipos e faixas, garantir mínimo < máximo, e manter os limites de alarme **abaixo** dos cortes de hardware. Toda alteração fica registrada (quem, quando, valor antigo, valor novo, motivo), como gestão de mudanças.

---

## 3. Achados de prioridade alta

**A1 — Alarmes fora das boas práticas (ISA-18.2 / IEC 62682).**
- Não existe alarme de pré-aviso (H) antes do corte (HH), então o operador não tem tempo de agir (Teste 12).
- Não existe histerese nem atraso: com a temperatura oscilando em torno de 95 °C, foram **9 atualizações de alarme em 10 leituras** (Teste 11), e cada uma dispara o bipe.
- Faltam alarmes de pressão alta (Teste 13) e de falha de sensor do tanque (Teste 15).
- Falha de bomba e de queimador nunca aparece, porque o firmware nunca envia "Fault".
- Não existe entrada para o **bloqueio do programador de chama**.

**A2 — O status exibido é o comando, não o retorno do campo.** O firmware envia `pumpOn` e `burnerOn` (os comandos) como se fossem o estado (`main.cpp:304-305`). O item "Hardware: Sem Falha de Ignição" fica sempre verde (`HeaterDetail.tsx:54`), e isso dá uma **falsa garantia**.

**A3 — Trocar para Auto acende o queimador sem confirmação.** Os botões Manual e Automático não pedem confirmação e não checam permissão na tela (`CommandModal.tsx:214-225`). No firmware, o modo Auto liga bomba e queimador na hora se a temperatura estiver abaixo do setpoint (`main.cpp:261-264`). Na prática, é uma partida que contorna o "digite LIGAR".

**A4 — Botão "RESETAR FALHA" remoto.** O rearme de bloqueio do programador de chama deve ser **local**, com o operador vendo o equipamento (NBR 12313: rearme manual). O botão também não verifica permissão (`CommandModal.tsx:153-160`). A recomendação é remover o botão ou limitá-lo a reconhecer o evento, sem rearmar o queimador.

**A5 — Usuário excluído continua com acesso (Teste 25/26).** O token vale 8 h (`auth.ts:28`), e o servidor não confere se o usuário ainda existe.

**A6 — Auditoria incompleta.**
- Comandos **negados** não são registrados (Teste 10: zero registros).
- O **motivo** digitado para mudar o setpoint fica só no navegador e não chega ao servidor.
- Não são auditados: alterações de configuração, criação e exclusão de usuários, logins e reconhecimento de alarmes.

**A7 — O bloqueio de login trava o computador da sala de controle.** O bloqueio é por IP (`index.ts:383`). Depois de 5 senhas erradas de qualquer pessoa, **o próprio admin fica sem conseguir entrar por 1 minuto** (Teste 27/28). O bloqueio deve ser por usuário, e a visualização nunca pode ser bloqueada (C12).

**A8 — Medição de pressão frágil.**
- O ADC do ESP32 é usado sem calibração (`esp_adc_cal`) e sem filtro.
- Um sinal acima de 20,5 mA (curto no laço) não é tratado como falha (NAMUR NE43).
- A faixa de 10 bar está fixa no código.
- Cada canal deveria ter sua faixa e calibração configuradas.

**A9 — Pinos de boot do ESP32.** O GPIO 12 (usado como MISO) é um pino de *strapping*: se estiver em nível alto no boot, o ESP32 pode não iniciar. Durante reset e boot, as saídas ficam flutuando. **As entradas dos drivers de relé precisam de resistor de pull-down**, para que nenhum relé feche durante um reinício.

**A10 — Disponibilidade depende de um PC com Wi-Fi.**
- Se o servidor cair (reinício do Windows, atualização, OneDrive), os queimadores param depois de 10 s.
- O servidor roda em modo desenvolvimento (`ts-node`/`nodemon`, como diz o README).
- Faltam: serviço com reinício automático, nobreak, rede cabeada.

**Decisão sua:** com a segurança garantida no hardware (seção 1), é comum a regulação Auto **continuar localmente** quando o SCADA cai, com alarme local (sinaleiro). A alternativa mais conservadora é apagar tudo quando o SCADA cai (como hoje), mas aí a produção fica dependendo do PC.

**A11 — Segredos e dados junto com o projeto.** Os dois últimos zips trouxeram o `server/.env` real e o banco `data/` com hashes de senha. O firmware tem o segredo padrão `123456`, e o admin usa `admin123`. É preciso trocar todos e **não enviar** `.env` nem `data/` em zips ou repositórios.

**A12 — Sem criptografia na rede.** Senhas e comandos trafegam em HTTP/WS sem TLS, e o CORS aceita qualquer origem (`index.ts:43`). ESP32 e servidor deveriam ficar numa rede de automação separada da rede corporativa (IEC 62443: zonas e condutos).

**A13 — O agente do Antigravity apagou as regras de segurança do `AGENTS.md`.** O arquivo foi reescrito como documentação técnica, e as regras "a segurança da chama não é deste software", "nunca enfraquecer intertravamentos", "estado seguro = desligado" e "nunca exibir dado velho" **sumiram**. Isso explica parte dos problemas desta revisão. O `AGENTS.md` novo que acompanha esta revisão devolve essas regras e proíbe removê-las.

---

## 4. Achados de prioridade média

- **M1:** O firmware tem a faixa 20–95 fixa no código, enquanto o servidor usa as configurações. As duas camadas podem divergir. A faixa deve ser a mesma e vir de uma única fonte.
- **M2:** Os intertravamentos mostrados na tela são recalculados com números fixos (`CommandModal.tsx:26-41`, `HeaterDetail.tsx:50-54`). Deveriam ser **informados pelo controlador**.
- **M3:** O bipe é contínuo e não existe "silenciar" separado de "reconhecer" (ISA-18.2).
- **M4:** Não existe pós-circulação da bomba ao apagar o queimador em Manual. O calor residual pode ferver a água no trocador. O tempo deve seguir a recomendação do fabricante.
- **M5:** Não existe antirreciclagem (tempo mínimo desligado entre partidas do queimador). Cada partida envolve purga e ignição, e partidas frequentes desgastam e aumentam o risco.
- **M6:** O histórico guarda 7 dias. É pouco para investigar um incidente. A retenção deve ser definida com Qualidade e Segurança (sugestão: eventos e alarmes ≥ 1 ano).
- **M7:** Continuam pendentes da revisão anterior: o teste que apaga os alarmes do banco de produção e quebra o build, os estilos perdidos (`scada-shadow`, fonte Inter), o Tailwind varrendo `node_modules` e o `.env.example` citado no README, que não existe.
- **M8:** O banco SQLite está dentro do OneDrive, que pode travar ou corromper o arquivo em uso.
- **M9:** O texto "Bomba de Circulação 50CV" está fixo no código. Dados de placa devem vir de configuração.

---

## 5. O que já está bom

- WebSocket sem token é recusado (Teste 00).
- O ping a cada 2 s mantém o watchdog do ESP32 (Teste 01).
- A queda do ESP32 é detectada em cerca de 6 s, com alarme e aviso às telas (Teste 23/24).
- O alarme de temperatura alta e o de falha de sensor dos aquecedores funcionam (Teste 14).
- Existe limite de tentativas de login (Teste 27).
- O servidor não inicia sem `JWT_SECRET`.
- Os usuários ficam no SQLite com senha em bcrypt.
- A faixa "MODO SIMULAÇÃO" aparece e o simulador fica isolado do servidor real.
- O firmware desliga os queimadores ao perder a comunicação e inicia com todas as saídas em LOW.

---

## 6. Plano de correção (uma fase por conversa no Antigravity)

**Fase S1: parar com segurança e não mentir para o operador** (C1, C2, C3, C10, C12, A2)
1. Parada com prioridade: Off vale em qualquer modo e trava até uma nova partida (firmware e servidor).
2. Operador sempre pode desligar. Ligar, trocar modo e alterar setpoint seguem o perfil.
3. Lista branca de alvos, comandos e valores no servidor e no firmware. O que ficar de fora é recusado e auditado.
4. Confirmação de comando só com o retorno do `state`. Remover "ORDEM CONFIRMADA PELO ESP32" do envio.
5. Remover todo `Math.random` das telas. Gráficos com histórico real. "N/M" para o que não é medido (nível do tanque, modulação).
6. Modo somente visualização sem login, com alarmes e som. O logout só retira os comandos.

**Fase S2: tanque e limites** (C4, C5, C13, A1)
1. Faixas separadas para temperatura e pressão, validadas no servidor e no firmware.
2. Setpoint máximo com margem abaixo do corte.
3. Corte de pressão alta e bomba desligada com sensor em falha. Nível baixo bloqueia a bomba.
4. Validação completa do `PUT /settings`.
5. Alarmes H/L antes de HH/LL, com histerese (deadband) e atraso. Alarmes de pressão alta e de sensor do tanque.

**Fase S3: firmware robusto** (C6, C7, C8, A8, A9, M4, M5)
1. Entradas digitais de retorno: fluxostato ou contator, chama, bloqueio do programador, cadeia de segurança OK.
2. Estado explícito por equipamento (Off / On / Falha / Intertravado / Bloqueado), com o motivo.
3. Modo e setpoints salvos em NVS. Boot em estado seguro, com alarme "controlador reiniciado".
4. WiFiManager com senha, campos globais e callback de salvamento.
5. 4–20 mA conforme NAMUR NE43, com calibração e faixa configuráveis.
6. Pós-circulação e tempo mínimo desligado.
7. Mapa de E/S numa única fonte de verdade (corrigir C11).

**Fase S4: acesso, auditoria e rede** (C9, A5, A6, A7, A11, A12)
1. Uma única sessão de dispositivo, e validação do esquema do `state`.
2. Conferência do usuário no banco a cada conexão e requisição.
3. Auditoria completa, incluindo negados, configurações, usuários, logins e motivos.
4. Bloqueio de login por usuário.
5. Trocar todos os segredos e remover `.env` e `data/` dos pacotes.
6. TLS e rede de automação separada.

**Fase S5: operação** (A10, M6, M8)
1. Servidor como serviço do Windows com reinício automático.
2. Nobreak e projeto fora do OneDrive.
3. Retenção de histórico definida.
4. Decisão sobre o comportamento na queda do SCADA.

### Antes de ligar no equipamento real: teste de aceitação (SAT)

Monte uma **matriz de causa e efeito** (cada condição anormal → o que deve acontecer em cada camada). Teste **cada linha com o sinal real** (desconectar o PT100, abrir o laço 4–20 mA, tirar o Wi-Fi, reiniciar o ESP32, desligar o servidor, pressionar a emergência, simular falta de fluxo). Registre os resultados assinados pelo responsável técnico.

| Causa | Efeito esperado |
|---|---|
| PT100 aberto ou em curto | Queimador apaga · alarme "falha sensor" · tela mostra "FALHA SENSOR" |
| Laço 4–20 mA aberto (< 3,6 mA) ou em curto (> 21 mA) | Bomba e queimador protegidos · alarme · tela sem número |
| Temperatura ≥ limite H | Alarme de pré-aviso (sem corte) |
| Temperatura ≥ corte de software | Queimador apaga e trava · alarme HH · rearme só por usuário autorizado |
| Temperatura ≥ STB (hardware) | Programador bloqueia · ESP32 lê e informa "bloqueio" |
| Sem fluxo (fluxostato aberto) | Queimador não parte ou apaga · alarme |
| Queda do Wi-Fi ou do servidor | Comportamento definido na decisão da A10 · alarme local |
| ESP32 reinicia | Tudo desligado · alarme "controlador reiniciado" · exige nova partida |
| Emergência pressionada | Corte físico de tudo · ESP32 informa |
| Off enviado em Auto | Queimador apaga em ≤ 2 s e permanece apagado |
