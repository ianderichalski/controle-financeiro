import { pool } from '../config/db.ts';
import type { TipoMovimento } from './tipos.ts';

export async function listarCategorias(usuarioId: number) {
  const { rows } = await pool.query('SELECT id, usuario_id, nome, tipo FROM categorias WHERE usuario_id = $1 ORDER BY nome, id', [usuarioId]);
  return rows;
}
export async function buscarCategoria(usuarioId: number, id: number) {
  const { rows } = await pool.query('SELECT id, usuario_id, nome, tipo FROM categorias WHERE usuario_id = $1 AND id = $2', [usuarioId, id]);
  return rows[0] ?? null;
}
export async function criarCategoria(usuarioId: number, nome: string, tipo: TipoMovimento) {
  const { rows } = await pool.query('INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING *', [usuarioId, nome, tipo]);
  return rows[0];
}
export async function atualizarCategoria(usuarioId: number, id: number, nome: string, tipo: TipoMovimento) {
  const atual = await buscarCategoria(usuarioId, id);
  if (!atual) return null;
  if (atual.tipo !== tipo) {
    const { rows } = await pool.query('SELECT EXISTS(SELECT 1 FROM lancamentos WHERE usuario_id=$1 AND categoria_id=$2) AS usado', [usuarioId, id]);
    if (rows[0].usado) return 'vinculada' as const;
  }
  const { rows } = await pool.query('UPDATE categorias SET nome=$3, tipo=$4 WHERE usuario_id=$1 AND id=$2 RETURNING *', [usuarioId, id, nome, tipo]);
  return rows[0] ?? null;
}
export async function excluirCategoria(usuarioId: number, id: number) {
  const { rowCount } = await pool.query('DELETE FROM categorias WHERE usuario_id=$1 AND id=$2 RETURNING id', [usuarioId, id]);
  return rowCount === 1;
}
