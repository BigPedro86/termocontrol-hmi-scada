import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cpu, Search, Activity, Power, AlignJustify, HardDrive } from 'lucide-react';
import ioMapRaw from '../firmware/include/io_map.h?raw';
import { DataTable } from '../components/ui/DataTable';

interface IOTag {
  tag: string;
  address: string;
  description: string;
  type: 'DI' | 'DO' | 'AI' | 'Virtual';
  confirmed: boolean;
}

function parseIOMap(raw: string): IOTag[] {
  const tags: IOTag[] = [];
  const lines = raw.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('#define ') || trimmed.includes('IO_MAP_H') || trimmed === '#define A_CONFIRMAR -1') continue;

    const match = trimmed.match(/^#define\s+(\w+)\s+(\S+)\s*(\/\/\s*(.*))?$/);
    if (!match) continue;

    const [, name, valueStr, , comment] = match;
    const description = comment?.trim() || name;
    const confirmed = valueStr !== 'A_CONFIRMAR';
    const address = confirmed ? `GPIO ${valueStr}` : 'A_CONFIRMAR';

    let type: IOTag['type'] = 'Virtual';
    if (name.startsWith('PIN_')) {
      if (name.includes('_CMD') || name.includes('_BUZZER')) type = 'DO';
      else if (name.includes('_RS485') || name.includes('_DE')) type = 'DO';
      else type = 'DI';
    } else if (name.startsWith('CH_')) {
      type = 'AI';
    }

    if (name.includes('_TEMP_CS')) type = 'AI';

    tags.push({ tag: name, address, description, type, confirmed });
  }

  return tags;
}

const IOMap: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('table');

  const ioList = useMemo(() => parseIOMap(ioMapRaw), []);

  const filteredTags = ioList.filter(t =>
    t.tag.toLowerCase().includes(filter.toLowerCase()) ||
    t.description.toLowerCase().includes(filter.toLowerCase()) ||
    t.address.toLowerCase().includes(filter.toLowerCase())
  );

  const leftPins = ioList.filter(t => t.type === 'DI' || t.type === 'AI');
  const rightPins = ioList.filter(t => t.type === 'DO');

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'DI': return 'bg-tc-surface-2 text-tc-text-muted';
      case 'DO': return 'bg-tc-surface-2 text-tc-text-muted';
      case 'AI': return 'bg-tc-surface-2 text-tc-text-muted';
      case 'Virtual': return 'bg-tc-bg text-tc-text-dim';
      default: return 'bg-tc-surface text-tc-text';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'AI': return <Activity className="w-3 h-3" />;
      case 'DI':
      case 'DO': return <Power className="w-3 h-3" />;
      default: return <Cpu className="w-3 h-3" />;
    }
  };

  const renderPinTrace = (tag: IOTag, side: 'left' | 'right') => {
    const traceColor = tag.confirmed ? 'bg-tc-equip-on' : 'bg-tc-border';
    const ledColor = tag.confirmed ? 'bg-tc-action' : 'bg-tc-border';
    const valueColor = tag.confirmed ? 'text-tc-text' : 'text-tc-text-muted';

    return (
      <div className={`flex items-center w-full group ${side === 'left' ? 'justify-end' : 'justify-start'}`}>
        {side === 'left' && (
          <>
            <div className="flex flex-col items-end pr-5 py-3 bg-tc-surface/80 border border-tc-border rounded-lg mr-2 transition-all min-w-[240px]">
              <span className="label text-tc-text-muted mb-1.5">{tag.description}</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold font-mono ${valueColor}`}>{tag.tag.replace(/^(PIN_|CH_)/, '')}</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="px-2 py-1 bg-tc-bg text-[10px] font-mono font-bold text-tc-text-muted rounded border border-tc-border z-10 relative">
                {tag.address}
              </div>
              <div className={`h-[3px] w-12 lg:w-24 xl:w-32 transition-all duration-500 relative ${traceColor}`}>
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${ledColor}`} />
              </div>
              <div className="w-3 h-3 bg-[#eab308] rounded-sm z-10" title="PCB Pad" />
            </div>
          </>
        )}
        {side === 'right' && (
          <>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#eab308] rounded-sm z-10" title="PCB Pad" />
              <div className={`h-[3px] w-12 lg:w-24 xl:w-32 transition-all duration-500 relative ${traceColor}`}>
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${ledColor}`} />
              </div>
              <div className="px-2 py-1 bg-tc-bg text-[10px] font-mono font-bold text-tc-text-muted rounded border border-tc-border z-10 relative">
                {tag.address}
              </div>
            </div>
            <div className="flex flex-col items-start pl-5 py-3 bg-tc-surface/80 border border-tc-border rounded-lg ml-2 transition-all min-w-[240px]">
              <span className="label text-tc-text-muted mb-1.5">{tag.description}</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold font-mono ${valueColor}`}>{tag.tag.replace(/^(PIN_|CH_)/, '')}</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="title-page m-0 text-tc-text flex items-center gap-3 uppercase">
            <HardDrive className="w-6 h-6 text-tc-text-muted" />
            Mapa de I/O &amp; Hardware
          </h1>
          <p className="body text-tc-text-muted mt-1">
            Gerado automaticamente a partir de <code className="text-tc-action font-mono text-xs">firmware/include/io_map.h</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-tc-surface-2 rounded-lg p-1 flex items-center border border-tc-border">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'diagram'
                  ? 'bg-tc-surface text-tc-action'
                  : 'bg-transparent text-tc-text-muted hover:text-tc-text'
              }`}
            >
              <Cpu className="w-4 h-4" /> Databook
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-tc-surface text-tc-action'
                  : 'bg-transparent text-tc-text-muted hover:text-tc-text'
              }`}
            >
              <AlignJustify className="w-4 h-4" /> Tabela de Tags
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'diagram' ? (
        <div className="flex-1 min-h-[800px] bg-tc-bg rounded-lg border border-tc-border overflow-hidden relative flex items-center justify-center p-8 w-full">
          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'linear-gradient(#363C44 1px, transparent 1px), linear-gradient(90deg, #363C44 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          <div className="flex items-stretch w-full max-w-7xl gap-0 relative z-10">
            <div className="flex-1 flex flex-col justify-around py-12 gap-6 z-20">
              {leftPins.map((tag, i) => (
                <div key={i} className="flex items-center h-16">
                  {renderPinTrace(tag, 'left')}
                </div>
              ))}
            </div>

            <div className="w-[320px] bg-[#111] rounded-xl border border-tc-border shadow-2xl relative flex flex-col items-center justify-between py-10 shrink-0 z-10 mx-4">
               <div className="mt-16 w-36 h-48 bg-[#ccc] rounded-sm border-b-[3px] border-r-[3px] border-[#999] relative flex items-center justify-center z-10">
                 <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#333]"></div>
                 <div className="flex items-center gap-2.5 -rotate-90 whitespace-nowrap">
                   <Cpu className="w-6 h-6 text-[#333]" />
                   <span className="text-sm text-[#333] font-bold font-mono">ESP-WROOM-32</span>
                 </div>
               </div>
               
               <div className="mt-8 flex gap-8 z-10 mb-6">
                 <div className="flex flex-col items-center gap-1.5">
                   <span className="text-[8px] text-[#4ade80] font-bold uppercase">3V3 POWER</span>
                   <div className="w-2.5 h-2.5 bg-[#f43f5e] rounded-sm"></div>
                 </div>
                 <div className="flex flex-col items-center gap-1.5">
                   <span className="text-[8px] text-[#4ade80] font-bold uppercase">RX/TX COMM</span>
                   <div className="w-2.5 h-2.5 bg-[#6366f1] rounded-sm"></div>
                 </div>
               </div>
               
               <div className="mt-auto mb-2 text-[10px] text-[#4ade80]/50 uppercase font-black tracking-widest border border-[#4ade80]/20 px-3 py-1 rounded bg-black/20 z-10">Módulo Mestre — Caldeiras</div>
            </div>

            <div className="flex-1 flex flex-col justify-around py-12 gap-6 z-20">
              {rightPins.map((tag, i) => (
                <div key={i} className="flex items-center h-16">
                  {renderPinTrace(tag, 'right')}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-tc-surface rounded-lg border border-tc-border overflow-hidden">
          <div className="p-4 border-b border-tc-border flex justify-end bg-tc-surface-2">
            <div className="relative">
              <Search className="w-5 h-5 text-tc-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tag..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-tc-bg border border-tc-border rounded focus:outline-none focus:border-tc-action text-tc-text text-sm"
              />
            </div>
          </div>
          <DataTable
            data={filteredTags}
            keyExtractor={(t) => t.tag}
            columns={[
              {
                header: 'ENDEREÇO',
                accessor: (t) => <span className={`font-mono text-xs font-bold ${t.confirmed ? 'text-tc-action' : 'text-tc-alarm-warn'}`}>{t.address}</span>
              },
              {
                header: 'TAG',
                accessor: (t) => <span className="font-mono text-xs font-bold text-tc-text bg-tc-bg px-2 py-1 rounded border border-tc-border">{t.tag}</span>
              },
              {
                header: 'TIPO',
                accessor: (t) => <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase border border-tc-border ${getBadgeColor(t.type)}`}>{getIcon(t.type)}{t.type}</span>
              },
              {
                header: 'DESCRIÇÃO',
                accessor: (t) => <span className="body text-tc-text">{t.description}</span>
              },
              {
                header: 'STATUS',
                accessor: (t) => (
                  <span className={`label px-2 py-1 rounded ${t.confirmed ? 'bg-tc-equip-on text-tc-bg' : 'bg-tc-alarm-warn text-tc-bg'}`}>
                    {t.confirmed ? 'CONFIRMADO' : 'A CONFIRMAR'}
                  </span>
                )
              }
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default IOMap;
