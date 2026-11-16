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
- **Requisições HTTP:** Axios (autenticação e telas de faturas/saúde financeira) e Fetch (telas financeiras)
- **Gráficos de saúde financeira:** Recharts
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
- Filtros por data e tipo e paginação na listagem
- Dashboard com totais e lançamentos recentes

### Relatórios e projeções

- Relatório por categoria, com distribuição percentual e comparação ao período anterior
- Previsão de faturas de cartão, datas de fechamento/vencimento, limite utilizado e disponível
- Indicadores de saúde financeira, gráfico de projeção e dicas educativas

**Situação da integração:** o modelo de relatório por fonte/destino (RF8) existe, mas sua rota e interface não fazem parte da versão integrada descrita aqui. Esta documentação deve ser atualizada quando a funcionalidade for concluída.

## Endpoints principais

A URL-base da API é `http://localhost:3000`.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `POST` | `/api/auth/cadastro` | Criar usuário |
| `POST` | `/api/auth/login` | Autenticar |
| `GET` | `/api/auth/me` | Consultar usuário autenticado |
| `GET`, `POST` | `/api/categorias` | Listar e criar categorias |
| `GET`, `POST` | `/api/fontes-destinos` | Listar e criar fontes/destinos |
| `GET`, `POST` | `/api/lancamentos` | Listar e criar lançamentos |
| `GET` | `/api/relatorios/categorias` | Relatório por categoria |
| `GET` | `/api/relatorios/faturas` | Previsão de faturas (`?meses=3`) |
| `GET` | `/api/saude-financeira` | Indicadores, projeção e dicas |

As operações financeiras exigem o cabeçalho `Authorization: Bearer <token>`. As rotas de edição/exclusão de recursos utilizam seus identificadores.

## Verificações

Para conferir tipos no backend:

```bash
cd backend
npm run typecheck
```

Para gerar o frontend de produção:

```bash
cd frontend
npm run build
```

Na demonstração, verifique também cadastro, login, isolamento de registros entre dois usuários, CRUDs financeiros, parcelamento, relatórios e visualização de faturas.

## Aviso

O conteúdo de saúde financeira é **educativo** e não substitui orientação financeira profissional. Os usuários e lançamentos fornecidos como exemplo são fictícios.
