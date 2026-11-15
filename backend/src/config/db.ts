import pg from 'pg';
import type { PoolClient } from 'pg';

const { Pool, types } = pg;

types.setTypeParser(1082, (valor: string) => valor);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (erro) => {
  console.error('Erro inesperado em conexão ociosa do pool:', erro);
});

export async function testarConexao() {
  await pool.query('SELECT 1');
}
export async function emTransacao<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release(); // devolve a conexão ao pool
  }
}