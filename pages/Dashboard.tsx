import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ValueDisplay, PumpIndicator } from '../components/ui';
import { BURNER_PHASE_LABEL } from '../types';
import { t } from '../i18n/pt';

const Dashboard: React.FC = () => {
  const { heaters, tank, glp, isOnline } = useApp();
  const navigate = useNavigate();

  const aq01 = heaters.find(h => h.id === 'AQ01');
  const aq02 = heaters.find(h => h.id === 'AQ02');

  return (
    <div className="flex-1 flex flex-col gap-4">
      <h1 className="title-page m-0 text-tc-text">Visão Geral</h1>

      {/* SINÓTICO (PADRAO_VISUAL.md seção 7 e modelo-visao-geral.html) */}
      <section aria-label="Sinótico do processo" className="box-border p-6 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-4 overflow-hidden shrink-0">
        <div className="h-6 flex items-center gap-6">
          <h2 className="title-card m-0 text-tc-text">Processo</h2>
          <div className="ml-auto flex items-center gap-5 label text-tc-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-equip-on"></span>Ligado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-equip-off"></span>Parado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] bg-tc-alarm-warn"></span>Aviso</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] border-2 border-tc-alarm-crit"></span>Alarme</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px] border border-tc-border box-border pattern-no-data"></span>Sem dados</span>
          </div>
        </div>

        {/* Área do sinóptico: fontes 100% no padrão sem redução por scale */}
        <div className="w-full overflow-x-auto pb-2">
          <div 
            className="relative select-none shrink-0 mx-auto"
            style={{ 
              width: 1604, 
              height: 460 
            }}
          >
            {/* O SVG desenha só tubulação e equipamentos (PADRAO_VISUAL.md seção 6 e 7) */}
            <svg viewBox="0 0 1604 460" width="1604" height="460" className="absolute inset-0 pointer-events-none">
              <defs>
                <style>{`
                  @keyframes pipeDash {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                  }
                  .flow-anim {
                    animation: pipeDash 1.2s linear infinite;
                  }
                `}</style>
              </defs>

              {/* Tubulação vertical conectada ao CONSUMO: conecta no topo (y=180) e retoma na base (y=300), sem cruzar o card */}
              <line x1="44" y1="70" x2="44" y2="180" stroke="#8A99A8" strokeWidth="4" />
              <line x1="44" y1="300" x2="44" y2="390" stroke="#8A99A8" strokeWidth="4" />

              {/* Linha IDA (Água Quente) */}
              <line x1="44" y1="70" x2="850" y2="70" stroke="#8A99A8" strokeWidth="4" />
              {isOnline && (aq01?.pump.fb || aq02?.pump.fb) && (
                <line 
                  x1="44" y1="70" x2="850" y2="70" 
                  stroke="#E7EAEE" strokeWidth="2" strokeDasharray="6 6" 
                  className="flow-anim" 
                />
              )}
              {/* Setas de fluxo da IDA (apontando para a esquerda / consumo) */}
              <path d="M 159 64 L 150 70 L 159 76 Z" fill="#E7EAEE" />
              <path d="M 569 64 L 560 70 L 569 76 Z" fill="#E7EAEE" />

              {/* Linha RETORNO */}
              <line x1="44" y1="390" x2="1290" y2="390" stroke="#8A99A8" strokeWidth="4" />
              {isOnline && (aq01?.pump.fb || aq02?.pump.fb) && (
                <line 
                  x1="44" y1="390" x2="1290" y2="390" 
                  stroke="#E7EAEE" strokeWidth="2" strokeDasharray="6 6" 
                  className="flow-anim" 
                  style={{ animationDirection: 'reverse' }}
                />
              )}
              {/* Setas de fluxo do RETORNO (apontando para a direita) */}
              <path d="M 150 384 L 159 390 L 150 396 Z" fill="#E7EAEE" />
              <path d="M 560 384 L 569 390 L 560 396 Z" fill="#E7EAEE" />

              {/* Conexões verticais AQ01 */}
              <line x1="308" y1="70" x2="308" y2="130" stroke="#8A99A8" strokeWidth="4" />
              <line x1="308" y1="300" x2="308" y2="390" stroke="#8A99A8" strokeWidth="4" />

              {/* Conexões verticais AQ02 */}
              <line x1="848" y1="70" x2="848" y2="130" stroke={isOnline && aq02?.burner.phase !== 'OFF' ? '#8A99A8' : '#4A515A'} strokeWidth="4" />
              <line x1="848" y1="300" x2="390" y2="390" stroke={isOnline && aq02?.burner.phase !== 'OFF' ? '#8A99A8' : '#4A515A'} strokeWidth="4" />

              {/* Conexões do Tanque TX01 e Reposição */}
              <line x1="1288" y1="350" x2="1288" y2="390" stroke="#8A99A8" strokeWidth="4" />
              <line x1="1288" y1="48" x2="1288" y2="106" stroke="#4A515A" strokeWidth="4" />
              <line x1="1288" y1="142" x2="1288" y2="190" stroke="#4A515A" strokeWidth="4" />
            </svg>

            {/* RÓTULOS, VALORES E EQUIPAMENTOS EM HTML SOBRE O DESENHO */}
            <div className="absolute inset-0">
              {/* Consumo */}
              <div 
                style={{ left: 0, top: 180, width: 88, height: 120 }} 
                className="absolute box-border border-2 border-tc-equip-off rounded-lg flex items-center justify-center label text-tc-text-muted"
              >
                CONSUMO
              </div>

              {/* Rótulos das Linhas */}
              <span style={{ left: 110, top: 44 }} className="absolute label text-tc-text-muted">
                IDA · ÁGUA QUENTE
              </span>
              <span style={{ left: 110, top: 402 }} className="absolute label text-tc-text-muted">
                RETORNO
              </span>

              {/* === AQ01 === */}
              <div
                onClick={() => navigate('/heater/AQ01')}
                style={{ left: 200, top: 130, width: 220, height: 170 }}
                className={`absolute box-border p-4 rounded-lg cursor-pointer flex flex-col justify-between ${
                  !isOnline
                    ? 'border border-tc-border pattern-no-data text-tc-text-muted'
                    : aq01?.burner.phase === 'LOCKOUT'
                    ? 'bg-tc-surface border-[3px] border-tc-alarm-crit text-tc-text'
                    : aq01?.burner.phase === 'RUNNING'
                    ? 'bg-tc-equip-on text-tc-bg'
                    : 'bg-tc-surface border border-tc-border text-tc-text'
                }`}
                role="button"
                tabIndex={0}
                aria-label="Aquecedor 01. Abrir detalhe"
              >
                <div className="flex flex-col">
                  <span className={`label ${isOnline && aq01?.burner.phase === 'RUNNING' ? 'text-tc-bg/70' : 'text-tc-text-muted'}`}>
                    AQ01
                  </span>
                  <span className="title-card">Aquecedor 01</span>
                </div>

                {isOnline && aq01?.burner.phase === 'RUNNING' ? (
                  <div className="flex items-center gap-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF8A3D" stroke="#C2410C" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                    <span className="label font-bold text-tc-bg">QUEIMANDO</span>
                  </div>
                ) : isOnline && aq01?.burner.phase === 'LOCKOUT' ? (
                  <div className="flex items-center justify-between">
                    <span className="label font-bold text-tc-alarm-crit">BLOQUEIO</span>
                    <span className="h-6 px-1.5 rounded bg-tc-alarm-crit-fill text-white label flex items-center">ALARME</span>
                  </div>
                ) : (
                  <span className="label font-bold">
                    {isOnline ? BURNER_PHASE_LABEL[aq01?.burner.phase || 'OFF']?.toUpperCase() : 'SEM DADOS'}
                  </span>
                )}
              </div>

              {/* Bomba AQ01 unificada */}
              <PumpIndicator
                running={Boolean(isOnline && aq01?.pump.fb)}
                online={isOnline}
                direction="right"
                style={{ position: 'absolute', left: 290, top: 326 }}
                ariaLabel="Bomba AQ01"
              />
              <div style={{ left: 344, top: 328 }} className="absolute flex flex-col">
                <span className="label text-tc-text-muted">BOMBA AQ01</span>
                <span className="label normal-case text-tc-text">
                  {!isOnline ? 'Sem dados' : aq01?.pump.fb ? 'Ligada · confirmada' : 'Desligada'}
                </span>
              </div>

              {/* Dados do AQ01 (Temperatura, Pressão, Modulação) */}
              <div style={{ left: 444, top: 130, width: 200 }} className="absolute flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">TEMPERATURA</span>
                  <ValueDisplay value={aq01?.temp.value} quality={isOnline ? aq01?.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PRESSÃO</span>
                  <ValueDisplay value={aq01?.press.value} quality={isOnline ? aq01?.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">MODULAÇÃO</span>
                  <ValueDisplay value={aq01?.novus.mv} quality={isOnline && aq01?.novus.commOk ? aq01?.novus.quality : 'COMM_LOST'} decimals={0} unit="%" />
                </div>
              </div>

              {/* === AQ02 === */}
              <div
                onClick={() => navigate('/heater/AQ02')}
                style={{ left: 740, top: 130, width: 220, height: 170 }}
                className={`absolute box-border p-4 rounded-lg cursor-pointer flex flex-col justify-between ${
                  !isOnline
                    ? 'border border-tc-border pattern-no-data text-tc-text-muted'
                    : aq02?.burner.phase === 'LOCKOUT'
                    ? 'bg-tc-surface border-[3px] border-tc-alarm-crit text-tc-text'
                    : aq02?.burner.phase === 'RUNNING'
                    ? 'bg-tc-equip-on text-tc-bg'
                    : 'bg-tc-surface border border-tc-border text-tc-text'
                }`}
                role="button"
                tabIndex={0}
                aria-label="Aquecedor 02. Abrir detalhe"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className={`label ${isOnline && aq02?.burner.phase === 'RUNNING' ? 'text-tc-bg/70' : 'text-tc-text-muted'}`}>
                      AQ02
                    </span>
                    <span className="title-card">Aquecedor 02</span>
                  </div>
                  {isOnline && aq02?.burner.phase === 'LOCKOUT' && (
                    <span className="h-6 px-1.5 rounded bg-tc-alarm-crit-fill text-white label flex items-center">ALARME</span>
                  )}
                </div>

                {isOnline && aq02?.burner.phase === 'RUNNING' ? (
                  <div className="flex items-center gap-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF8A3D" stroke="#C2410C" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                    <span className="label font-bold text-tc-bg">QUEIMANDO</span>
                  </div>
                ) : (
                  <span className="label font-bold">
                    {isOnline ? BURNER_PHASE_LABEL[aq02?.burner.phase || 'OFF']?.toUpperCase() : 'SEM DADOS'}
                  </span>
                )}
              </div>

              {/* Bomba AQ02 unificada */}
              <PumpIndicator
                running={Boolean(isOnline && aq02?.pump.fb)}
                online={isOnline}
                direction="right"
                style={{ position: 'absolute', left: 830, top: 326 }}
                ariaLabel="Bomba AQ02"
              />
              <div style={{ left: 884, top: 328 }} className="absolute flex flex-col">
                <span className="label text-tc-text-muted">BOMBA AQ02</span>
                <span className="label normal-case text-tc-text">
                  {!isOnline ? 'Sem dados' : aq02?.pump.fb ? 'Ligada · confirmada' : 'Desligada'}
                </span>
              </div>

              {/* Dados do AQ02 */}
              <div style={{ left: 984, top: 130, width: 200 }} className="absolute flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">TEMPERATURA</span>
                  <ValueDisplay value={aq02?.temp.value} quality={isOnline ? aq02?.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PRESSÃO</span>
                  <ValueDisplay value={aq02?.press.value} quality={isOnline ? aq02?.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">MODULAÇÃO</span>
                  <ValueDisplay value={aq02?.novus.mv} quality={isOnline && aq02?.novus.commOk ? aq02?.novus.quality : 'COMM_LOST'} decimals={0} unit="%" />
                </div>
              </div>

              {/* === TANQUE TX01 === */}
              <div 
                style={{ left: 1220, top: 190, width: 140, height: 160 }} 
                className="absolute box-border rounded-2xl border-2 border-tc-equip-off bg-[#1B1E22] overflow-hidden"
              >
                <span style={{ left: 12, top: 10 }} className="absolute label text-tc-text-muted">TX01</span>

                {/* Nível de água */}
                {isOnline && tank?.levelNormal && (
                  <>
                    <div style={{ left: 0, top: 70, width: 136, height: 86 }} className="absolute bg-[#2B3F55]"></div>
                    <div style={{ left: 0, top: 70, width: 136, height: 2 }} className="absolute bg-[#5C7FA3]"></div>
                  </>
                )}

                {/* Badge PS no canto superior direito (92 px de left, não encavala sobre TX01) */}
                <span 
                  style={{ left: 92, top: 10 }} 
                  className={`absolute h-5 box-border flex items-center px-1.5 rounded border label ${
                    !isOnline 
                      ? 'border-tc-border text-tc-text-muted pattern-no-data' 
                      : tank?.pressureLow 
                      ? 'border-tc-alarm-crit bg-tc-alarm-crit-fill text-white' 
                      : 'border-tc-border bg-[#1B1E22] text-tc-text'
                  }`}
                >
                  PS
                </span>

                {/* Linha e Badge LS */}
                <div style={{ left: 96, top: 116, width: 38, height: 2 }} className="absolute bg-tc-border"></div>
                <span 
                  style={{ left: 92, top: 124 }} 
                  className={`absolute h-5 box-border flex items-center px-1.5 rounded border label ${
                    !isOnline 
                      ? 'border-tc-border text-tc-text-muted pattern-no-data' 
                      : !tank?.levelNormal 
                      ? 'border-tc-alarm-crit bg-tc-alarm-crit-fill text-white' 
                      : 'border-tc-border bg-[#1B1E22] text-tc-text'
                  }`}
                >
                  LS
                </span>
              </div>

              {/* Reposição: REDE DE ÁGUA centralizado acima do cano, com folga do topo e do GLP */}
              <span style={{ left: 1238, top: 22, width: 100 }} className="absolute label text-tc-text-muted text-center">
                REDE DE ÁGUA
              </span>

              {/* Bomba de Reposição unificada */}
              <PumpIndicator
                running={Boolean(isOnline && tank?.pumpFb)}
                online={isOnline}
                direction="down"
                style={{ position: 'absolute', left: 1270, top: 106 }}
                ariaLabel="Bomba de reposição"
              />

              {/* Dados do Tanque de Expansão */}
              <div style={{ left: 1384, top: 160, width: 220 }} className="absolute flex flex-col gap-3">
                <span 
                  onClick={() => navigate('/tank')} 
                  className="title-card cursor-pointer hover:underline text-tc-text"
                >
                  Tanque de Expansão
                </span>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">CHAVE DE NÍVEL (LS)</span>
                  <span className="title-card">
                    {!isOnline ? 'SEM DADOS' : tank?.levelNormal ? 'Nível normal' : 'Nível BAIXO'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PRESSOSTATO (PS)</span>
                  <span className="title-card">
                    {!isOnline ? 'SEM DADOS' : tank?.pressureLow ? 'Pressão BAIXA' : 'Pressão normal'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">BOMBA DE REPOSIÇÃO</span>
                  <span className="title-card">
                    {!isOnline ? 'SEM DADOS' : tank?.pumpFb ? 'Ligada · Automático' : 'Desligada · Automático'}
                  </span>
                </div>
              </div>

              {/* GLP: posicionado no topo com folga da borda superior */}
              <div 
                style={{ left: 1384, top: 16, width: 220 }} 
                className="absolute flex flex-col gap-1 cursor-pointer hover:underline" 
                onClick={() => navigate('/glp')}
              >
                <span className="label text-tc-text-muted">ESTOQUE DE GLP</span>
                <div className="flex items-baseline gap-1">
                  <span className="value">
                    {glp?.currentLevelKg !== undefined && isOnline ? glp.currentLevelKg.toLocaleString('pt-BR') : 'SEM DADOS'}
                  </span>
                  {isOnline && glp?.currentLevelKg !== undefined && <span className="body text-tc-text-muted">kg</span>}
                </div>
                <span className="label normal-case text-tc-text-muted">
                  {isOnline && glp?.capacityKg ? `${Math.round(((glp.currentLevelKg || 0) / glp.capacityKg) * 100)} % da capacidade (${glp.capacityKg.toLocaleString('pt-BR')} kg)` : 'Sem dados de capacidade'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESUMOS POR AQUECEDOR (modelo-visao-geral.html linhas 206 a 264) */}
      <div className="grid grid-cols-2 gap-6">
        {[aq01, aq02].map((aq, i) => {
          if (!aq) return null;
          return (
            <section key={aq.id} aria-label={`Resumo do Aquecedor 0${i + 1}`} className="box-border p-6 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-4">
              <div className="h-11 flex items-center gap-3">
                <h2 className="title-card m-0 text-tc-text">Aquecedor 0{i + 1}</h2>
                <span className="label text-tc-text-muted">{aq.id}</span>
                {isOnline ? (
                  <span className={`h-6 flex items-center px-2 rounded ${
                    aq.burner.phase === 'LOCKOUT' ? 'bg-tc-alarm-crit-fill text-white' : 
                    aq.burner.phase === 'RUNNING' ? 'bg-tc-equip-on text-tc-bg' : 
                    'bg-tc-equip-off text-tc-text'
                  } label`}>
                    {BURNER_PHASE_LABEL[aq.burner.phase || 'OFF']?.toUpperCase()}
                  </span>
                ) : (
                  <span className="h-6 flex items-center px-2 rounded border border-tc-border pattern-no-data text-tc-text-muted label">
                    SEM DADOS
                  </span>
                )}
                <a onClick={() => navigate(`/heater/${aq.id}`)} className="ml-auto h-11 flex items-center gap-1 font-semibold text-tc-action cursor-pointer hover:underline">
                  Abrir detalhe
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6"></path>
                  </svg>
                </a>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">TEMPERATURA (PT100)</span>
                  <ValueDisplay value={aq.temp.value} quality={isOnline ? aq.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />
                </div>

                {/* NOVUS PV / SP: PV em 28px e SP em 14px text-tc-text-muted conforme modelo-visao-geral.html linha 217 */}
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">NOVUS PV / SP</span>
                  {!isOnline || aq.novus.quality !== 'OK' || !aq.novus.commOk ? (
                    <span className={`h-8 self-start flex items-center px-2.5 rounded label ${!aq.novus.commOk && isOnline ? 'bg-tc-alarm-warn text-tc-bg' : 'border border-tc-border pattern-no-data text-tc-text-muted'}`}>
                      {!aq.novus.commOk && isOnline ? 'FALHA DE COM.' : 'SEM DADOS'}
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="value">
                        {aq.novus.pv !== null && aq.novus.pv !== undefined 
                          ? aq.novus.pv.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
                          : '—'}
                      </span>
                      <span className="body text-tc-text-muted tabular-nums">
                        / {aq.novus.sp !== null && aq.novus.sp !== undefined 
                          ? aq.novus.sp.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
                          : '—'} °C
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">MODULAÇÃO</span>
                  <ValueDisplay value={aq.novus.mv} quality={isOnline && aq.novus.commOk ? aq.novus.quality : 'COMM_LOST'} decimals={0} unit="%" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PRESSÃO</span>
                  <ValueDisplay value={aq.press.value} quality={isOnline ? aq.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PERMISSÃO</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="title-card">{aq.burner.permission ? 'Concedida' : 'Negada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">BOMBA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="title-card">{aq.pump.fb ? 'Ligada · confirmada' : 'Desligada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">BLOQUEIOS 24 H</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="title-card tabular-nums">{aq.burner.lockoutCount24h.toLocaleString('pt-BR')}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">HORAS DE QUEIMA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2.5 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="title-card tabular-nums">
                      {aq.burner.runHours.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-tc-border flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="label text-tc-text-muted">ALARMES</span>
                  {!isOnline ? (
                    <span className="h-6 px-2.5 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">SEM DADOS</span>
                  ) : (
                    <span className="label normal-case text-tc-text-muted">
                      {aq.burner.blockReasons?.length > 0 
                        ? `Bloqueios: ${aq.burner.blockReasons.map(r => t(r)).join(' · ')}` 
                        : 'Nenhum alarme de bloqueio ativo'}
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
