import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const docsDir = path.join(__dirname, '..', 'docs', 'capturas');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log('Verificando se o servidor está online...');
  try {
    const response = await fetch('http://localhost:3000');
    if (!response.ok) throw new Error('Status ' + response.status);
  } catch (err) {
    console.error('Servidor unificado não está no ar! Inicie com "npm run dev" na pasta server. Erro:', err.message);
    process.exit(1);
  }

  console.log('Verificando se o servidor Node está online...');
  try {
    const response = await fetch('http://localhost:3000/alarms');
    if (!response.ok) throw new Error('Status ' + response.status);
  } catch (err) {
    console.error('Servidor Node não está no ar! Inicie com "npm run dev" na pasta server. Erro:', err.message);
    process.exit(1);
  }

  const browser = await chromium.launch();
  
  const setupPage = async (page) => {
    page.on('pageerror', (err) => {
      console.error('Erro na página:', err);
      process.exit(1);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('WebSocket') || text.includes('ERR_CONNECTION_REFUSED') || text.includes('NetworkError')) {
          console.warn('Ignorando erro de rede/WS esperado:', text);
          return;
        }
        console.error('Erro no console:', text);
        process.exit(1);
      }
    });
  };

  const captureScenario = async (name, args, width = 1920, height = 1080) => {
    console.log(`Capturando ${name} (${width}x${height})...`);
    const esp32 = spawn('node', ['server/tools/fake-esp32.js', ...args], { cwd: path.join(__dirname, '..') });
    
    // allow fake esp32 to connect to server and push state
    await sleep(2000);

    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await setupPage(page);
    await page.goto('http://localhost:3000/#/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('nav', { timeout: 10000 });
    
    console.log(`Aguardando ESP32 conectar no frontend (${name})...`);
    await page.waitForSelector('span[title="OK"]', { timeout: 15000 });
    await sleep(500); // tempo extra para renderizar gráficos e transições
    
    await page.screenshot({ path: path.join(docsDir, `${name}.png`), fullPage: true });
    
    await context.close();
    esp32.kill();
    await sleep(500);
  };

  // Scenarios
  await captureScenario('visao_geral_normal_1920', [], 1920, 1080);
  await captureScenario('visao_geral_normal_1366', [], 1366, 768);
  await captureScenario('visao_geral_sensor_fault_1920', ['--sensor-fault'], 1920, 1080);
  await captureScenario('visao_geral_low_level_1920', ['--low-level'], 1920, 1080);
  await captureScenario('visao_geral_no_novus_1920', ['--no-novus'], 1920, 1080);

  // Sem servidor
  console.log('Aviso: O servidor Node foi iniciado externamente. O script não derrubará o servidor. Cenário "sem_servidor" será pulado.');


  await browser.close();
  console.log('Capturas concluídas com sucesso em docs/capturas/');
}

run().catch(console.error);
