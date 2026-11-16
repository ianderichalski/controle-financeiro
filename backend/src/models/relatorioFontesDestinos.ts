import { pool } from '../config/db.ts';

interface LinhaFonte {
  id: number;
  nome: string;
  tipo: 'renda' | 'conta' | 'cartao_credito';
  entradas: string;
  saidas: string;
}

export async function relatorioPorFonteDestino(usuarioId: number, inicio: string, fim: string) {
  const { rows } = await pool.query<LinhaFonte>(
    `SELECT f.id, f.nome, f.tipo,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
              ON l.fonte_destino_id = f.id
             AND l.usuario_id = f.usuario_id
             AND l.data BETWEEN $2 AND $3
      WHERE f.usuario_id = $1
      GROUP BY f.id, f.nome, f.tipo
      ORDER BY f.nome`,
    [usuarioId, inicio, fim],
  );

  const linhas = rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    entradas: Number(r.entradas),
    saidas: Number(r.saidas),
  }));

  const centavos = (v: number) => Math.round(v * 100) / 100;

  return {
    periodo: { inicio, fim },
    totalEntradas: centavos(linhas.reduce((s, l) => s + l.entradas, 0)),
    totalSaidas: centavos(linhas.reduce((s, l) => s + l.saidas, 0)),
    entradas: linhas
      .filter((l) => l.entradas > 0)
      .map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, total: l.entradas }))
      .sort((a, b) => b.total - a.total),
    saidas: linhas
      .filter((l) => l.saidas > 0)
      .map((l) => ({ id: l.id, nome: l.nome, tipo: l.tipo, total: l.saidas }))
      .sort((a, b) => b.total - a.total),
    contas: linhas
      .filter((l) => l.tipo === 'conta')
      .map((l) => ({ id: l.id, nome: l.nome, entradas: l.entradas, saidas: l.saidas, saldo: centavos(l.entradas - l.saidas) })),
  };
}