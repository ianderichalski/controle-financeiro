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

export const META_POUPANCA = 10;
export const LIMITE_CARTOES = 30;

interface Dica {
  nivel: 'alerta' | 'ok' | 'info';
  texto: string;
}

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const mesBR = (referencia: string) => referencia.split('-').reverse().join('/');
const pct = (v: number) => `${v.toLocaleString('pt-BR')}%`;

export function gerarDicas(dados: {
  taxaPoupanca: number | null;
  comprometimentoRenda: number | null;
  parcelasFuturas: { total: number; ate: string | null };
  projecao: { mes: string; saldo: number }[];
}): Dica[] {
  const dicas: Dica[] = [];

  if (dados.taxaPoupanca === null) {
    dicas.push({ nivel: 'info', texto: 'Não há entradas nos últimos 3 meses, então não dá para calcular quanto você guardou.' });
  } else if (dados.taxaPoupanca < META_POUPANCA) {
    dicas.push({ nivel: 'alerta', texto: `Você guardou ${pct(dados.taxaPoupanca)} da sua renda nos últimos 3 meses. Uma meta comum é guardar pelo menos ${META_POUPANCA}%.` });
  } else {
    dicas.push({ nivel: 'ok', texto: `Você guardou ${pct(dados.taxaPoupanca)} da sua renda nos últimos 3 meses, acima da meta comum de ${META_POUPANCA}%.` });
  }

  if (dados.comprometimentoRenda !== null && dados.comprometimentoRenda > LIMITE_CARTOES) {
    dicas.push({ nivel: 'alerta', texto: `Suas próximas faturas comprometem ${pct(dados.comprometimentoRenda)} da sua renda mensal (referência: até ${LIMITE_CARTOES}%).` });
  } else if (dados.comprometimentoRenda !== null) {
    dicas.push({ nivel: 'ok', texto: `Suas próximas faturas comprometem ${pct(dados.comprometimentoRenda)} da sua renda mensal, dentro da referência de ${LIMITE_CARTOES}%.` });
  }

  if (dados.parcelasFuturas.total > 0 && dados.parcelasFuturas.ate) {
    dicas.push({ nivel: 'info', texto: `Você tem ${moeda(dados.parcelasFuturas.total)} em parcelas até ${mesBR(dados.parcelasFuturas.ate)}.` });
  }

  const negativo = dados.projecao.find((m) => m.saldo < 0);
  if (negativo) {
    dicas.push({ nivel: 'alerta', texto: `Mantido o ritmo atual, seu saldo fica negativo em ${mesBR(negativo.mes)}.` });
  } else if (dados.projecao.length > 0) {
    dicas.push({ nivel: 'ok', texto: `Mantido o ritmo atual, seu saldo continua positivo nos próximos ${dados.projecao.length} meses.` });
  }

  return dicas;
}

export async function saudeFinanceira(usuarioId: number, hoje = new Date().toLocaleDateString('en-CA')) {
  const meses = await resumoMensal(usuarioId, 3, hoje);
  const totalEntradas = meses.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = meses.reduce((s, m) => s + m.saidas, 0);
  const rendaMedia = totalEntradas / meses.length;

  const taxaPoupanca = totalEntradas > 0 ? Math.round(((totalEntradas - totalSaidas) / totalEntradas) * 1000) / 10 : null;

  const cartoes = await indicadoresCartoes(usuarioId, rendaMedia, hoje);
  const projecao = await projecaoSaldo(usuarioId, 3, hoje);

  return {
    indicadores: {
      taxaPoupanca: { periodo: taxaPoupanca, porMes: meses },
      comprometimentoCartoes: { percentual: cartoes.comprometimentoRenda, totalProximasFaturas: cartoes.totalProximasFaturas, rendaMedia: Math.round(rendaMedia * 100) / 100 },
      parcelasFuturas: cartoes.parcelasFuturas,
    },
    projecao,
    dicas: gerarDicas({
      taxaPoupanca,
      comprometimentoRenda: cartoes.comprometimentoRenda,
      parcelasFuturas: cartoes.parcelasFuturas,
      projecao: projecao.projecao,
    }),
  };
}