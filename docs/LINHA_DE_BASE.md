# Linha de Base - Revisão de Segurança TermoControl

## 1. Saída do Compilador Frontend (`npx tsc --noEmit`)
```text
components/Layout.tsx(9,11): error TS2339: Property 'state' does not exist on type 'AppContextType'.
components/Sidebar.tsx(7,11): error TS2339: Property 'state' does not exist on type 'AppContextType'.
components/Topbar.tsx(7,56): error TS2339: Property 'state' does not exist on type 'AppContextType'.
context/AppContext.tsx(73,64): error TS2339: Property 'theme' does not exist on type 'AppSettings'.
context/AppContext.tsx(74,16): error TS2339: Property 'theme' does not exist on type 'AppSettings'.
pages/Alarms.tsx(104,44): error TS2339: Property 'useSimulation' does not exist on type 'AppSettings'.
pages/ComponentsPage.tsx(115,34): error TS2871: This expression is always nullish.
pages/HeaterDetail.tsx(24,41): error TS2339: Property 'useSimulation' does not exist on type 'AppSettings'.
pages/HeaterDetail.tsx(47,36): error TS2339: Property 'useSimulation' does not exist on type 'AppSettings'.
pages/HeaterDetail.tsx(87,55): error TS2322: Type '{ phase: BurnerPhase; isOnline: boolean; }' is not assignable to type 'IntrinsicAttributes & PhaseStepperProps'.
  Property 'isOnline' does not exist on type 'IntrinsicAttributes & PhaseStepperProps'.
```

## 2. Teste `test_plant_nivel_normaliza_rearme` (Falha)
**O que ele afirma:** 
O teste simula uma falha de nível baixo do tanque (que corta a permissão geral da planta). Após a simulação, ele restabelece o sinal físico do sensor de nível para normal, envia um comando remoto de reset (`TANK_LEVEL_RESET` usando perfil de Manutenção), religa o sinal de start (`cmd_start`) e afirma que o queimador deve recuperar a permissão (`b1.getPermission() == TRUE`).

**O que acontece de fato:** 
A asserção falha na linha 720, pois `b1.getPermission()` retorna `FALSE`.

**Defeito no teste ou na lógica?**
O defeito está na **lógica de controle** (como especificado, será tratado na fase N11). A intenção do teste é perfeitamente válida e simula a operação real esperada. A falha ocorre provavelmente porque a rotina de rearme em `tank_logic.cpp` não limpa adequadamente o latch de erro (trava), ou a integração da planta (`plant_logic.cpp`) exige que algum estado adicional, como o feedback atualizado da bomba, volte primeiro antes de liberar a ignição novamente.

## 3. Uso de Flash e RAM (ESP32)
Resultados do build de release com `pio run -e esp32`:
- **Status:** SUCCESS (Tempo de build: ~21s)
- **RAM:** 14.8% (used 48372 bytes from 327680 bytes)
- **Flash:** 82.7% (used 1083457 bytes from 1310720 bytes)
