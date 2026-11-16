import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { extrairErro } from '../services/api';
import { mesBR, moeda, pct } from '../services/formatos';

interface Resposta {
  indicadores: {
    taxaPoupanca: { periodo: number | null; porMes: { mes: string; entradas: number; saidas: number; taxaPoupanca: number | null }[] };
    comprometimentoCartoes: { percentual: number | null; totalProximasFaturas: number; rendaMedia: number };
    parcelasFuturas: { total: number; ate: string | null };
  };
  projecao: {
    saldoAtual: number;
    projecao: { mes: string; saldo: number; parcelas: number }[];
    ficaNegativo: boolean;
  };
  dicas: { nivel: 'alerta' | 'ok' | 'info'; texto: string }[];
}

const rotulo = { alerta: 'Atenção', ok: 'Tudo certo', info: 'Informação' };
const cor = { alerta: 'text-bg-danger', ok: 'text-bg-success', info: 'text-bg-info' };

export default function SaudeFinanceira() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .get<Resposta>('/saude-financeira')
      .then((resposta) => { if (ativo) setDados(resposta.data); })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  if (carregando) return <p className="text-muted">Carregando saúde financeira...</p>;
  if (erro) return <div className="alert alert-danger" role="alert">{erro}</div>;
  if (!dados) return null;

  const { indicadores, projecao, dicas } = dados;

  const pontos = [
    { mes: 'Hoje', saldo: projecao.saldoAtual },
    ...projecao.projecao.map((m) => ({ mes: mesBR(m.mes), saldo: m.saldo })),
  ];

  return (
    <section>
      <h1 className="h3 mb-4">Saúde financeira</h1>

      <div className="alert alert-warning" role="note">
        <strong>Aviso:</strong> as informações desta página são educativas e não constituem
        recomendação financeira profissional.
      </div>

      <h2 className="h5 mt-4 mb-3">Indicadores</h2>
      <table className="table table-striped table-hover align-middle">
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Taxa de poupança (últimos 3 meses)</td>
            <td>{pct(indicadores.taxaPoupanca.periodo)}</td>
          </tr>
          <tr>
            <td>Comprometimento da renda com as próximas faturas</td>
            <td>
              {pct(indicadores.comprometimentoCartoes.percentual)} ({moeda(indicadores.comprometimentoCartoes.totalProximasFaturas)} de
              uma renda média de {moeda(indicadores.comprometimentoCartoes.rendaMedia)})
            </td>
          </tr>
          <tr>
            <td>Parcelas futuras</td>
            <td>
              {moeda(indicadores.parcelasFuturas.total)}
              {indicadores.parcelasFuturas.ate && ` até ${mesBR(indicadores.parcelasFuturas.ate)}`}
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="h6 mt-3">Taxa de poupança por mês</h3>
      <ul>
        {indicadores.taxaPoupanca.porMes.map((m) => (
          <li key={m.mes}>
            {mesBR(m.mes)}: {pct(m.taxaPoupanca)} (entradas {moeda(m.entradas)}, saídas {moeda(m.saidas)})
          </li>
        ))}
      </ul>

      <h2 className="h5 mt-4 mb-3">Projeção de saldo</h2>
      {projecao.ficaNegativo && <div className="alert alert-danger" role="alert">Atenção: o saldo projetado fica negativo.</div>}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={pontos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(v: number) => moeda(v)} width={110} />
            <Tooltip formatter={(v) => moeda(Number(v))} />
            <ReferenceLine y={0} stroke="red" />
            <Line type="monotone" dataKey="saldo" name="Saldo projetado" stroke="#1f6feb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="h5 mt-4 mb-3">Dicas</h2>
      <ul className="list-group">
        {dicas.map((d) => (
          <li key={d.texto} className="list-group-item">
            <span className={`badge me-2 ${cor[d.nivel]}`}>{rotulo[d.nivel]}</span>{d.texto}
          </li>
        ))}
      </ul>
    </section>
  );
}