import 'dotenv/config';
import express from 'express';
import { testarConexao } from './config/db.ts';

const app = express();
app.use(express.json());

const porta = Number(process.env.PORT ?? 3000);

await testarConexao();
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));