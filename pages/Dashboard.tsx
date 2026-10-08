import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ValueDisplay } from '../components/ui/ValueDisplay';
import { BURNER_PHASE_LABEL } from '../types';

const Dashboard: React.FC = () => {
  const { heaters, tank, glp, isOnline } = useApp();
  const navigate = useNavigate();

  const aq01 = heaters.find(h => h.id === 'AQ01');
  const aq02 = heaters.find(h => h.id === 'AQ02');

  const getHeaterBg = (heater: any) => {
    if (!isOnline) return 'bg-[#334155]';
    if (heater?.burner.phase === 'LOCKOUT') return 'bg-[#ef4444]';
    if (heater?.burner.phase === 'RUNNING') return 'bg-[#eab308]';
    return 'bg-[#94a3b8]';
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <h1 className="m-0 text-xl font-bold leading-7 text-tc-text">Visão Geral</h1>

      {/* SINÓTICO */}
      <section aria-label="Sinótico do processo" className="box-border p-6 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-4 overflow-hidden shrink-0 @container">
        <div className="h-6 flex items-center gap-6">
          <h2 className="m-0 text-base font-semibold leading-6 text-tc-text">Processo</h2>
          <div className="ml-auto flex items-center gap-5 text-xs leading-4 text-tc-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-text"></span>Ligado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-equip-off"></span>Parado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-alarm-warn"></span>Aviso</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] border-2 border-tc-alarm-crit"></span>Alarme</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] border border-tc-border box-border pattern-no-data"></span>Sem dados</span>
          </div>
        </div>

        <div className="relative w-full aspect-[1604/440] overflow-hidden">
          <div className="relative w-full aspect-[1604/440] overflow-hidden">

  <svg viewBox="0 0 1604 440" width="100%" className="absolute inset-0 pointer-events-none">
    {/* Consumo */}
    <rect x="0" y="170" width="88" height="120" rx="8" fill="none" stroke="#4A515A" strokeWidth="2" />
    <line x1="44" y1="60" x2="44" y2="170" stroke="#8A99A8" strokeWidth="4" />
    <line x1="44" y1="290" x2="44" y2="384" stroke="#8A99A8" strokeWidth="4" />

    {/* Linha ida */}
    <line x1="44" y1="62" x2="854" y2="62" stroke="#8A99A8" strokeWidth="4" />
    <path d="M 150 56 L 159 62 L 150 68 Z" fill="#E2E8F0" />
    <path d="M 560 56 L 569 62 L 560 68 Z" fill="#E2E8F0" />

    {/* Linha retorno */}
    <line x1="44" y1="382" x2="1294" y2="382" stroke="#8A99A8" strokeWidth="4" />
    <path d="M 159 376 L 150 382 L 159 388 Z" fill="#E2E8F0" />
    <path d="M 569 376 L 560 382 L 569 388 Z" fill="#E2E8F0" />

    {/* AQ01 */}
    <line x1="310" y1="60" x2="310" y2="120" stroke="#8A99A8" strokeWidth="4" />
    <line x1="310" y1="290" x2="310" y2="380" stroke="#8A99A8" strokeWidth="4" />

    {/* AQ02 */}
    <line x1="850" y1="60" x2="850" y2="120" stroke="#4A515A" strokeWidth="4" />
    <line x1="850" y1="290" x2="850" y2="380" stroke="#4A515A" strokeWidth="4" />

    {/* Tanque */}
    <line x1="1290" y1="340" x2="1290" y2="384" stroke="#8A99A8" strokeWidth="4" />
    
    {/* Reposicao */}
    <line x1="1290" y1="40" x2="1290" y2="100" stroke="#4A515A" strokeWidth="4" />
    <line x1="1290" y1="144" x2="1290" y2="180" stroke="#4A515A" strokeWidth="4" />
  </svg>
  
<div className="absolute inset-0">

            {/* Consumo */}
            <div className="absolute w-[88px] h-[120px] box-border border-2 border-tc-equip-off rounded-lg flex items-center justify-center text-xs font-semibold tracking-wider text-tc-text-muted" style={{ left: '0.00%', top: '38.64%' }}>CONSUMO</div>
            <div className="absolute w-1 h-[110px] bg-tc-text-muted" style={{ left: '2.62%', top: '13.64%' }}></div>
            <div className="absolute w-1 h-[94px] bg-tc-text-muted" style={{ left: '2.62%', top: '65.91%' }}></div>

          {/* Linha de ida */}
          <div className="absolute w-[812px] h-1 bg-tc-text-muted" style={{ left: '2.62%', top: '13.64%' }}></div>
          <div className="absolute text-xs font-semibold tracking-wider text-tc-text-muted" style={{ left: '6.86%', top: '7.73%' }}>IDA · ÁGUA QUENTE</div>
          <div className="absolute w-0 h-0 border-y-[6px] border-y-transparent border-r-[9px] border-r-tc-text" style={{ left: '34.91%', top: '12.73%' }}></div>
          <div className="absolute w-0 h-0 border-y-[6px] border-y-transparent border-r-[9px] border-r-tc-text" style={{ left: '9.35%', top: '12.73%' }}></div>

          {/* Linha de retorno */}
          <div className="absolute w-[1250px] h-1 bg-tc-text-muted" style={{ left: '2.62%', top: '86.36%' }}></div>
          <div className="absolute text-xs font-semibold tracking-wider text-tc-text-muted" style={{ left: '6.86%', top: '89.09%' }}>RETORNO</div>
          <div className="absolute w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-tc-text" style={{ left: '9.35%', top: '85.45%' }}></div>
          <div className="absolute w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-tc-text" style={{ left: '34.91%', top: '85.45%' }}></div>

          {/* AQ01 */}
          <div className="absolute w-1 h-[60px] bg-tc-text-muted" style={{ left: '19.20%', top: '13.64%' }}></div>
          <div className="absolute w-1 h-[90px] bg-tc-text-muted" style={{ left: '19.20%', top: '65.91%' }}></div>
          <a onClick={() => navigate('/heater/AQ01')} className={`absolute w-[220px] h-[170px] box-border p-4 rounded-lg cursor-pointer flex flex-col justify-between ${isOnline ? (aq01?.burner.phase === 'LOCKOUT' ? 'bg-tc-equip-off border-[3px] border-tc-alarm-crit text-tc-text' : (aq01?.burner.phase === 'RUNNING' ? 'bg-tc-text text-tc-bg' : 'bg-tc-equip-off text-tc-text')) : 'bg-tc-border text-tc-text-muted pattern-no-data'}`} style={{ left: '12.47%', top: '27.27%' }}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-wider opacity-70">AQ01</span>
                <span className="text-base font-semibold">Aquecedor 01</span>
              </div>
              {aq01?.burner.phase === 'LOCKOUT' && isOnline && (
                <span className="h-6 px-1.5 rounded bg-tc-alarm-crit-fill text-white text-xs font-bold flex items-center tracking-wider">ALARME</span>
              )}
            </div>
            {isOnline && aq01?.burner.phase === 'RUNNING' ? (
              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF8A3D" stroke="#C2410C" strokeWidth="1.5" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                <span className="text-xs font-bold tracking-wider">QUEIMANDO</span>
              </div>
            ) : (
              <span className="text-xs font-bold tracking-wider">{isOnline ? BURNER_PHASE_LABEL[aq01?.burner.phase || 'OFF']?.toUpperCase() : 'SEM DADOS'}</span>
            )}
          </a>
          <div className={`absolute w-[44px] h-[44px] box-border rounded-full border-2 flex items-center justify-center ${isOnline ? (aq01?.pump.fb ? 'bg-tc-text border-tc-text' : 'bg-tc-bg border-tc-equip-off') : 'bg-tc-bg border-tc-border'}`} style={{ left: '17.96%', top: '71.14%' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isOnline && aq01?.pump.fb ? '#16191D' : (isOnline ? '#4A515A' : '#363C44')}><path d="M8 6 L18 12 L8 18 Z"></path></svg>
          </div>
          <div className="absolute flex flex-col" style={{ left: '21.45%', top: '72.27%' }}>
            <span className="text-xs font-semibold tracking-wider text-tc-text-muted">BOMBA AQ01</span>
            <span className="text-xs text-tc-text">{!isOnline ? 'Sem dados' : (aq01?.pump.fb ? 'Ligada' : 'Desligada')}</span>
          </div>
          <div className="absolute w-[200px] flex flex-col gap-3" style={{ left: '27.68%', top: '27.27%' }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">TEMPERATURA</span>
              <ValueDisplay value={aq01?.temp.value} quality={isOnline ? aq01?.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">PRESSÃO</span>
              <ValueDisplay value={aq01?.press.value} quality={isOnline ? aq01?.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
            </div>
          </div>

          {/* AQ02 */}
          <div className="absolute w-1 h-[60px] bg-tc-equip-off" style={{ left: '52.87%', top: '13.64%' }}></div>
          <div className="absolute w-1 h-[90px] bg-tc-equip-off" style={{ left: '52.87%', top: '65.91%' }}></div>
          <a onClick={() => navigate('/heater/AQ02')} className={`absolute w-[220px] h-[170px] box-border p-4 rounded-lg cursor-pointer flex flex-col justify-between ${isOnline ? (aq02?.burner.phase === 'LOCKOUT' ? 'bg-tc-equip-off border-[3px] border-tc-alarm-crit text-tc-text' : (aq02?.burner.phase === 'RUNNING' ? 'bg-tc-text text-tc-bg' : 'bg-tc-equip-off text-tc-text')) : 'bg-tc-border text-tc-text-muted pattern-no-data'}`} style={{ left: '46.13%', top: '27.27%' }}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-wider opacity-70">AQ02</span>
                <span className="text-base font-semibold">Aquecedor 02</span>
              </div>
              {aq02?.burner.phase === 'LOCKOUT' && isOnline && (
                <span className="h-6 px-1.5 rounded bg-tc-alarm-crit-fill text-white text-xs font-bold flex items-center tracking-wider">ALARME</span>
              )}
            </div>
            {isOnline && aq02?.burner.phase === 'RUNNING' ? (
              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF8A3D" stroke="#C2410C" strokeWidth="1.5" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                <span className="text-xs font-bold tracking-wider">QUEIMANDO</span>
              </div>
            ) : (
              <span className="text-xs font-bold tracking-wider">{isOnline ? BURNER_PHASE_LABEL[aq02?.burner.phase || 'OFF']?.toUpperCase() : 'SEM DADOS'}</span>
            )}
          </a>
          <div className={`absolute w-[44px] h-[44px] box-border rounded-full border-2 flex items-center justify-center ${isOnline ? (aq02?.pump.fb ? 'bg-tc-text border-tc-text' : 'bg-tc-bg border-tc-equip-off') : 'bg-tc-bg border-tc-border'}`} style={{ left: '51.62%', top: '71.14%' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isOnline && aq02?.pump.fb ? '#16191D' : (isOnline ? '#4A515A' : '#363C44')}><path d="M8 6 L18 12 L8 18 Z"></path></svg>
          </div>
          <div className="absolute flex flex-col" style={{ left: '55.11%', top: '72.27%' }}>
            <span className="text-xs font-semibold tracking-wider text-tc-text-muted">BOMBA AQ02</span>
            <span className="text-xs text-tc-text">{!isOnline ? 'Sem dados' : (aq02?.pump.fb ? 'Ligada' : 'Desligada')}</span>
          </div>
          <div className="absolute w-[200px] flex flex-col gap-3" style={{ left: '61.35%', top: '27.27%' }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">TEMPERATURA</span>
              <ValueDisplay value={aq02?.temp.value} quality={isOnline ? aq02?.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">PRESSÃO</span>
              <ValueDisplay value={aq02?.press.value} quality={isOnline ? aq02?.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
            </div>
          </div>

          {/* TANQUE TX01 */}
          <div className="absolute w-1 h-[44px] bg-tc-text-muted" style={{ left: '80.30%', top: '77.27%' }}></div>
          <div className="absolute w-[140px] h-[160px] box-border rounded-2xl border-2 border-tc-equip-off bg-tc-nav-active overflow-hidden" style={{ left: '76.06%', top: '40.91%' }}>
            <span className="absolute left-3 top-2.5 text-xs font-semibold tracking-wider text-tc-text-muted">TX01</span>
            {isOnline && tank?.levelNormal && <div className="absolute left-0  w-[136px] h-[86px] bg-[#2B3F55]" style={{ top: '15.91%' }}></div>}
            {isOnline && tank?.levelNormal && <div className="absolute left-0  w-[136px] h-0.5 bg-[#5C7FA3]" style={{ top: '15.91%' }}></div>}
            
            <span className={`absolute h-5 box-border flex items-center px-1.5 rounded border ${isOnline ? (tank?.pressureLow ? 'border-tc-alarm-crit bg-tc-alarm-crit-fill text-white' : 'border-tc-text-muted text-tc-text') : 'border-tc-border text-tc-text-muted pattern-no-data'} text-xs font-bold`} style={{ left: '5.74%', top: '2.27%' }}>PS</span>
            <div className="absolute w-[38px] h-0.5 bg-tc-text" style={{ left: '5.99%', top: '26.36%' }}></div>
            <span className={`absolute h-5 box-border flex items-center px-1.5 rounded border ${isOnline ? (!tank?.levelNormal ? 'border-tc-alarm-crit bg-tc-alarm-crit-fill text-white' : 'border-tc-text-muted text-tc-text') : 'border-tc-border text-tc-text-muted pattern-no-data'} bg-tc-nav-active text-xs font-bold`} style={{ left: '5.74%', top: '28.18%' }}>LS</span>
          </div>

          {/* Reposição: rede de água -> bomba -> tanque */}
          <span className="absolute text-xs font-semibold tracking-wider text-tc-text-muted" style={{ left: '81.05%', top: '8.18%' }}>REDE DE ÁGUA</span>
          <div className="absolute w-1 h-[60px] bg-tc-equip-off" style={{ left: '80.30%', top: '9.09%' }}></div>
          <div className={`absolute w-[44px] h-[44px] box-border rounded-full border-2 flex items-center justify-center ${isOnline && tank?.pumpFb ? 'bg-tc-text border-tc-text' : 'bg-tc-bg border-tc-equip-off'}`} style={{ left: '79.05%', top: '22.73%' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isOnline && tank?.pumpFb ? '#16191D' : '#4A515A'}><path d="M6 8 L12 18 L18 8 Z"></path></svg>
          </div>
          <div className="absolute w-1 h-[36px] bg-tc-equip-off" style={{ left: '80.30%', top: '32.73%' }}></div>
          
          <div className="absolute w-[220px] flex flex-col gap-3" style={{ left: '86.28%', top: '34.09%' }}>
            <span className="text-base font-semibold text-tc-text cursor-pointer hover:underline" onClick={() => navigate('/tank')}>Tanque de Expansão</span>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">CHAVE DE NÍVEL (LS)</span>
              <span className="text-base font-semibold text-tc-text">{!isOnline ? 'Sem dados' : (tank?.levelNormal ? 'Nível normal' : 'Nível BAIXO')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">PRESSOSTATO (PS)</span>
              <span className="text-base font-semibold text-tc-text">{!isOnline ? 'Sem dados' : (tank?.pressureLow ? 'Pressão BAIXA' : 'Pressão normal')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-tc-text-muted">BOMBA DE REPOSIÇÃO</span>
              <span className="text-base font-semibold text-tc-text">{!isOnline ? 'Sem dados' : (tank?.pumpFb ? 'Ligada' : 'Desligada')}</span>
            </div>
          </div>

          {/* GLP */}
          <div className="absolute w-[184px] flex flex-col gap-1 cursor-pointer hover:underline" style={{ left: '88.53%', top: '0.00%' }} onClick={() => navigate('/glp')}>
            <span className="text-xs font-semibold tracking-wider text-tc-text-muted">ESTOQUE DE GLP</span>
            <ValueDisplay value={glp?.currentLevelKg} quality={isOnline ? 'OK' : 'COMM_LOST'} decimals={0} unit="kg" />
            <span className="text-xs text-tc-text-muted">{`${((glp?.currentLevelKg || 0) / (glp?.capacityKg || 1) * 100).toFixed(0)} % da capacidade`}</span>
          </div>
          </div>
          
</div>
</div>
</section>

      {/* RESUMOS POR AQUECEDOR */}
      <div className="h-[348px] grid grid-cols-2 gap-6">
        {[aq01, aq02].map((aq, i) => {
          if (!aq) return null;
          return (
            <section key={aq.id} aria-label={`Resumo do Aquecedor 0${i + 1}`} className="box-border p-6 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-4">
              <div className="h-11 flex items-center gap-3">
                <h2 className="m-0 text-base font-semibold leading-6 text-tc-text">Aquecedor 0{i + 1}</h2>
                <span className="text-tc-text-muted">{aq.id}</span>
                {isOnline ? (
                  <span className={`h-6 flex items-center px-2 rounded ${aq.burner.phase === 'LOCKOUT' ? 'bg-tc-alarm-crit-fill text-white' : (aq.burner.phase === 'RUNNING' ? 'bg-tc-text text-tc-bg' : 'bg-tc-equip-off text-tc-text')} text-xs font-bold tracking-wider`}>
                    {BURNER_PHASE_LABEL[aq.burner.phase || 'OFF']?.toUpperCase()}
                  </span>
                ) : (
                  <span className="h-6 flex items-center px-2 rounded border border-tc-border pattern-no-data text-tc-text-muted text-xs font-bold tracking-wider">
                    SEM DADOS
                  </span>
                )}
                <a onClick={() => navigate(`/heater/${aq.id}`)} className="ml-auto h-11 flex items-center gap-1 font-semibold text-tc-action cursor-pointer hover:underline">
                  Abrir detalhe
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>
                </a>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">TEMPERATURA (PT100)</span>
                  <ValueDisplay value={aq.temp.value} quality={isOnline ? aq.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">NOVUS PV / SP</span>
                  {!isOnline || aq.novus.quality !== 'OK' || !aq.novus.commOk ? (
                    <span className={`h-8 self-start flex items-center px-2.5 rounded text-xs font-semibold ${!aq.novus.commOk && isOnline ? 'bg-tc-alarm-warn text-tc-bg' : 'border border-tc-border pattern-no-data text-tc-text-muted'}`}>
                      {!aq.novus.commOk && isOnline ? 'FALHA DE COM.' : 'SEM DADOS'}
                    </span>
                  ) : (
                    <span className="flex items-baseline gap-1">
                      <ValueDisplay value={aq.novus.pv} decimals={1} />
                      <span className="text-tc-text-muted tabular-nums">/</span>
                      <ValueDisplay value={aq.novus.sp} decimals={1} unit="°C" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">MODULAÇÃO</span>
                  <ValueDisplay value={aq.novus.mv} quality={isOnline && aq.novus.commOk ? aq.novus.quality : 'COMM_LOST'} decimals={0} unit="%" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">PRESSÃO</span>
                  <ValueDisplay value={aq.press.value} quality={isOnline ? aq.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">PERMISSÃO</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted text-xs font-semibold flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="text-base font-semibold">{aq.burner.permission ? 'Concedida' : 'Negada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">BOMBA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted text-xs font-semibold flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="text-base font-semibold">{aq.pump.fb ? 'Ligada' : 'Desligada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">BLOQUEIOS 24 H</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted text-xs font-semibold flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="text-base font-semibold tabular-nums">{aq.burner.lockoutCount24h.toLocaleString('pt-BR')}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wider text-tc-text-muted">HORAS DE QUEIMA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted text-xs font-semibold flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="text-base font-semibold tabular-nums"><ValueDisplay value={aq.burner.runHours} decimals={1} unit="h" /></span>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-tc-border flex items-center gap-3">
                <span className="text-xs font-semibold tracking-wider text-tc-text-muted">ALARMES</span>
                {!isOnline ? (
                  <span className="h-6 px-2.5 rounded border border-tc-border text-tc-text-muted text-xs font-semibold flex items-center pattern-no-data">SEM DADOS</span>
                ) : (
                  <span className="text-tc-text-muted">{aq.burner.blockReasons?.length > 0 ? `Bloqueios: ${aq.burner.blockReasons.join(' · ')}` : 'Nenhum alarme de bloqueio ativo'}</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
