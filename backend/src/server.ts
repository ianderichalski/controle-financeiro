import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testarConexao } from './config/db.ts';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.ts';
import authRoutes from './routes/auth.routes.ts';
import { registrarFinanceiro } from './routes/registrarFinanceiro.ts';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/api/auth', authRoutes);
registrarFinanceiro(app);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

const porta = Number(process.env.PORT ?? 3000);

await testarConexao();
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));