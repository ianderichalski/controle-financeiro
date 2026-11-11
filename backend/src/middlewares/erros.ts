import type { Request, Response, NextFunction } from 'express';

export class ErroApi extends Error {
  status: number;
  campos?: Record<string, string>;

  constructor(status: number, mensagem: string, campos?: Record<string, string>) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

export function rotaNaoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof ErroApi) {
    res.status(erro.status).json({ erro: erro.message, ...(erro.campos && { campos: erro.campos }) });
    return;
  }
  if (erro instanceof SyntaxError && 'body' in erro) {
    res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
    return;
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}