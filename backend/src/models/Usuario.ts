import type { Pool, PoolClient } from 'pg';
import { pool } from '../config/db.ts';

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  criado_em: Date;
}

interface UsuarioComSenha extends UsuarioPublico {
  senha_hash: string;
}

interface NovoUsuario {
  nome: string;
  email: string;
  cpf: string;
  senhaHash: string;
}

const COLUNAS_PUBLICAS = 'id, nome, email, cpf, criado_em';

class Usuario {
  async criar(dados: NovoUsuario, executor: Pool | PoolClient = pool): Promise<UsuarioPublico> {
    const { rows } = await executor.query<UsuarioPublico>(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUNAS_PUBLICAS}`,
      [dados.nome, dados.email, dados.cpf, dados.senhaHash],
    );
    return rows[0];
  }

  async buscarPorEmail(email: string): Promise<UsuarioComSenha | undefined> {
    const { rows } = await pool.query<UsuarioComSenha>(
      `SELECT ${COLUNAS_PUBLICAS}, senha_hash FROM usuarios WHERE email = $1`,
      [email],
    );
    return rows[0];
  }

  async buscarPorId(id: number): Promise<UsuarioPublico | undefined> {
    const { rows } = await pool.query<UsuarioPublico>(
      `SELECT ${COLUNAS_PUBLICAS} FROM usuarios WHERE id = $1`,
      [id],
    );
    return rows[0];
  }
}

export default new Usuario();