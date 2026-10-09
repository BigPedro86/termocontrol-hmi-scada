# Pendências para o responsável técnico

Nada deste sistema deve operar um queimador antes desta lista estar completa e assinada. O ESP32 não é equipamento de segurança: ele só retira a permissão, em série com o TL. A segurança é do LFL1.333 e das proteções cabeadas.

## A. Instalação (conferir em campo, com o queimador desenergizado)

| # | Item | Condição esperada | Onde está | Se estiver errado | Confirmado por | Data |
|---|---|---|---|---|---|---|
| A1 | Contato de permissão do ESP32 | NA, em série com o TL. Nunca em paralelo nem no lugar de TS, PG, IN ou pressostato de ar | — | O ESP32 poderia contornar uma proteção | | |
| A2 | O que aciona o TL hoje | Termostato próprio ou relé I/O1 do Novus (informar qual) | firmware/include/io_map.h:78 | As fases "Em espera" e "Purga" ficam erradas na tela. Sem efeito na segurança | | |
| A3 | TS (termostato de segurança) | Rearme manual | — | Se for automático, o queimador religa sozinho depois de sobretemperatura (ver C3) | | |
| A4 | Pressostato de gás de máxima, pressostato de ar, VPS | Instalados e em série na cadeia do LFL | — | Falta proteção exigida pela NBR 12313 | | |
| A5 | Botão de emergência | Cabeado, cortando a cadeia sem passar pelo ESP32 | — | A emergência dependeria de software | | |
| A6 | Chave de nível do tanque | Em série também com a bobina da bomba de reposição | — | A bomba pode rodar a seco se o ESP32 falhar | | |
| A7 | Módulos de entrada 230 V | Saída do opto leva a entrada do MCP23017 a GND com o sinal presente. Informar se a saída é filtrada ou pulsada (100 Hz) | firmware/include/io_map.h:49 | Se a polaridade for outra, fio rompido aparece como "OK" (falha insegura). Validar pelo docs/TESTE_BANCADA_FASE3.md | | |
| A8 | Transmissor de pressão | 0–10 bar, 4–20 mA, shunt de 250 Ω no ADS1115 | firmware/src/hal_esp32.cpp:300 | Pressão errada na tela e cortes no valor errado | | |
| A9 | Novus N2000S | Quantidade, endereços 1 (AQ01) e 2 (AQ02), 9600 bps 8N1, grandeza medida (corrigir a placa "PRESSÃO VAPOR") | firmware/src/hal_esp32.cpp:178 | Sem comunicação, ou PV de outra grandeza | | |
| A10 | Pull-down de 10 kΩ no GPIO 4 (DE/RE do RS-485) | Instalado | — | Transmissão de lixo no barramento dos Novus durante o boot | | |
| A11 | NR-13 | Enquadramento dos aquecedores e do tanque avaliado | — | Exigências legais de inspeção e documentação | | |

## B. Parâmetros do controle (valores provisórios)

| # | Item | Valor atual | Onde está | Se estiver errado | Confirmado por | Data |
|---|---|---|---|---|---|---|
| B1 | Polaridade das entradas | Ativo = nível baixo (opto conduzindo) | firmware/include/io_map.h:49 | Ver A7 | | |
| B2 | Filtro das entradas | 40 ms | firmware/include/config.h:25 | Curto: entradas piscam e a permissão cai à toa. Longo: atraso na detecção (as proteções reais continuam no hardware) | | |
| B3 | Registradores do Novus | SV=0, PV=1, MV=2, status 6 e 9; escala ÷10, com sinal | firmware/src/hal_esp32.cpp:308 | Tela com PV/SP/MV errados. Sem efeito na regulação: o ESP32 só lê o Novus | | |
| B4 | Bits de alarme do Novus | Não usados (publicados como null) até a validação | firmware/src/hal_esp32.cpp | — | | |
| B5 | Pressão mínima de água | 1,0 bar (documentação antiga dizia 0,5) | firmware/include/config.h:16 | Abaixo dela, a permissão é negada e a bomba desliga (com leitura válida). Baixa demais: operação com pouca pressão. Alta demais: paradas indevidas | | |
| B6 | Pressão máxima de água | 6,0 bar | firmware/include/config.h:17 | Deve ficar abaixo do pressostato de máxima e da válvula de segurança | | |
| B7 | Limite de temperatura de software | Trava em 90 °C, pré-aviso em 85 °C, rearme abaixo de 85 °C | firmware/include/config.h:13 | Deve ficar acima do setpoint do Novus e abaixo do TS | | |
| B8 | Tolerância de discrepância | Gás sem permissão: 3 s. Gás sem ventilador: 2 s | firmware/include/config.h:27 | Curta: alarme falso na parada. Longa: demora para detectar contato colado | | |
| B9 | Falha de ignição | 60 s em purga sem chama (LFL: pré-purga 31 s + segurança 3 s) | firmware/include/config.h:20 | Curto: falha falsa na partida. Longo: demora para retirar a permissão | | |
| B10 | Prova de circulação | 10 s de retorno da bomba antes da permissão | firmware/include/config.h:29 | — | | |
| B11 | Falha da bomba | 5 s comandada sem retorno | firmware/include/config.h:19 | — | | |
| B12 | Pós-circulação | 180 s | firmware/include/config.h:18 | Curta: calor residual pode atuar o TS | | |
| B13 | Bloqueios do LFL | 3 em 24 h travam a partida até rearme por Supervisor ou Manutenção | firmware/include/config.h:21 | — | | |
| B14 | Tanque de expansão | Nível baixo confirmado em 2 s; reposição: 30 s mínimo desligada, alarme com mais de 10 partidas por hora, trava com 600 s seguidos ligada | firmware/include/config.h:31 | — | | |
| B15 | Novus sem comunicação | 5 s: alarme e permissão negada | firmware/include/config.h:24 | Ver C1 sobre a política | | |
| B16 | Divergência PT100 × PV do Novus | 5 °C, desativada até confirmar que medem o mesmo ponto | firmware/include/config.h:22 | — | | |

## C. Comportamentos (decisões de operação)

| # | Situação | Comportamento atual | Alternativa | Onde está | Confirmado por | Data |
|---|---|---|---|---|---|---|
| C1 | Perda do servidor ou do Wi-Fi | Queimadores param (STOP_BURNERS); bombas fazem pós-circulação | Continuar com a lógica local e o Novus | firmware/include/config.h:36 | | |
| C2 | Sensor de pressão em falha | Queimador sem permissão; bomba mantida | Desligar a bomba | firmware/src/plant_logic.cpp:20 | | |
| C3 | Cadeia de segurança aberta (TS ou IN) | Queimador para pelo hardware; o pedido continua e ele religa sozinho depois do rearme local | Exigir nova partida pela tela | firmware/src/burner_logic.cpp:196 | | |
| C4 | Rearme local do LFL com pedido ativo | Religa sozinho pela sequência normal | Exigir nova partida pela tela | firmware/src/burner_logic.cpp:203 | | |
| C5 | Emergência | Derruba os pedidos; exige nova partida depois de soltar | — | firmware/src/plant_logic.cpp:18 | | |
