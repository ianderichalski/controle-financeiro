import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { extrairErro } from '../services/api';
import { dataBR, mesAtual, moeda, pct } from '../services/formatos';

interface CategoriaSaida {
  id: number;
  nome: string;
  total: number;
  percentual: number;
  periodoAnterior: number;
  variacaoPercentual: number | null;
  diferenca: number;
}

interface Relatorio {
  periodo: { inicio: string; fim: string };
  periodoAnterior: { inicio: string; fim: string };
  totalSaidas: number;
  totalEntradas: number;
  categorias: CategoriaSaida[];
  entradas: { id: number; nome: string; total: number; periodoAnterior: number }[];
}

function comparacao(c: CategoriaSaida) {
  if (c.diferenca > 0) return `Aumento de ${moeda(c.diferenca)}${c.variacaoPercentual === null ? '' : ` (${pct(c.variacaoPercentual)})`}`;
  if (c.diferenca < 0) return `Redução de ${moeda(-c.diferenca)}${c.variacaoPercentual === null ? '' : ` (${pct(c.variacaoPercentual)})`}`;
  return 'Sem variação';
}

export default function RelatorioCategorias() {
  const [filtro, setFiltro] = useState(mesAtual);
  const [inicio, setInicio] = useState(filtro.inicio);
  const [fim, setFim] = useState(filtro.fim);
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .get<Relatorio>('/relatorios/categorias', { params: filtro })
      .then((resposta) => { if (ativo) { setDados(resposta.data); setErro(''); setErros({}); } })
      .catch((e) => {
        if (!ativo) return;
        const resposta = extrairErro(e);
        setErro(resposta.erro);
        setErros(resposta.campos ?? {});
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [filtro]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inicio && fim && inicio > fim) {
      setErros({ fim: 'O fim deve ser igual ou posterior ao início.' });
      return;
    }
    setCarregando(true);
    setFiltro({ inicio, fim });
  }

  const comGasto = dados?.categorias.filter((c) => c.total > 0) ?? [];

  return (
    <section>
      <h1 className="h3 mb-4">Relatório por categoria</h1>

      <form onSubmit={handleSubmit} noValidate className="row g-2 align-items-end mb-4">
        <div className="col-auto">
          <label htmlFor="inicio" className="form-label">Início</label>
          <input id="inicio" className={`form-control${erros.inicio ? ' is-invalid' : ''}`} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          {erros.inicio && <div className="invalid-feedback">{erros.inicio}</div>}
        </div>
        <div className="col-auto">
          <label htmlFor="fim" className="form-label">Fim</label>
          <input id="fim" className={`form-control${erros.fim ? ' is-invalid' : ''}`} type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          {erros.fim && <div className="invalid-feedback">{erros.fim}</div>}
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary" disabled={carregando}>Consultar</button>
        </div>
      </form>

      {carregando && <p className="text-muted">Carregando relatório...</p>}
      {!carregando && erro && <div className="alert alert-danger" role="alert">{erro}</div>}

      {!carregando && !erro && dados && (
        <>
          <p>
            Período: {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)} ·
            comparado com {dataBR(dados.periodoAnterior.inicio)} a {dataBR(dados.periodoAnterior.fim)}
          </p>
          <p>
            Saídas: <strong>{moeda(dados.totalSaidas)}</strong> · Entradas: <strong>{moeda(dados.totalEntradas)}</strong>
          </p>

          <h2 className="h5 mt-4 mb-3">Saídas por categoria</h2>
          {comGasto.length === 0 ? (
            <p className="text-muted">Nenhuma saída no período.</p>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={comGasto}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis tickFormatter={(v: number) => moeda(v)} width={110} />
                  <Tooltip formatter={(v) => moeda(Number(v))} />
                  <Bar dataKey="total" name="Total" fill="#cf222e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {dados.categorias.length > 0 && (
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr><th>Categoria</th><th>Total</th><th>% das saídas</th><th>Período anterior</th><th>Comparação</th></tr>
              </thead>
              <tbody>
                {dados.categorias.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{moeda(c.total)}</td>
                    <td>{pct(c.percentual)}</td>
                    <td>{moeda(c.periodoAnterior)}</td>
                    <td>{comparacao(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="h5 mt-4 mb-3">Entradas por categoria</h2>
          {dados.entradas.length === 0 ? (
            <p className="text-muted">Nenhuma entrada no período.</p>
          ) : (
            <table className="table table-striped table-hover align-middle">
              <thead><tr><th>Categoria</th><th>Total</th></tr></thead>
              <tbody>
                {dados.entradas.map((c) => (
                  <tr key={c.id}><td>{c.nome}</td><td>{moeda(c.total)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}