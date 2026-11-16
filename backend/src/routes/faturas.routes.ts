import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { ErroApi } from '../middlewares/erros.ts';
import { previsaoFaturas } from '../models/faturas.ts';

const router = Router();
router.use(autenticar);

// GET /api/relatorios/faturas?meses=3
router.get('/faturas', async (req, res) => {
  const valor = req.query.meses ?? '3';
  const meses = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : NaN;

  if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
    throw new ErroApi(400, 'Dados inválidos.', { meses: 'Informe um número de meses entre 1 e 12.' });
  }

  res.json(await previsaoFaturas(req.usuarioId, meses));
});

export default router;