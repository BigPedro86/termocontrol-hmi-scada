# Pendências para o Responsável Técnico

As decisões, limites operacionais e lógicas de segurança abaixo requerem a validação formal do responsável técnico pela planta.

| Item | Valor Atual | Onde está (Arquivo:Linha) | O que muda se estiver errado | Confirmado por | Data |
|---|---|---|---|---|---|
| **Polaridade dos módulos de entrada** | Ativo = Nível Baixo (Filtro) | `firmware/include/io_map.h:49` | Falsos alarmes, equipamentos podem partir invertidos ou ignorar acionamentos físicos. | | |
| **Portas MCP23017 GPA7/GPB7** | Somente funcionam como SAÍDA | `firmware/include/io_map.h:27` | Perda de comando do buzzer e relés; falha na alocação de I/O. | | |
| **Filtro de Ruído das Entradas (Debounce)** | `inputFilterMs = 40 ms` | `firmware/include/config.h` | 40 ms pode ser lento para proteções ultra-rápidas ou curto para cabos longos sujeitos a indução. | | |
| **Registradores do Novus** | SV=0, PV=1, MV=2, Status 6 e 9 (escala ÷10) | Firmware Modbus/Driver | Leitura incorreta da modulação; envio errado de setpoint e descontrole da temperatura da caldeira. | | |
| **Relé do Termostato Limite (TL)** | Acionado pelo I/O1 do Novus | Diagrama elétrico / Regras Modbus | O ESP32 não saberá se o TL abriu por falha de software/Modbus ou hardware; risco de segurança. | | |
| **Pressão Mínima da Água (Permissão)** | `1.0 bar` | `firmware/include/config.h:12` / `AGENTS.md:128` | Se for 0.5 bar, a bomba pode cavitar e a caldeira fundir. Se for maior, paradas indesejadas (nuisance trips). | | |
| **Limite de Temperatura (Software)** | Corte = 90 °C, Pré-aviso = 85 °C | `firmware/include/config.h` | Água pode ferver se for >95°C; ou alarmes constantes se estiver próximo do setpoint operacional. | | |
| **Discrepância (Tolerância de Falha)** | Sem Permissão: 3 s / Sem Vento: 2 s | Config. Sistema / `burner_logic` | 3 s pode não ser suficiente para a inércia da válvula; 2 s pode atrasar a identificação do contato colado. | | |
| **Política de Perda do Servidor** | `STOP_BURNERS` | Firmware | Ao perder o SCADA, a planta pararia. Se a operação dever continuar via Novus local, causará parada de planta não programada. | | |
| **Bomba x Sensor de Pressão em Falha** | A bomba é **mantida** rodando | `firmware/src/plant_logic.cpp:20` | Se mantida, pode rodar a seco e estragar; se cortada, a água na caldeira pode ferver sem a pós-circulação. | | |
| **Cadeia de Segurança Aberta (TS)** | Mantém pedido, religa sozinho no rearme | `firmware/src/plant_logic.cpp` | Operador não precisa mandar partir no SCADA após resetar no painel. Risco se a operação esquecer que estava "ligado". | | |
| **Limite de Bloqueios LFL (ISA-18.2)** | 3 bloqueios em 24 h | Config. Sistema / `burner_logic` | Se 3 for muito pouco, gerará travamentos constantes exigindo Admin. | | |
| **Tempo de Pós-Circulação (Resfriamento)**| `180 s` (3 minutos) | `firmware/include/config.h` | 3 min pode não dissipar o calor residual das paredes, abrindo o TS localmente. | | |
| **Tanque: Tempo entre Partidas** | Mínimo 30 s desligada | `docs/ARQUITETURA_CONTROLE.md:174` | Pode danificar o contator/motor se houver oscilação da boia. | | |
| **Tanque: Reposições Frequentes** | 10 partidas por hora | `docs/ARQUITETURA_CONTROLE.md:175` | Sensibilidade do aviso de vazamento na tubulação (H). | | |
| **Tanque: Reposição Prolongada** | 10 min seguidos (600 s) | `docs/ARQUITETURA_CONTROLE.md:176` | Vazamento severo na tubulação não interromperá a bomba. | | |
| **Valor de MOCK em mA (pressmA)** | 12.0 mA fixo (provisório) | `firmware/src/state_json.cpp:84` | A interface de diagnóstico sempre mostrará 12mA, ocultando falhas reais no sensor (fio rompido/curto). | | |
