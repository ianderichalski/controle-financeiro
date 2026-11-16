import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { extrairErro } from '../services/api';
import type { Listagem } from '../services/api';
import { dataBR, mesAtual, moeda } from '../services/formatos';

export default function Dashboard() {
  const [dados, setDados] = useState<Listagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .get<Listagem>('/lancamentos', { params: { ...mesAtual(), porPagina: 5 } })
      .then((resposta) => { if (ativo) setDados(resposta.data); })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  if (carregando) return <p className="text-muted">Carregando resumo...</p>;
  if (erro) return <div className="alert alert-danger" role="alert">{erro}</div>;
  if (!dados) return null;

  return (
    <section>
      <h1 className="h3 mb-4">Resumo do mês</h1>
      <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Entradas</div>
                <div className="fs-4 fw-semibold text-success">{moeda(dados.totais.entradas)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Saídas</div>
                <div className="fs-4 fw-semibold text-danger">{moeda(dados.totais.saidas)}</div>
              </div></div>
            </div>
            <div className="col-md-4">
              <div className="card text-bg-light"><div className="card-body">
                <div className="text-muted small">Saldo do mês</div>
                <div className="fs-4 fw-semibold">{moeda(dados.totais.saldo)}</div>
              </div></div>
            </div>
          </div>

      <h2 className="h5 mt-4 mb-3">Últimos lançamentos</h2>
      {dados.itens.length === 0 ? (
        <p className="text-muted">Nenhum lançamento neste mês.</p>
      ) : (
        <ul>
          {dados.itens.map((l) => (
            <li key={l.id}>
              {dataBR(l.data)} — {l.descricao} — {l.tipo === 'saida' ? '− ' : '+ '}{moeda(l.valor)}
            </li>
          ))}
        </ul>
      )}
      <p><Link to="/lancamentos">Ver todos os lançamentos</Link></p>
    </section>
  );
}