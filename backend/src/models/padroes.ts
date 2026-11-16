import type { PoolClient } from 'pg';

const CATEGORIAS_PADRAO: [nome: string, tipo: 'entrada' | 'saida'][] = [
  ['Salário', 'entrada'],
  ['Outros', 'entrada'],
  ['Alimentação', 'saida'],
  ['Moradia', 'saida'],
  ['Saúde', 'saida'],
  ['Mobilidade', 'saida'],
  ['Lazer', 'saida'],
  ['Educação', 'saida'],
  ['Outros', 'saida'],
];

const FONTE_PADRAO = { nome: 'Conta corrente', tipo: 'conta' };

export async function criarPadroes(client: PoolClient, usuarioId: number): Promise<void> {
  for (const [nome, tipo] of CATEGORIAS_PADRAO) {
    await client.query(
      'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
      [usuarioId, nome, tipo],
    );
  }
  await client.query(
    'INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
    [usuarioId, FONTE_PADRAO.nome, FONTE_PADRAO.tipo],
  );
}