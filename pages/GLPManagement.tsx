import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cylinder,
  TrendingDown,
  Truck,
  Info,
  PlusCircle,
  Calculator,
  Calendar,
  Download,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { Card } from '../components/ui/Card';
import { ValueDisplay } from '../components/ui/ValueDisplay';

const GLPManagement: React.FC = () => {
  const { glp, sendCommand, isOnline } = useApp();
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const levelPercent = (glp.currentLevelKg / glp.capacityKg) * 100;
  const targetKg = glp.capacityKg * 0.75;
  const refillNeeded = Math.max(0, targetKg - glp.currentLevelKg);

  const handleAction = async (type: 'reading' | 'refill') => {
    const val = parseFloat(inputValue);

    if (isNaN(val) || val < 0) return;

    if (type === 'reading' && val > 100) {
      alert("A leitura em porcentagem não pode ser maior que 100%.");
      return;
    }

    setIsSubmitting(true);
    const success = await sendCommand('GLP', type === 'reading' ? 'addReading' : 'addRefill', val);

    if (success) {
      setSuccessMsg(type === 'reading' ? 'Leitura registrada com sucesso!' : 'Abastecimento registrado com sucesso!');
      setTimeout(() => {
        setShowReadingModal(false);
        setShowRefillModal(false);
        setSuccessMsg('');
        setInputValue('');
      }, 1500);
    }
    setIsSubmitting(false);
  };

  const historyData = useMemo(() => {
    const map = new Map<string, {name: string, nivel: number, consumo: number, abastecimento: number}>();
    
    glp.readings.forEach(r => {
      const dateStr = r.date.split(' ')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, { name: dateStr, nivel: r.level, consumo: glp.dailyConsumption, abastecimento: 0 });
      } else {
        map.get(dateStr)!.nivel = r.level;
      }
    });

    glp.refills.forEach(r => {
      const dateStr = r.date.split(' ')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, { name: dateStr, nivel: 0, consumo: glp.dailyConsumption, abastecimento: r.quantity });
      } else {
        map.get(dateStr)!.abastecimento += r.quantity;
      }
    });

    const arr = Array.from(map.values()).sort((a, b) => {
       const pa = a.name.split('/'); const pb = b.name.split('/');
       if (pa.length === 3 && pb.length === 3) {
           return new Date(`${pa[2]}-${pa[1]}-${pa[0]}`).getTime() - new Date(`${pb[2]}-${pb[1]}-${pb[0]}`).getTime();
       }
       return a.name.localeCompare(b.name);
    });

    return arr.slice(-7);
  }, [glp]);

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="title-page m-0 text-tc-text uppercase">Gestão de GLP</h1>
          <p className="body text-tc-text-muted mt-1">Controle de estoque, consumo e logística de abastecimento.</p>
        </div>
        <button className="h-10 px-4 bg-tc-surface border border-tc-border text-tc-text rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-tc-surface-2 transition-all">
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <Cylinder className="w-5 h-5 text-tc-text-muted" />
          </div>
          <ValueDisplay label="NÍVEL ATUAL" value={levelPercent} decimals={2} unit="%" quality={isOnline ? 'OK' : 'COMM_LOST'} />
          <div className="text-sm font-bold text-tc-text-muted mt-2">{glp.currentLevelKg.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</div>
          <div className="mt-4 h-2 w-full bg-tc-surface-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${levelPercent < 25 ? 'bg-tc-alarm-crit' : 'bg-tc-action'}`}
              style={{ width: `${levelPercent}%` }}
            ></div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <TrendingDown className="w-5 h-5 text-tc-text-muted" />
          </div>
          <ValueDisplay label="CONSUMO (ÚLTIMO DIA)" value={glp.dailyConsumption} decimals={2} unit="kg" quality={isOnline ? 'OK' : 'COMM_LOST'} />
          <div className="text-sm font-bold text-tc-text-muted mt-2">Média baseada em leituras</div>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <Truck className="w-5 h-5 text-tc-text-muted" />
          </div>
          <ValueDisplay label="ABASTECER PARA 75%" value={refillNeeded} decimals={2} unit="kg" quality={isOnline ? 'OK' : 'COMM_LOST'} />
          <div className="text-sm font-bold text-tc-text-muted mt-2">Alvo: {targetKg.toLocaleString('pt-BR')} kg</div>
        </Card>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <Info className="w-5 h-5 text-tc-text-muted" />
          </div>
          <ValueDisplay label="CAPACIDADE TOTAL" value={glp.capacityKg} decimals={0} unit="kg" quality={isOnline ? 'OK' : 'COMM_LOST'} />
          <div className="text-sm font-bold text-tc-text-muted mt-2">Tanques Estacionários</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="HISTÓRICO DE NÍVEL (KG)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorLevelGLP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363C44" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} domain={[0, 8000]} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Nível']} contentStyle={{ backgroundColor: '#1F2328', border: '1px solid #363C44', color: '#E7EAEE' }} />
                <ReferenceLine y={2000} stroke="#F0616A" strokeDasharray="3 3" label={{ position: 'right', value: 'Crítico', fill: '#F0616A', fontSize: 10, fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="nivel" stroke="#3B82F6" strokeWidth={2} fill="url(#colorLevelGLP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="CONSUMO E ABASTECIMENTO DIÁRIO">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363C44" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9AA3AD' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} contentStyle={{ backgroundColor: '#1F2328', border: '1px solid #363C44', color: '#E7EAEE' }} />
                <Bar dataKey="consumo" fill="#F0616A" radius={[2, 2, 0, 0]} name="Consumo" />
                <Bar dataKey="abastecimento" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Abastecimento" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Card title="ATIVIDADE RECENTE" icon={<Calendar className="w-5 h-5 text-tc-text-muted" />}>
            <div className="space-y-8">
              <div>
                <h4 className="label text-tc-text-muted mb-4">ÚLTIMAS LEITURAS</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-tc-border">
                      <tr>
                        <th className="label text-tc-text-muted pb-2">DATA / HORA</th>
                        <th className="label text-tc-text-muted pb-2 text-right">NÍVEL REGISTRADO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tc-border">
                      {glp.readings.map((r, i) => (
                        <tr key={i} className="hover:bg-tc-surface-2 transition-colors">
                          <td className="py-2 body">{r.date}</td>
                          <td className="py-2 value-sm text-right">{r.level.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="label text-tc-text-muted mb-4">ÚLTIMOS REABASTECIMENTOS</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-tc-border">
                      <tr>
                        <th className="label text-tc-text-muted pb-2">DATA / HORA</th>
                        <th className="label text-tc-text-muted pb-2 text-right">QUANTIDADE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tc-border">
                      {glp.refills.map((r, i) => (
                        <tr key={i} className="hover:bg-tc-surface-2 transition-colors">
                          <td className="py-2 body">{r.date}</td>
                          <td className="py-2 value-sm text-tc-action text-right">+{r.quantity.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="AÇÕES RÁPIDAS" compact>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowReadingModal(true)}
                className="h-12 w-full bg-tc-action-fill text-white font-bold text-sm tracking-wider rounded border-0 cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                LANÇAR LEITURA (%)
              </button>
              <button
                onClick={() => setShowRefillModal(true)}
                className="h-12 w-full bg-tc-surface-2 border border-tc-border text-tc-text font-bold text-sm tracking-wider rounded cursor-pointer hover:bg-tc-border flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                LANÇAR REABASTECIMENTO (KG)
              </button>
            </div>
          </Card>

          <Card title="CALCULADORA DE PREVISÃO" icon={<Calculator className="w-5 h-5 text-tc-action" />}>
            <p className="body text-tc-text-muted mb-4">
              Estimativa de autonomia baseada no consumo médio diário configurado.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label text-tc-text-muted block mb-1">CONSUMO PREVISTO (KG/DIA)</label>
                <input
                  type="number"
                  defaultValue={glp.dailyConsumption.toFixed(2)}
                  className="w-full bg-tc-surface-2 border border-tc-border rounded p-3 text-sm font-bold text-tc-text outline-none focus:border-tc-action"
                />
              </div>
              <div className="bg-tc-surface-2 p-4 rounded border border-tc-border text-center">
                <div className="label text-tc-text-muted tracking-widest mb-1">AUTONOMIA RESTANTE</div>
                <div className="value text-tc-action">
                  {(glp.currentLevelKg / glp.dailyConsumption).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} Dias
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {(showReadingModal || showRefillModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tc-bg/80 backdrop-blur-sm transition-all">
          <Card className="w-full max-w-md shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="title-card m-0 uppercase tracking-tight">
                {showReadingModal ? 'INFORMAR LEITURA (%)' : 'LANÇAR REABASTECIMENTO (KG)'}
              </h2>
              <button
                onClick={() => { setShowReadingModal(false); setShowRefillModal(false); setInputValue(''); }}
                className="p-1 hover:bg-tc-surface-2 rounded-full border-0 bg-transparent cursor-pointer text-tc-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-tc-equip-on" />
                  <p className="title-card text-tc-equip-on text-center">{successMsg}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="label text-tc-text-muted block">
                      {showReadingModal ? 'PORCENTAGEM DO VISOR (%)' : 'QUANTIDADE NA NOTA (KG)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        autoFocus
                        max={showReadingModal ? 100 : undefined}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={showReadingModal ? "Ex: 50.00" : "Ex: 2500.00"}
                        className="w-full bg-tc-surface-2 border border-tc-border rounded py-4 px-4 text-xl font-bold text-tc-text focus:border-tc-action outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-tc-text-muted">
                        {showReadingModal ? '%' : 'KG'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-tc-surface-2 p-4 rounded border border-tc-border flex gap-3">
                    <Info className="w-5 h-5 text-tc-action shrink-0" />
                    <div>
                      <span className="label text-tc-action block mb-1">CÁLCULO DE ESTOQUE</span>
                      <p className="body text-tc-text m-0">
                        {showReadingModal
                          ? `A leitura de ${inputValue || '0'}% será convertida para ${((parseFloat(inputValue) || 0) / 100 * glp.capacityKg).toFixed(2)} kg.`
                          : `O volume de ${inputValue || '0'} kg será adicionado ao estoque atual de ${glp.currentLevelKg.toFixed(2)} kg.`}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting || !inputValue}
                    onClick={() => handleAction(showReadingModal ? 'reading' : 'refill')}
                    className="w-full bg-tc-action-fill text-white font-bold py-4 rounded border-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3 hover:opacity-90"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    SALVAR NO SISTEMA
                  </button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GLPManagement;
