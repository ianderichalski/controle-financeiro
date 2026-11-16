import { useEffect, useState } from 'react';
import api, { extrairErro } from '../services/api';
import { dataBR, mesBR, moeda } from '../services/formatos';

interface LancamentoFatura {
  id: number;
  descricao: string;
  dataCompra: string;
  valor: number;
}

interface Fatura {
  referencia: string;
  fechamento: string;
  vencimento: string;
  situacao: 'aberta' | 'futura';
  total: number;
  lancamentos: LancamentoFatura[];
}

interface Cartao {
  id: number;
  nome: string;
  limite: number;
  limiteUtilizado: number;
  limiteDisponivel: number;
  faturas: Fatura[];
}

export default function Faturas() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .get<{ cartoes: Cartao[] }>('/relatorios/faturas', { params: { meses: 3 } })
      .then((resposta) => { if (ativo) setCartoes(resposta.data.cartoes); })
      .catch((e) => { if (ativo) setErro(extrairErro(e).erro); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  if (carregando) return <p className="text-muted">Carregando faturas...</p>;
  if (erro) return <div className="alert alert-danger" role="alert">{erro}</div>;
  if (cartoes.length === 0) return <p className="text-muted">Nenhum cartão de crédito cadastrado.</p>;

  return (
    <section>
      <h1 className="h3 mb-4">Faturas</h1>

      {cartoes.map((cartao) => (
        <article key={cartao.id} className="card mb-4"><div className="card-body">
          <h2 className="h5 card-title">{cartao.nome}</h2>
          <p>
            Limite: {moeda(cartao.limite)} · Utilizado: {moeda(cartao.limiteUtilizado)} ·
            Disponível: {moeda(cartao.limiteDisponivel)}
          </p>

          {cartao.faturas.map((fatura) => (
            <div key={fatura.referencia} className="border rounded p-3 mb-3">
              <h3 className="h6">
                Fatura {mesBR(fatura.referencia)} <span className={`badge ms-2 ${fatura.situacao === 'aberta' ? 'text-bg-primary' : 'text-bg-secondary'}`}>{fatura.situacao === 'aberta' ? 'aberta' : 'prevista'}</span>
              </h3>
              <p>
                Fecha em {dataBR(fatura.fechamento)} · Vence em {dataBR(fatura.vencimento)} ·
                Total: <strong>{moeda(fatura.total)}</strong>
              </p>

              {fatura.lancamentos.length === 0 ? (
                <p className="text-muted">Nenhum lançamento nesta fatura.</p>
              ) : (
                <table className="table table-striped table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data da compra</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fatura.lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td>{l.descricao}</td>
                        <td>{dataBR(l.dataCompra)}</td>
                        <td>{moeda(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div></article>
      ))}
    </section>
  );
}