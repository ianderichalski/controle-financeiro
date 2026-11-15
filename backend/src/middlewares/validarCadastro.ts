import type { Request, Response, NextFunction } from 'express';
import { cpfValido } from '../models/cpf.ts';
import { ErroApi } from './erros.ts';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCadastro(req: Request, _res: Response, next: NextFunction) {
  const { nome, email, cpf, senha } = req.body ?? {};
  const campos: Record<string, string> = {};

  if (typeof nome !== 'string' || nome.trim() === '') {
    campos.nome = 'O nome é obrigatório.';
  } else if (nome.trim().length > 120) {
    campos.nome = 'O nome deve ter no máximo 120 caracteres.';
  }

  if (typeof email !== 'string' || email.trim() === '') {
    campos.email = 'O e-mail é obrigatório.';
  } else if (email.trim().length > 160 || !FORMATO_EMAIL.test(email.trim())) {
    campos.email = 'Informe um e-mail válido.';
  }

  if (typeof cpf !== 'string' || cpf.trim() === '') {
    campos.cpf = 'O CPF é obrigatório.';
  } else if (!cpfValido(cpf)) {
    campos.cpf = 'CPF inválido.';
  }

  if (typeof senha !== 'string' || senha === '') {
    campos.senha = 'A senha é obrigatória.';
  } else if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', campos);
  }
  next();
}