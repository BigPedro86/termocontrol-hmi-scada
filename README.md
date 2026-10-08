# TermoControl HMI/SCADA

Sistema SCADA industrial para controle de aquecedores a GLP e tanque de expansão, monitoramento em tempo real via ESP32.

## Tecnologias

- **Frontend (HMI):** React, TypeScript, Tailwind CSS, Vite
- **Backend (SCADA):** Node.js, Express, WebSocket, SQLite
- **Firmware:** ESP32, C++ (Arduino Core)

## Como iniciar

### Backend
1. Entre na pasta `server` e instale as dependências.
2. Copie `.env.example` para `.env` e configure (ex: JWT_SECRET).
3. Execute `npm run dev` para rodar em desenvolvimento.

### Frontend
1. Na raiz do projeto, instale as dependências.
2. Execute `npm run dev`.

### Firmware
1. Use PlatformIO para compilar e fazer upload do código na pasta `firmware`.
2. Configure as credenciais no WiFi Manager (Access Point que abrirá caso não conecte à rede).
