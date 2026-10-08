# Roteiro de Teste de Bancada — Fase 3

## Preparação
1. Grave o firmware atualizado.
2. Certifique-se de ter os módulos **MCP23017**, **ADS1115** e **RS485** conectados ao I2C/UART2 conforme Tabela 1.
3. Certifique-se de colocar um resistor de **pull-down (10 kΩ)** no pino de DE/RE do RS485 (GPIO 4) para a inicialização não emitir "lixo" no barramento.

## 1. Teste do Filtro de 40 ms e Polaridade (Ativo = BAIXO)
- **Passo 1:** Desconecte a entrada `SAFETY_CHAIN_OK` (fio rompido, pull-up atuando, nível ALTO no MCP).
- **Passo 2:** Verifique no state (ou Serial) que `SAFETY_CHAIN_OK` aparece como falso/inativo.
- **Passo 3:** Ligue a entrada ao GND (nível BAIXO). Verifique que ela passa para verdadeira/ativa.
- **Passo 4:** Injete um sinal pulsante de **100 Hz** (10 ms ligado, 10 ms desligado) na mesma entrada (simulando bounce ou interferência rápida).
- **Passo 5:** Verifique que a entrada se mantém ATIVA de forma estável, não oscilando no ESP32.

## 2. Teste de Tolerância a Falha de Comunicação (ioFault)
- **Passo 1:** Com o sistema ligado, remova os fios SDA/SCL do MCP23017.
- **Passo 2:** Verifique se as pressões indicam `FAULT` e se a cadeia de segurança indica `false`.
- **Passo 3:** Verifique que os dois queimadores não partem (ou desligam se estavam rodando), apresentando o motivo de bloqueio `IO_MODULE_FAULT`.
- **Passo 4:** Verifique no sistema a presença do alarme crítico `Falha de comunicação com módulo de E/S`.

## 3. Teste do Modbus Assíncrono e Non-blocking Wi-Fi
- **Passo 1:** Altere as credenciais Wi-Fi para um SSID que não existe ou desligue o roteador.
- **Passo 2:** Reinicie o ESP32. Ele abrirá o portal "TermoControl_AP".
- **Passo 3:** Conecte um mestre Modbus ou observador no pino serial. Verifique se as consultas Modbus continuam ocorrendo, demonstrando que a inicialização de Wi-Fi não está bloqueando o loop.
- **Passo 4:** Interrompa a comunicação com o Novus (remova o cabo D+/D-). O loop de controle **não deve travar** (cada requisição tem timeout não-bloqueante na lib eModbus).
- **Passo 5:** Após 5 segundos sem Modbus, as variáveis `PV`, `SV` e `MV` do Novus devem indicar qualidade `COMM_LOST`.
