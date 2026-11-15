import { pool } from '../config/db.ts';
import { mesAnteriorMesmaDuracao } from '../config/validacao.ts';

export async function relatorioPorCategoria(usuarioId: number, inicio: string, fim: string) {
  const anterior = mesAnteriorMesmaDuracao(inicio, fim);
  const sql = `SELECT c.id, c.nome, c.tipo,
    COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $2 AND $3),0) AS total,
    COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $4 AND $5),0) AS anterior
    FROM categorias c
    JOIN lancamentos l ON l.categoria_id=c.id AND l.usuario_id=c.usuario_id
    WHERE c.usuario_id=$1 AND l.data BETWEEN $4 AND $3
    GROUP BY c.id, c.nome, c.tipo`;
  const { rows } = await pool.query(sql, [usuarioId, inicio, fim, anterior.inicio, anterior.fim]);
  const saidas = rows.filter(r => r.tipo === 'saida').map(r => ({ id: r.id as number, nome: r.nome as string,
    total: Number(r.total), periodoAnterior: Number(r.anterior) }));
  const entradas = rows.filter(r => r.tipo === 'entrada').map(r => ({ id: r.id as number, nome: r.nome as string,
    total: Number(r.total), periodoAnterior: Number(r.anterior) }));
  const totalSaidas = saidas.reduce((s,r) => s+r.total,0);
  const totalEntradas = entradas.reduce((s,r) => s+r.total,0);
  const categorias = saidas.map(r => ({ ...r, percentual: totalSaidas ? Math.round(r.total/totalSaidas*10000)/100 : 0,
    variacaoPercentual: r.periodoAnterior ? Math.round((r.total-r.periodoAnterior)/r.periodoAnterior*10000)/100 : null,
    diferenca: Math.round((r.total-r.periodoAnterior)*100)/100 })).sort((a,b) => b.total - a.total);
  return { periodo: { inicio, fim }, periodoAnterior: anterior, totalSaidas, totalEntradas, categorias, entradas: entradas.sort((a,b)=>b.total-a.total) };
}
