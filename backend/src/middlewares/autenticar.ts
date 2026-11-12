import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      usuarioId: number;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    res.status(401).json({ erro: 'Token não informado.' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    if (typeof payload === 'string' || !payload.sub) throw new Error('token sem sub');
    req.usuarioId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}