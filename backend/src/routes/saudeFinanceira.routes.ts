import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.ts';
import { saudeFinanceira } from '../models/saudeFinanceira.ts';

const router = Router();
router.use(autenticar);

// GET /api/saude-financeira
router.get('/', async (req, res) => {
  res.json(await saudeFinanceira(req.usuarioId));
});

export default router;