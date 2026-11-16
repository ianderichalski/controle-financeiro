import { useEffect, useState } from 'react';
import api, { extrairErro } from '../services/api';

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

const moeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const dataBR = (iso: string) => iso.split('-').reverse().join('/');

const mesBR = (referencia: string) => referencia.split('-').reverse().join('/');

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

  if (carregando) return <p>Carregando faturas...</p>;
  if (erro) return <p role="alert">{erro}</p>;
  if (cartoes.length === 0) return <p>Nenhum cartão de crédito cadastrado.</p>;

  return (
    <section>
      <h1>Faturas</h1>

      {cartoes.map((cartao) => (
        <article key={cartao.id}>
          <h2>{cartao.nome}</h2>
          <p>
            Limite: {moeda(cartao.limite)} · Utilizado: {moeda(cartao.limiteUtilizado)} ·
            Disponível: {moeda(cartao.limiteDisponivel)}
          </p>

          {cartao.faturas.map((fatura) => (
            <div key={fatura.referencia}>
              <h3>
                Fatura {mesBR(fatura.referencia)} ({fatura.situacao === 'aberta' ? 'aberta' : 'prevista'})
              </h3>
              <p>
                Fecha em {dataBR(fatura.fechamento)} · Vence em {dataBR(fatura.vencimento)} ·
                Total: <strong>{moeda(fatura.total)}</strong>
              </p>

              {fatura.lancamentos.length === 0 ? (
                <p>Nenhum lançamento nesta fatura.</p>
              ) : (
                <table>
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
        </article>
      ))}
    </section>
  );
}