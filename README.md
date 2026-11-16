# Controle Financeiro

Projeto 2 — Programação Web Full Stack

## Integrantes

- Iandê de Freitas Richalski
- Luiz Felipe Fernandes Ramos

## Visão geral

Aplicação web para controle de finanças pessoais, com autenticação, lançamentos de receitas e despesas, organização por categoria e fonte/destino, parcelamento de compras no cartão de crédito e relatórios.

Os dados financeiros são associados ao usuário autenticado. O sistema também oferece previsão de faturas e indicadores educativos de saúde financeira.

## Tecnologias

- **Frontend:** React, TypeScript, Vite e React Router
- **Requisições HTTP:** Axios, por um cliente único (`frontend/src/services/api.ts`) que envia o token e faz logout ao receber 401
- **Gráficos:** Recharts (relatórios por categoria e por fonte/destino e projeção de saldo)
- **Backend:** Node.js, TypeScript e Express
- **Autenticação:** JWT e bcrypt
- **Banco de dados:** PostgreSQL
- **Ambiente de banco local:** Docker

## Pré-requisitos

- Node.js e npm (ambiente testado com Node.js 24)
- Docker instalado e em execução
- Git, para clonar o repositório

## Instalação do zero

> Os passos desta seção são para uma instalação **nova**, em que o banco ainda não foi inicializado. Se você já tem o contêiner e os dados do projeto, **não execute novamente** os scripts de criação e seed.

### 1. Obter o código

```bash
git clone https://github.com/ianderichalski/controle-financeiro.git
cd controle-financeiro
```

Use uma branch ou versão que contenha as funcionalidades que deseja executar. Durante o desenvolvimento, funcionalidades podem estar em branches distintas.

### 2. Criar um PostgreSQL local com Docker

O exemplo usa PostgreSQL 17 na porta **5433** do computador, para não conflitar com serviços locais que já utilizem 5432.

```bash
docker run -d \
  --name controle-financeiro-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=senha_local_exemplo \
  -e POSTGRES_DB=financas \
  -p 127.0.0.1:5433:5432 \
  -v controle-financeiro-pgdata:/var/lib/postgresql/data \
  postgres:17
```

A senha é um exemplo apenas para uso local; escolha outra em seu ambiente.

Aguarde o banco aceitar conexões:

```bash
docker exec controle-financeiro-db pg_isready -U postgres -d financas
```

### 3. Inicializar as tabelas e os dados de demonstração

**Somente em um banco novo e vazio**, a partir da raiz do projeto:

```bash
docker exec -i controle-financeiro-db \
  psql -v ON_ERROR_STOP=1 -U postgres -d financas < backend/database/schema.sql

docker exec -i controle-financeiro-db \
  psql -v ON_ERROR_STOP=1 -U postgres -d financas < backend/database/seed.sql
```

O `seed.sql` é destinado à demonstração e não deve ser executado duas vezes no mesmo banco. Ele inclui dados fictícios de setembro, outubro e novembro de 2026.

### 4. Configurar o backend

```bash
cd backend
npm ci
cp .env.example .env
```

Edite `backend/.env` de acordo com sua instalação:

```dotenv
PORT=3000
DATABASE_URL=postgres://postgres:senha_local_exemplo@localhost:5433/financas
JWT_SECRET=substitua-por-uma-chave-aleatoria-longa
JWT_EXPIRES_IN=1h
FRONTEND_URL=http://localhost:5173
```

**Não versione o arquivo `.env` ou credenciais reais.** O `.env.example` serve somente como referência. Se a senha do banco contiver caracteres especiais, faça a codificação apropriada para uma URL de conexão.

Para iniciar a API:

```bash
npm run typecheck
npm run dev
```

A API ficará disponível em **http://localhost:3000**.

### 5. Iniciar o frontend

Em outro terminal, na raiz do projeto:

```bash
cd frontend
npm ci
npm run dev
```

Abra **http://localhost:5173**. O frontend espera a API local em `http://localhost:3000`.

## Execuções posteriores

Se o contêiner já existe e está parado, inicie-o **sem recriar o banco nem rodar schema/seed**:

```bash
docker start controle-financeiro-db
```

Depois inicie o backend e o frontend em terminais separados com `npm run dev` em suas respectivas pastas.

## Usuários de demonstração

O `backend/database/seed.sql` cadastra dois usuários **fictícios**, apenas para ambiente de testes:

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Usuário Teste A | `demo.a@example.com` | `Teste12345` |
| Usuário Teste B | `demo.b@example.com` | `Teste12345` |

As credenciais acima não devem ser usadas fora da demonstração acadêmica.

## Funcionalidades

### Contas e autenticação

- Cadastro com validação de campos, CPF e unicidade de e-mail/CPF
- Hash de senhas com bcrypt
- Login com JWT e consulta ao usuário autenticado
- Rotas protegidas e acesso a registros vinculados ao usuário do token
- Categorias e conta padrão criadas no cadastro

### Gestão financeira

- CRUD de categorias
- CRUD de fontes e destinos (renda, conta e cartão de crédito)
- CRUD de lançamentos de entrada e saída
- Compras parceladas em cartões, com divisão do valor em centavos e vínculo entre parcelas
- Filtros por período, tipo, categoria e fonte/destino, paginação e totais (entradas, saídas e saldo)
- Dashboard com totais e lançamentos recentes

### Relatórios e projeções

- Relatório por categoria, com distribuição percentual, gráfico e comparação ao período anterior (um mês inteiro é comparado com o mês anterior inteiro; outros períodos, com os mesmos dias imediatamente antes)
- Relatório por fonte/destino: entradas por fonte, saídas por destino, saldo das contas no período, tabela e gráfico
- Previsão de faturas de cartão (fatura aberta e as próximas 3), datas de fechamento/vencimento, lançamentos com a parcela, limite utilizado e disponível
- Indicadores de saúde financeira, gráfico de projeção e dicas educativas

### Decisões de implementação

- **Parcelas:** todas as parcelas de uma compra guardam a data da compra; a fatura de cada uma é calculada com `calcularFatura(data, cartao, parcela_atual)`. Por isso, na listagem de lançamentos e nos relatórios por período, a compra aparece inteira no mês em que foi feita; a distribuição no tempo aparece nas faturas.
- **Funções utilitárias puras** (`cpfValido` em `models/cpf.ts` e `calcularFatura` em `models/fatura.ts`) ficam em `backend/src/models/`. As validações de entrada reutilizadas pelas rotas ficam em `backend/src/config/validacao.ts`.
- **Saúde financeira:** os indicadores usam os últimos 3 meses, incluindo o mês atual (ainda incompleto). A projeção usa a média mensal desses 3 meses (sempre dividida por 3) somada às parcelas já conhecidas, em visão de caixa: compras parceladas saem do saldo só quando cada parcela vence.
- **Regras das dicas** (constantes em `backend/src/models/saudeFinanceira.ts`):

| Regra | Limite | Dica |
| --- | --- | --- |
| Taxa de poupança dos últimos 3 meses | abaixo de 10% (`META_POUPANCA`) | alerta para guardar ao menos 10% |
| Comprometimento da renda com as próximas faturas | acima de 30% (`LIMITE_CARTOES`) | alerta de comprometimento |
| Parcelas a vencer | existe ao menos uma | informa o total e até quando vão |
| Saldo projetado | fica negativo em algum mês | alerta com o mês |

## Endpoints principais

A URL-base da API é `http://localhost:3000`.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `POST` | `/api/auth/cadastro` | Criar usuário |
| `POST` | `/api/auth/login` | Autenticar |
| `GET` | `/api/auth/me` | Consultar usuário autenticado |
| `GET`, `POST` | `/api/categorias` | Listar e criar categorias |
| `GET`, `PUT`, `DELETE` | `/api/categorias/:id` | Detalhar, editar e excluir categoria |
| `GET`, `POST` | `/api/fontes-destinos` | Listar e criar fontes/destinos |
| `GET`, `PUT`, `DELETE` | `/api/fontes-destinos/:id` | Detalhar, editar e excluir fonte/destino |
| `GET`, `POST` | `/api/lancamentos` | Listar (`?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=`) e criar lançamentos (com parcelas) |
| `GET`, `PUT`, `DELETE` | `/api/lancamentos/:id` | Detalhar, editar e excluir (`?todasParcelas=true`) |
| `GET` | `/api/relatorios/categorias` | Relatório por categoria (`?inicio=&fim=`) |
| `GET` | `/api/relatorios/fontes-destinos` | Relatório por fonte/destino (`?inicio=&fim=`) |
| `GET` | `/api/relatorios/faturas` | Previsão de faturas (`?meses=3`) |
| `GET` | `/api/saude-financeira` | Indicadores, projeção e dicas |

Todas as rotas, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`. Erros seguem o formato único `{ "erro": "...", "campos": { ... } }`.

## Verificações

Para conferir tipos no backend:

```bash
cd backend
npm run typecheck
```

Para conferir o lint e gerar o frontend de produção:

```bash
cd frontend
npm run lint
npm run build
```

Na demonstração, verifique também cadastro, login, isolamento de registros entre dois usuários, CRUDs financeiros, parcelamento, relatórios e visualização de faturas.

## Aviso

O conteúdo de saúde financeira é **educativo** e não substitui orientação financeira profissional. Os usuários e lançamentos fornecidos como exemplo são fictícios.