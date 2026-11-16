import { pool } from '../config/db.ts';
import { calcularFatura } from './fatura.ts';

interface LinhaCartao {
  id: number;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
  limite: string;
}

interface LinhaLancamento {
  id: number;
  fonte_destino_id: number;
  descricao: string;
  valor: string;
  data: string;
  parcela_atual: number;
  total_parcelas: number;
}

const emCentavos = (v: string) => Math.round(Number(v) * 100);
const emReais = (c: number) => c / 100;

export async function previsaoFaturas(usuarioId: number, meses: number, hoje = new Date().toLocaleDateString('en-CA')) {
  const cartoes = await pool.query<LinhaCartao>(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite
       FROM fontes_destinos
      WHERE usuario_id = $1 AND tipo = 'cartao_credito'
      ORDER BY nome`,
    [usuarioId],
  );

  const lancamentos = await pool.query<LinhaLancamento>(
    `SELECT l.id, l.fonte_destino_id, l.descricao, l.valor, l.data, l.parcela_atual, l.total_parcelas
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = $1 AND f.tipo = 'cartao_credito' AND l.tipo = 'saida'
      ORDER BY l.data, l.id`,
    [usuarioId],
  );

  return {
    hoje,
    cartoes: cartoes.rows.map((c) => {
      const dias = { diaFechamento: c.dia_fechamento, diaVencimento: c.dia_vencimento };

      const parcelas = lancamentos.rows
        .filter((l) => l.fonte_destino_id === c.id)
        .map((l) => ({ ...l, fatura: calcularFatura(l.data, dias, l.parcela_atual) }));

      const faturas = Array.from({ length: meses + 1 }, (_, k) => {
        const fatura = calcularFatura(hoje, dias, k + 1);
        const itens = parcelas.filter((p) => p.fatura.referencia === fatura.referencia);
        return {
          ...fatura,
          situacao: k === 0 ? 'aberta' : 'futura',
          total: emReais(itens.reduce((s, p) => s + emCentavos(p.valor), 0)),
          lancamentos: itens.map((p) => ({
            id: p.id,
            descricao: p.total_parcelas > 1 ? `${p.descricao} — ${p.parcela_atual}/${p.total_parcelas}` : p.descricao,
            dataCompra: p.data,
            valor: Number(p.valor),
            totalParcelas: p.total_parcelas,
          })),
        };
      });

      const utilizado = parcelas
        .filter((p) => p.fatura.vencimento >= hoje)
        .reduce((s, p) => s + emCentavos(p.valor), 0);
      const limite = emCentavos(c.limite);

      return {
        id: c.id,
        nome: c.nome,
        diaFechamento: c.dia_fechamento,
        diaVencimento: c.dia_vencimento,
        limite: emReais(limite),
        limiteUtilizado: emReais(utilizado),
        limiteDisponivel: emReais(limite - utilizado),
        faturas,
      };
    }),
  };
}