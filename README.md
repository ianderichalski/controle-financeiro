# Controle Financeiro

Projeto 2 - Programação Web Full Stack

**Integrantes:** Iandê de Freitas Richalski e Luiz Felipe Fernandes Ramos

## Tecnologias

- **Back-end:** Node.js 22.18 ou superior (executa TypeScript diretamente), Express, TypeScript, pg, bcrypt, jsonwebtoken, dotenv, cors e express-rate-limit
- **Banco de dados:** PostgreSQL
- **Front-end:** React, TypeScript, Vite, React Router, Axios, Recharts e Bootstrap (CSS)

## Como executar

Os comandos são executados a partir da raiz do projeto.

### 1. Criar o banco

Com PostgreSQL instalado na máquina (Linux):

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'sua_senha';"
sudo -u postgres createdb financas
```

Ou com Docker:

```bash
docker run -d --name controle-financeiro-db -e POSTGRES_PASSWORD=sua_senha -e POSTGRES_DB=financas -p 5432:5432 postgres:17
```

### 2. Criar as tabelas e rodar o seed

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -d financas < backend/database/schema.sql
sudo -u postgres psql -v ON_ERROR_STOP=1 -d financas < backend/database/seed.sql
```

Com Docker, troque `sudo -u postgres psql` por `docker exec -i controle-financeiro-db psql -U postgres`.

O seed só pode ser executado uma vez no mesmo banco. Para recomeçar do zero, apague e crie o banco novamente (`dropdb financas` e `createdb financas`) e repita este passo.

Usuários criados pelo seed (com lançamentos dos 3 meses anteriores e do mês atual):

| E-mail | Senha |
| --- | --- |
| `iande@demo.com` | `Demo1234` |
| `luiz@demo.com` | `Demo1234` |

### 3. Configurar o `.env`

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env`:

```dotenv
PORT=3000
DATABASE_URL=postgres://postgres:sua_senha@localhost:5432/financas
JWT_SECRET=uma-chave-aleatoria-longa
JWT_EXPIRES_IN=1h
FRONTEND_URL=http://localhost:5173
```

### 4. Subir o back-end

```bash
cd backend
npm install
npm run dev
```

API em `http://localhost:3000`.

### 5. Subir o front-end

Em outro terminal, a partir da raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Aplicação em `http://localhost:5173`.

## Rotas da API

Todas as rotas, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/cadastro` | Cadastra usuário |
| POST | `/api/auth/login` | Autentica e devolve o JWT |
| GET | `/api/auth/me` | Dados do usuário logado |
| GET, POST | `/api/categorias` | Lista / cria categorias |
| GET, PUT, DELETE | `/api/categorias/:id` | Detalha / edita / exclui categoria |
| GET, POST | `/api/fontes-destinos` | Lista / cria fontes e destinos |
| GET, PUT, DELETE | `/api/fontes-destinos/:id` | Detalha / edita / exclui fonte/destino |
| GET | `/api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=` | Lista com filtros e paginação |
| POST | `/api/lancamentos` | Cria lançamento (com parcelas, se houver) |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Detalha / edita / exclui (`?todasParcelas=true`) |
| GET | `/api/relatorios/categorias?inicio=&fim=` | Relatório por categoria |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | Relatório por fonte/destino |
| GET | `/api/relatorios/faturas?meses=3` | Previsão de faturas |
| GET | `/api/saude-financeira` | Saúde financeira |

## Funções utilitárias

As funções puras `cpfValido` (`backend/src/models/cpf.ts`) e `calcularFatura` (`backend/src/models/fatura.ts`) ficam na pasta `models/`.

## Regras das dicas da saúde financeira

| Regra | Limite |
| --- | --- |
| Taxa de poupança dos últimos 3 meses | alerta abaixo de 10% |
| Comprometimento da renda com as próximas faturas | alerta acima de 30% |
| Parcelas a vencer | informa o total e até quando vão |
| Saldo projetado | alerta se ficar negativo |

## Uso de IA

Assistentes de IA foram usados como apoio para tirar dúvidas, revisar o código e a documentação. Todo o código foi revisado e testado pelos integrantes.