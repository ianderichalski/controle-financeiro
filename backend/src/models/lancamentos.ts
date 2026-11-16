import { randomUUID } from 'node:crypto';
import { pool } from '../config/db.ts';
import { ErroApi } from '../middlewares/erros.ts';
import type { DadosLancamento } from './tipos.ts';

const select = `SELECT l.id, l.usuario_id, l.tipo, l.descricao, l.valor, l.data, l.categoria_id,
 l.fonte_destino_id, l.parcela_atual, l.total_parcelas, l.grupo_parcelamento,
 c.nome AS categoria_nome, f.nome AS fonte_destino_nome
 FROM lancamentos l JOIN categorias c ON c.id=l.categoria_id
 JOIN fontes_destinos f ON f.id=l.fonte_destino_id`;

export async function validarVinculos(usuarioId: number, d: DadosLancamento) {
  const { rows } = await pool.query(`SELECT
    (SELECT tipo FROM categorias WHERE id=$2 AND usuario_id=$1) AS tipo_categoria,
    (SELECT tipo FROM fontes_destinos WHERE id=$3 AND usuario_id=$1) AS tipo_fonte`, [usuarioId, d.categoriaId, d.fonteDestinoId]);
  if (!rows[0].tipo_categoria || !rows[0].tipo_fonte) throw new ErroApi(404, 'Categoria ou fonte/destino inexistente para este usuário.');
  if (rows[0].tipo_categoria !== d.tipo) throw new ErroApi(400, 'Dados inválidos.', { categoriaId: 'Categoria incompatível com tipo do lançamento.' });
  if (rows[0].tipo_fonte === 'cartao_credito' && d.tipo !== 'saida') throw new ErroApi(400, 'Dados inválidos.', { fonteDestinoId: 'Cartão só aceita saídas.' });
  return rows[0].tipo_fonte as string;
}

export interface Filtros {
  inicio: string;
  fim: string;
  tipo?: string;
  categoriaId?: number;
  fonteDestinoId?: number;
  pagina: number;
  porPagina: number;
}
function filtrosSql(usuarioId: number, f: Filtros) {
  const valores: unknown[] = [usuarioId, f.inicio, f.fim];
  let where = 'l.usuario_id=$1 AND l.data BETWEEN $2 AND $3';
  for (const [col, v] of [['l.tipo', f.tipo], ['l.categoria_id', f.categoriaId], ['l.fonte_destino_id', f.fonteDestinoId]] as const) {
    if (v !== undefined) { valores.push(v); where += ` AND ${col}=$${valores.length}`; }
  }
  return { where, valores };
}
export async function listarLancamentos(usuarioId: number, filtros: Filtros) {
  const { where, valores } = filtrosSql(usuarioId, filtros);
  const listaArgs = [...valores, filtros.porPagina, (filtros.pagina - 1) * filtros.porPagina];
  const [lista, totais] = await Promise.all([
    pool.query(`${select} WHERE ${where} ORDER BY l.data DESC, l.id DESC LIMIT $${listaArgs.length - 1} OFFSET $${listaArgs.length}`, listaArgs),
    pool.query(`SELECT COUNT(*)::int AS quantidade,
      COALESCE(SUM(CASE WHEN l.tipo='entrada' THEN l.valor ELSE 0 END),0) AS entradas,
      COALESCE(SUM(CASE WHEN l.tipo='saida' THEN l.valor ELSE 0 END),0) AS saidas
      FROM lancamentos l WHERE ${where}`, valores),
  ]);
  const t = totais.rows[0];
  return { itens: lista.rows, pagina: filtros.pagina, porPagina: filtros.porPagina,
    totalRegistros: t.quantidade, totalPaginas: Math.ceil(t.quantidade / filtros.porPagina),
    totais: { entradas: Number(t.entradas), saidas: Number(t.saidas), saldo: Number(t.entradas) - Number(t.saidas) } };
}
export async function buscarLancamento(usuarioId: number, id: number) {
  const { rows } = await pool.query(`${select} WHERE l.usuario_id=$1 AND l.id=$2`, [usuarioId, id]);
  return rows[0] ?? null;
}
export async function criarLancamento(usuarioId: number, d: DadosLancamento, parcelas: number) {
  const tipoFonte = await validarVinculos(usuarioId, d);
  if (parcelas > 1 && tipoFonte !== 'cartao_credito') throw new ErroApi(400, 'Parcelamento disponível apenas para cartão de crédito.');
  const grupo = parcelas > 1 ? randomUUID() : null;
  const base = Math.floor(d.valorCentavos / parcelas);
  const resto = d.valorCentavos - base * parcelas;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = [];
    for (let n = 1; n <= parcelas; n++) {
      const valor = (base + (n === 1 ? resto : 0)) / 100;
      const r = await client.query(`INSERT INTO lancamentos
        (usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id,parcela_atual,total_parcelas,grupo_parcelamento)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [usuarioId,d.tipo,d.descricao,valor,d.data,d.categoriaId,d.fonteDestinoId,n,parcelas,grupo]);
      rows.push(r.rows[0]);
    }
    await client.query('COMMIT');
    return rows;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function atualizarLancamento(usuarioId: number, id: number, d: DadosLancamento) {
  await validarVinculos(usuarioId, d);
  const { rows } = await pool.query(`UPDATE lancamentos SET tipo=$3,descricao=$4,valor=$5,data=$6,categoria_id=$7,fonte_destino_id=$8
    WHERE usuario_id=$1 AND id=$2 RETURNING *`, [usuarioId,id,d.tipo,d.descricao,d.valorCentavos/100,d.data,d.categoriaId,d.fonteDestinoId]);
  return rows[0] ?? null;
}
export async function excluirLancamento(usuarioId: number, id: number, todasParcelas: boolean) {
  const sql = todasParcelas ? `DELETE FROM lancamentos WHERE usuario_id=$1 AND (
    id=$2 OR grupo_parcelamento=(SELECT grupo_parcelamento FROM lancamentos WHERE usuario_id=$1 AND id=$2)) RETURNING id`
    : 'DELETE FROM lancamentos WHERE usuario_id=$1 AND id=$2 RETURNING id';
  const { rowCount } = await pool.query(sql, [usuarioId, id]);
  return rowCount ?? 0;
}
