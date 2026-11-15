import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Usuario from '../models/Usuario.ts';
import { ErroApi } from '../middlewares/erros.ts';
import { autenticar } from '../middlewares/autenticar.ts';

const router = Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,                
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res) => {
  const { email, senha } = req.body ?? {};

  const campos: Record<string, string> = {};
  if (typeof email !== 'string' || email.trim() === '') campos.email = 'O e-mail é obrigatório.';
  if (typeof senha !== 'string' || senha === '') campos.senha = 'A senha é obrigatória.';
  if (Object.keys(campos).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', campos);
  }

  const usuario = await Usuario.buscarPorEmail(email.trim().toLowerCase());
  const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

  if (!usuario || !senhaConfere) {
    throw new ErroApi(401, 'E-mail ou senha inválidos.');
  }

  const token = jwt.sign({}, process.env.JWT_SECRET as string, {
    subject: String(usuario.id),
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as jwt.SignOptions['expiresIn'],
  });

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// GET /api/auth/me: dados do usuário dono do token
router.get('/me', autenticar, async (req, res) => {
  const usuario = await Usuario.buscarPorId(req.usuarioId);

  if (!usuario) {
    throw new ErroApi(401, 'Usuário não encontrado.');
  }

  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
});

export default router;