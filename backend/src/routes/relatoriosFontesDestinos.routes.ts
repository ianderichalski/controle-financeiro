import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { intervalo } from '../config/validacao.ts';
import { relatorioPorFonteDestino } from '../models/relatorioFontesDestinos.ts';

const router = Router();
router.use(autenticar);

// GET /api/relatorios/fontes-destinos?inicio=&fim=
router.get('/fontes-destinos', async (req, res) => {
  const { inicio, fim } = intervalo(req.query.inicio, req.query.fim);
  res.json(await relatorioPorFonteDestino(req.usuarioId, inicio, fim));
});

export default router;