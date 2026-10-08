import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { List, Filter } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';

const Events: React.FC = () => {
  const { logs } = useApp();
  const [filterEq, setFilterEq] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  
  const equipments = Array.from(new Set(logs.map(l => l.equipment)));
  const types = Array.from(new Set(logs.map(l => l.type)));

  const filteredLogs = logs.filter(l => 
    (filterEq === 'ALL' || l.equipment === filterEq) &&
    (filterType === 'ALL' || l.type === filterType)
  );

  return (
    <div className="flex flex-col gap-6 fade-in h-full">
      <div className="flex items-center gap-4 p-6 bg-tc-surface rounded-lg border border-tc-border shrink-0">
        <div className="w-12 h-12 bg-tc-surface-2 rounded-lg flex items-center justify-center border border-tc-border">
          <List className="w-6 h-6 text-tc-text-muted" />
        </div>
        <div>
          <h1 className="title-page m-0 text-tc-text uppercase">Histórico de Eventos</h1>
          <p className="label text-tc-text-muted mt-1">Auditoria e rastreabilidade</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        <div className="flex-1 p-4 bg-tc-surface rounded-lg border border-tc-border flex items-center gap-4">
          <Filter className="w-5 h-5 text-tc-text-muted" />
          <div className="flex-1 flex gap-4">
            <select 
              className="bg-tc-surface-2 border border-tc-border rounded p-2 text-sm font-bold text-tc-text outline-none focus:border-tc-action flex-1"
              value={filterEq}
              onChange={e => setFilterEq(e.target.value)}
            >
              <option value="ALL">Todos os Equipamentos</option>
              {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
            <select 
              className="bg-tc-surface-2 border border-tc-border rounded p-2 text-sm font-bold text-tc-text outline-none focus:border-tc-action flex-1"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL">Todos os Tipos</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-tc-surface rounded-lg border border-tc-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-0">
          <DataTable
            data={filteredLogs}
            keyExtractor={(l) => l.id}
            emptyMessage="Nenhum evento no período"
            columns={[
              {
                header: 'TIMESTAMP',
                accessor: (l) => <span className="font-mono text-xs font-bold text-tc-text-muted">{l.timestamp}</span>
              },
              {
                header: 'EQUIPAMENTO',
                accessor: (l) => <span className="text-xs font-bold text-tc-text">{l.equipment}</span>
              },
              {
                header: 'TIPO',
                accessor: (l) => (
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                    l.severity === 'Danger' ? 'bg-tc-alarm-crit-fill text-white' :
                    l.severity === 'Warning' ? 'bg-tc-alarm-warn-fill text-white' :
                    'bg-tc-surface-2 text-tc-text'
                  }`}>
                    {l.type}
                  </span>
                )
              },
              {
                header: 'DESCRIÇÃO',
                accessor: (l) => <span className="text-xs font-bold text-tc-text">{l.description}</span>
              },
              {
                header: 'USUÁRIO',
                accessor: (l) => <span className="text-xs font-bold text-tc-text-muted">{l.user}</span>
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default Events;
