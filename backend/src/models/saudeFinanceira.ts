import { pool } from '../config/db.ts';
import { previsaoFaturas } from './faturas.ts';

interface LinhaMes {
  mes: string;
  entradas: string;
  saidas: string;
}

export async function resumoMensal(usuarioId: number, meses = 3, hoje = new Date().toLocaleDateString('en-CA')) {
  const { rows } = await pool.query<LinhaMes>(
    `SELECT to_char(m.inicio, 'YYYY-MM') AS mes,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas
       FROM generate_series(
              date_trunc('month', $2::date) - ($3::int - 1) * interval '1 month',
              date_trunc('month', $2::date),
              interval '1 month'
            ) AS m(inicio)
       LEFT JOIN lancamentos l
              ON l.usuario_id = $1
             AND date_trunc('month', l.data) = m.inicio
      GROUP BY m.inicio
      ORDER BY m.inicio`,
    [usuarioId, hoje, meses],
  );

  return rows.map((r) => {
    const entradas = Number(r.entradas);
    const saidas = Number(r.saidas);
    return {
      mes: r.mes,
      entradas,
      saidas,
      taxaPoupanca: entradas > 0 ? Math.round(((entradas - saidas) / entradas) * 1000) / 10 : null,
    };
  });
}

const emCentavos = (v: number) => Math.round(v * 100);
const emReais = (c: number) => c / 100;

export async function indicadoresCartoes(usuarioId: number, rendaMedia: number, hoje = new Date().toLocaleDateString('en-CA')) {
  const { cartoes } = await previsaoFaturas(usuarioId, 3, hoje); // fatura aberta + 3 próximas

  const porMes = new Map<string, { faturas: number; parcelas: number }>();
  for (const cartao of cartoes) {
    for (const fatura of cartao.faturas) {
      const mes = porMes.get(fatura.referencia) ?? { faturas: 0, parcelas: 0 };
      mes.faturas += emCentavos(fatura.total);
      mes.parcelas += fatura.lancamentos
        .filter((l) => l.totalParcelas > 1)
        .reduce((s, l) => s + emCentavos(l.valor), 0);
      porMes.set(fatura.referencia, mes);
    }
  }

  const meses = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalFaturas = meses.reduce((s, [, m]) => s + m.faturas, 0);
  const totalParcelas = meses.reduce((s, [, m]) => s + m.parcelas, 0);
  const mesesComParcela = meses.filter(([, m]) => m.parcelas > 0);

  return {
    totalProximasFaturas: emReais(totalFaturas),
    comprometimentoRenda: rendaMedia > 0 ? Math.round((emReais(totalFaturas) / rendaMedia) * 1000) / 10 : null,
    parcelasFuturas: {
      total: emReais(totalParcelas),
      ate: mesesComParcela.length > 0 ? mesesComParcela[mesesComParcela.length - 1][0] : null, // último mês com parcela
      porMes: meses.map(([mes, m]) => ({ mes, valor: emReais(m.parcelas) })),
    },
  };
}