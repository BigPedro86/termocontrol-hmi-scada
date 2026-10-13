import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ValueDisplay, PumpIndicator, HeaterSynopticCard } from '../components/ui';
import { BURNER_PHASE_LABEL } from '../types';
import { t } from '../i18n/pt';

const Dashboard: React.FC = () => {
  const { heaters, tank, glp, isOnline, activeAlarms } = useApp();
  const navigate = useNavigate();

  const aq01 = heaters.find(h => h.id === 'AQ01');
  const aq02 = heaters.find(h => h.id === 'AQ02');

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* SINÓTICO (PADRAO_VISUAL.md seção 7 e modelo-visao-geral.html) */}
      <section
        aria-label="Sinótico do processo"
        className="box-border p-5 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-3 overflow-hidden shrink-0"
      >
        {/* Título único de página + Legenda ISA-101 */}
        <div className="h-7 flex items-center justify-between">
          <h1 className="title-page m-0 text-tc-text">Visão Geral</h1>
          <div className="flex items-center gap-5 label text-tc-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-tc-equip-on"></span>
              Ligado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-tc-equip-off"></span>
              Parado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-tc-alarm-warn"></span>
              Aviso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] border-2 border-tc-alarm-crit"></span>
              Alarme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] border border-tc-border box-border pattern-no-data"></span>
              Sem dados
            </span>
          </div>
        </div>

        {/* Área do sinóptico (1604 x 440) */}
        <div className="w-full overflow-x-auto pb-1">
          <div
            className="relative select-none shrink-0 mx-auto"
            style={{
              width: 1604,
              height: 440,
            }}
          >
            {/* O SVG desenha só tubulação contínua em ângulo reto (PADRAO_VISUAL.md seção 6 e 7) */}
            <svg viewBox="0 0 1604 440" width="1604" height="440" className="absolute inset-0 pointer-events-none">
              {/* Tubulação vertical conectada ao CONSUMO: conecta no topo (y=170) e retoma na base (y=290) */}
              <line x1="44" y1="60" x2="44" y2="170" stroke="#8A99A8" strokeWidth="4" />
              <line x1="44" y1="290" x2="44" y2="380" stroke="#8A99A8" strokeWidth="4" />

              {/* Linha IDA (Água Quente) contínua cinza */}
              <line x1="44" y1="60" x2="860" y2="60" stroke="#8A99A8" strokeWidth="4" />
              {/* Setas de fluxo da IDA (apontando para a esquerda / consumo) */}
              <path d="M 159 54 L 150 60 L 159 66 Z" fill="#E7EAEE" />
              <path d="M 569 54 L 560 60 L 569 66 Z" fill="#E7EAEE" />

              {/* Linha RETORNO contínua cinza */}
              <line x1="44" y1="380" x2="1288" y2="380" stroke="#8A99A8" strokeWidth="4" />
              {/* Setas de fluxo do RETORNO (apontando para a direita) */}
              <path d="M 150 374 L 159 380 L 150 386 Z" fill="#E7EAEE" />
              <path d="M 560 374 L 569 380 L 560 386 Z" fill="#E7EAEE" />

              {/* Conexões verticais AQ01 (perfeitamente em ângulo reto) */}
              <line x1="360" y1="60" x2="360" y2="120" stroke="#8A99A8" strokeWidth="4" />
              <line x1="360" y1="280" x2="360" y2="380" stroke="#8A99A8" strokeWidth="4" />

              {/* Conexões verticais AQ02 (mesma geometria de AQ01, perfeitamente em ângulo reto) */}
              <line x1="860" y1="60" x2="860" y2="120" stroke="#8A99A8" strokeWidth="4" />
              <line x1="860" y1="280" x2="860" y2="380" stroke="#8A99A8" strokeWidth="4" />

              {/* Conexões verticais Tanque TX01 e Reposição */}
              <line x1="1288" y1="340" x2="1288" y2="380" stroke="#8A99A8" strokeWidth="4" />
              <line x1="1288" y1="40" x2="1288" y2="100" stroke="#8A99A8" strokeWidth="4" />
              <line x1="1288" y1="138" x2="1288" y2="180" stroke="#8A99A8" strokeWidth="4" />
            </svg>

            {/* RÓTULOS, VALORES E EQUIPAMENTOS EM HTML SOBRE O DESENHO */}
            <div className="absolute inset-0">
              {/* Consumo */}
              <div
                style={{ left: 0, top: 170, width: 88, height: 120 }}
                className="absolute box-border border-2 border-tc-equip-off rounded-lg flex items-center justify-center label text-tc-text-muted"
              >
                CONSUMO
              </div>

              {/* Rótulos das Linhas */}
              <span style={{ left: 110, top: 34 }} className="absolute label text-tc-text-muted">
                IDA · ÁGUA QUENTE
              </span>
              <span style={{ left: 110, top: 392 }} className="absolute label text-tc-text-muted">
                RETORNO
              </span>

              {/* === AQ01: Card unificado com valores internos === */}
              <HeaterSynopticCard
                id="AQ01"
                title="Aquecedor 01"
                heater={aq01}
                isOnline={isOnline}
                onClick={() => navigate('/heater/AQ01')}
                style={{ position: 'absolute', left: 170, top: 120, width: 380, height: 160 }}
              />

              {/* Bomba AQ01 unificada */}
              <PumpIndicator
                running={Boolean(isOnline && aq01?.pump.fb)}
                online={isOnline}
                direction="right"
                style={{ position: 'absolute', left: 342, top: 312 }}
                ariaLabel="Bomba AQ01"
              />
              <div style={{ left: 390, top: 314 }} className="absolute flex flex-col">
                <span className="label text-tc-text-muted">BOMBA AQ01</span>
                <span className="label normal-case text-tc-text">
                  {!isOnline ? 'Sem dados' : aq01?.pump.fb ? 'Ligada · confirmada' : 'Desligada'}
                </span>
              </div>

              {/* === AQ02: Mesmo componente de AQ01 com valores internos === */}
              <HeaterSynopticCard
                id="AQ02"
                title="Aquecedor 02"
                heater={aq02}
                isOnline={isOnline}
                onClick={() => navigate('/heater/AQ02')}
                style={{ position: 'absolute', left: 670, top: 120, width: 380, height: 160 }}
              />

              {/* Bomba AQ02 unificada */}
              <PumpIndicator
                running={Boolean(isOnline && aq02?.pump.fb)}
                online={isOnline}
                direction="right"
                style={{ position: 'absolute', left: 842, top: 312 }}
                ariaLabel="Bomba AQ02"
              />
              <div style={{ left: 890, top: 314 }} className="absolute flex flex-col">
                <span className="label text-tc-text-muted">BOMBA AQ02</span>
                <span className="label normal-case text-tc-text">
                  {!isOnline ? 'Sem dados' : aq02?.pump.fb ? 'Ligada · confirmada' : 'Desligada'}
                </span>
              </div>

              {/* === TANQUE TX01 === */}
              <div
                style={{ left: 1218, top: 180, width: 140, height: 160 }}
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

                {/* Badge PS no canto superior direito */}
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
              <span style={{ left: 1238, top: 18, width: 100 }} className="absolute label text-tc-text-muted text-center">
                REDE DE ÁGUA
              </span>

              {/* Bomba de Reposição unificada */}
              <PumpIndicator
                running={Boolean(isOnline && tank?.pumpFb)}
                online={isOnline}
                direction="down"
                style={{ position: 'absolute', left: 1270, top: 102 }}
                ariaLabel="Bomba de reposição"
              />

              {/* Dados do Tanque de Expansão */}
              <div style={{ left: 1380, top: 160, width: 220 }} className="absolute flex flex-col gap-3">
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
                style={{ left: 1380, top: 16, width: 220 }}
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
                <span className="body text-tc-text-muted">
                  {isOnline && glp?.capacityKg
                    ? `${Math.round(((glp.currentLevelKg || 0) / glp.capacityKg) * 100)} % da capacidade (${glp.capacityKg.toLocaleString('pt-BR')} kg)`
                    : 'Sem dados de capacidade'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESUMOS POR AQUECEDOR (modelo-visao-geral.html linhas 206 a 264) */}
      <div className="grid grid-cols-2 gap-4">
        {[aq01, aq02].map((aq, i) => {
          if (!aq) return null;
          const aqAlarms = activeAlarms?.filter(a => a.equipment === aq.id && !a.cleared) || [];
          return (
            <section
              key={aq.id}
              aria-label={`Resumo do Aquecedor 0${i + 1}`}
              className="box-border p-4 bg-tc-surface border border-tc-border rounded-lg flex flex-col gap-3"
            >
              <div className="h-8 flex items-center gap-3">
                <h2 className="title-card m-0 text-tc-text">Aquecedor 0{i + 1}</h2>
                <span className="label text-tc-text-muted">{aq.id}</span>
                {isOnline ? (
                  <span
                    className={`h-6 flex items-center px-2 rounded ${
                      aq.burner.phase === 'LOCKOUT'
                        ? 'bg-tc-alarm-crit-fill text-white'
                        : aq.burner.phase === 'RUNNING'
                        ? 'bg-tc-equip-on text-tc-bg'
                        : 'bg-tc-equip-off text-tc-text'
                    } label font-bold`}
                  >
                    {BURNER_PHASE_LABEL[aq.burner.phase || 'OFF']?.toUpperCase()}
                  </span>
                ) : (
                  <span className="h-6 flex items-center px-2 rounded border border-tc-border pattern-no-data text-tc-text-muted label font-bold">
                    SEM DADOS
                  </span>
                )}
                <a
                  onClick={() => navigate(`/heater/${aq.id}`)}
                  className="ml-auto flex items-center gap-1 font-semibold text-tc-action cursor-pointer hover:underline body"
                >
                  Abrir detalhe
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6"></path>
                  </svg>
                </a>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <ValueDisplay label="TEMPERATURA (PT100)" value={aq.temp.value} quality={isOnline ? aq.temp.quality : 'COMM_LOST'} decimals={1} unit="°C" />

                {/* NOVUS PV / SP: PV em 28px e SP em 14px body text-tc-text-muted */}
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">NOVUS PV / SP</span>
                  {!isOnline || aq.novus.quality !== 'OK' || !aq.novus.commOk ? (
                    <span
                      className={`h-8 self-start flex items-center px-2.5 rounded label ${
                        !aq.novus.commOk && isOnline
                          ? 'bg-tc-alarm-warn text-tc-bg'
                          : 'border border-tc-border pattern-no-data text-tc-text-muted'
                      }`}
                    >
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

                <ValueDisplay label="MODULAÇÃO" value={aq.novus.mv} quality={isOnline && aq.novus.commOk ? aq.novus.quality : 'COMM_LOST'} decimals={0} unit="%" />
                <ValueDisplay label="PRESSÃO" value={aq.press.value} quality={isOnline ? aq.press.quality : 'COMM_LOST'} decimals={2} unit="bar" />
              </div>

              <div className="grid grid-cols-4 gap-4 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">PERMISSÃO</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">
                      SEM DADOS
                    </span>
                  ) : (
                    <span className="title-card">{aq.burner.permission ? 'Concedida' : 'Negada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">BOMBA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">
                      SEM DADOS
                    </span>
                  ) : (
                    <span className="title-card">{aq.pump.fb ? 'Ligada · confirmada' : 'Desligada'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">BLOQUEIOS 24 H</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">
                      SEM DADOS
                    </span>
                  ) : (
                    <span className="title-card tabular-nums">{aq.burner.lockoutCount24h.toLocaleString('pt-BR')}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label text-tc-text-muted">HORAS DE QUEIMA</span>
                  {!isOnline ? (
                    <span className="h-6 self-start px-2 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">
                      SEM DADOS
                    </span>
                  ) : (
                    <span className="title-card tabular-nums">
                      {aq.burner.runHours.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1 pt-3 border-t border-tc-border flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="label text-tc-text-muted">ALARMES</span>
                  {!isOnline ? (
                    <span className="h-6 px-2 rounded border border-tc-border text-tc-text-muted label flex items-center pattern-no-data">
                      SEM DADOS
                    </span>
                  ) : aqAlarms.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {aqAlarms.map(a => (
                        <span
                          key={a.id}
                          className={`h-5 flex items-center px-1.5 rounded label ${
                            a.severity === 'Danger'
                              ? 'bg-tc-alarm-crit-fill text-white'
                              : 'bg-tc-alarm-warn text-tc-bg'
                          }`}
                        >
                          {a.severity === 'Danger' ? 'CRÍTICO' : 'AVISO'} {a.description}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="body text-tc-text-muted">
                      {aq.burner.blockReasons?.length > 0
                        ? `Bloqueios: ${aq.burner.blockReasons.map(r => t(r)).join(' · ')}`
                        : 'Nenhum alarme ativo'}
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
