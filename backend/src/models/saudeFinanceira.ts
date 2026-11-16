import { pool } from '../config/db.ts';
import { previsaoFaturas } from './faturas.ts';
import { calcularFatura } from './fatura.ts';

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

function mesSeguinte(hoje: string, k: number): string {
  const [ano, mes] = hoje.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + k, 1));
  return d.toISOString().slice(0, 7);
}

export async function projecaoSaldo(usuarioId: number, meses = 3, hoje = new Date().toLocaleDateString('en-CA')) {
  const saldo = await pool.query<{ saldo: string }>(
    `SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0) AS saldo
       FROM lancamentos
      WHERE usuario_id = $1 AND data <= $2 AND total_parcelas = 1`,
    [usuarioId, hoje],
  );

  const medias = await pool.query<{ entradas: string; saidas: string }>(
    `SELECT COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) / 3 AS entradas,
            COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0) / 3   AS saidas
       FROM lancamentos
      WHERE usuario_id = $1 AND total_parcelas = 1
        AND data >= date_trunc('month', $2::date) - interval '2 months'
        AND data <  date_trunc('month', $2::date) + interval '1 month'`,
    [usuarioId, hoje],
  );

  const parcelas = await pool.query<{ valor: string; data: string; parcela_atual: number; dia_fechamento: number; dia_vencimento: number }>(
    `SELECT l.valor, l.data, l.parcela_atual, f.dia_fechamento, f.dia_vencimento
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = $1 AND l.total_parcelas > 1 AND f.tipo = 'cartao_credito'`,
    [usuarioId],
  );

  const primeiroMes = mesSeguinte(hoje, 1);
  let saldoCentavos = emCentavos(Number(saldo.rows[0].saldo));
  const parcelasPorMes = new Map<string, number>();

  for (const p of parcelas.rows) {
    const { vencimento } = calcularFatura(p.data, { diaFechamento: p.dia_fechamento, diaVencimento: p.dia_vencimento }, p.parcela_atual);
    if (vencimento <= hoje) {
      saldoCentavos -= emCentavos(Number(p.valor));
    } else {
      const mes = vencimento.slice(0, 7) < primeiroMes ? primeiroMes : vencimento.slice(0, 7);
      parcelasPorMes.set(mes, (parcelasPorMes.get(mes) ?? 0) + emCentavos(Number(p.valor)));
    }
  }

  const mediaEntradas = emCentavos(Number(medias.rows[0].entradas));
  const mediaSaidas = emCentavos(Number(medias.rows[0].saidas));
  const saldoAtual = emReais(saldoCentavos);

  const projecao = Array.from({ length: meses }, (_, i) => {
    const mes = mesSeguinte(hoje, i + 1);
    const parcelasDoMes = parcelasPorMes.get(mes) ?? 0;
    saldoCentavos += mediaEntradas - mediaSaidas - parcelasDoMes;
    return {
      mes,
      entradas: emReais(mediaEntradas),
      saidas: emReais(mediaSaidas),
      parcelas: emReais(parcelasDoMes),
      saldo: emReais(saldoCentavos),
    };
  });

  return {
    saldoAtual,
    mediaEntradas: emReais(mediaEntradas),
    mediaSaidas: emReais(mediaSaidas),
    projecao,
    ficaNegativo: projecao.some((m) => m.saldo < 0),
  };
}