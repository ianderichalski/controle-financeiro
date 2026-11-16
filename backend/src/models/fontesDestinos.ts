import { pool } from '../config/db.ts';
import type { DadosFonteDestino } from './tipos.ts';

export async function listarFontes(usuarioId: number) {
  const { rows } = await pool.query('SELECT * FROM fontes_destinos WHERE usuario_id=$1 ORDER BY nome, id', [usuarioId]);
  return rows;
}
export async function buscarFonte(usuarioId: number, id: number) {
  const { rows } = await pool.query('SELECT * FROM fontes_destinos WHERE usuario_id=$1 AND id=$2', [usuarioId, id]);
  return rows[0] ?? null;
}
export async function criarFonte(usuarioId: number, f: DadosFonteDestino) {
  const { rows } = await pool.query(`INSERT INTO fontes_destinos
    (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [usuarioId, f.nome, f.tipo, f.diaFechamento, f.diaVencimento, f.limite]);
  return rows[0];
}
export async function atualizarFonte(usuarioId: number, id: number, f: DadosFonteDestino) {
  const antiga = await buscarFonte(usuarioId, id);
  if (!antiga) return null;
  if (antiga.tipo !== f.tipo) {
    const { rows } = await pool.query('SELECT EXISTS(SELECT 1 FROM lancamentos WHERE usuario_id=$1 AND fonte_destino_id=$2) AS usado', [usuarioId, id]);
    if (rows[0].usado) return 'vinculada' as const;
  }
  const { rows } = await pool.query(`UPDATE fontes_destinos SET nome=$3, tipo=$4, dia_fechamento=$5,
      dia_vencimento=$6, limite=$7 WHERE usuario_id=$1 AND id=$2 RETURNING *`,
    [usuarioId, id, f.nome, f.tipo, f.diaFechamento, f.diaVencimento, f.limite]);
  return rows[0] ?? null;
}
export async function excluirFonte(usuarioId: number, id: number) {
  const { rowCount } = await pool.query('DELETE FROM fontes_destinos WHERE usuario_id=$1 AND id=$2 RETURNING id', [usuarioId, id]);
  return rowCount === 1;
}
