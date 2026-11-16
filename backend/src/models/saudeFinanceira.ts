import { pool } from '../config/db.ts';

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