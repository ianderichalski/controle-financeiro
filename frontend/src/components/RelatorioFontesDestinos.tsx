import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { extrairErro } from '../services/api';
import { dataBR, mesAtual, moeda } from '../services/formatos';

interface Item {
  id: number;
  nome: string;
  tipo: 'renda' | 'conta' | 'cartao_credito';
  total: number;
}

interface Conta {
  id: number;
  nome: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface Relatorio {
  periodo: { inicio: string; fim: string };
  totalEntradas: number;
  totalSaidas: number;
  entradas: Item[];
  saidas: Item[];
  contas: Conta[];
}

const nomeTipo = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };

export default function RelatorioFontesDestinos() {
  const [filtro, setFiltro] = useState(mesAtual);          // período consultado
  const [inicio, setInicio] = useState(filtro.inicio);     // campos do formulário
  const [fim, setFim] = useState(filtro.fim);
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .get<Relatorio>('/relatorios/fontes-destinos', { params: filtro })
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

  const nomes = [...new Set([...(dados?.entradas ?? []), ...(dados?.saidas ?? [])].map((i) => i.nome))];
  const grafico = nomes.map((nome) => ({
    nome,
    entradas: dados?.entradas.find((i) => i.nome === nome)?.total ?? 0,
    saidas: dados?.saidas.find((i) => i.nome === nome)?.total ?? 0,
  }));

  return (
    <section>
      <h1 className="h3 mb-4">Relatório por fonte/destino</h1>

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
            Entradas: {moeda(dados.totalEntradas)} · Saídas: {moeda(dados.totalSaidas)}
          </p>

          {grafico.length === 0 ? (
            <p className="text-muted">Nenhum lançamento no período.</p>
          ) : (
            <>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis tickFormatter={(v: number) => moeda(v)} width={110} />
                    <Tooltip formatter={(v) => moeda(Number(v))} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#2da44e" />
                    <Bar dataKey="saidas" name="Saídas" fill="#cf222e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h2 className="h5 mt-4 mb-3">Entradas por fonte</h2>
              {dados.entradas.length === 0 ? <p className="text-muted">Nenhuma entrada no período.</p> : (
                <table className="table table-striped table-hover align-middle">
                  <thead><tr><th>Fonte</th><th>Tipo</th><th>Total</th></tr></thead>
                  <tbody>
                    {dados.entradas.map((i) => (
                      <tr key={i.id}><td>{i.nome}</td><td>{nomeTipo[i.tipo]}</td><td>{moeda(i.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h2 className="h5 mt-4 mb-3">Saídas por destino</h2>
              {dados.saidas.length === 0 ? <p className="text-muted">Nenhuma saída no período.</p> : (
                <table className="table table-striped table-hover align-middle">
                  <thead><tr><th>Destino</th><th>Tipo</th><th>Total</th></tr></thead>
                  <tbody>
                    {dados.saidas.map((i) => (
                      <tr key={i.id}><td>{i.nome}</td><td>{nomeTipo[i.tipo]}</td><td>{moeda(i.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          <h2 className="h5 mt-4 mb-3">Saldo das contas no período</h2>
          {dados.contas.length === 0 ? <p className="text-muted">Nenhuma conta cadastrada.</p> : (
            <table className="table table-striped table-hover align-middle">
              <thead><tr><th>Conta</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
              <tbody>
                {dados.contas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td><td>{moeda(c.entradas)}</td><td>{moeda(c.saidas)}</td><td>{moeda(c.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}