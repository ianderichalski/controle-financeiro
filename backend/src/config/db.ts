import pg from 'pg';

const { Pool, types } = pg;

types.setTypeParser(1082, (valor: string) => valor);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (erro) => {
  console.error('Erro inesperado em conexão ociosa do pool:', erro);
});

export async function testarConexao() {
  await pool.query('SELECT 1');
}