import type { Express } from 'express';
import categorias from './categorias.routes.ts';
import fontesDestinos from './fontesDestinos.routes.ts';
import lancamentos from './lancamentos.routes.ts';
import relatoriosCategorias from './relatoriosCategorias.routes.ts';

/** Registrar antes dos middlewares rotaNaoEncontrada e tratarErros. */
export function registrarFinanceiro(app: Express) {
  app.use('/api/categorias', categorias);
  app.use('/api/fontes-destinos', fontesDestinos);
  app.use('/api/lancamentos', lancamentos);
  app.use('/api/relatorios', relatoriosCategorias);
}
