-- Carga inicial para a demonstração (seção 10.8: pelo menos 2 usuários e 3 meses de lançamentos).
-- As datas são relativas ao mês atual: os dados sempre cobrem os 3 meses anteriores e o mês corrente,
-- então o dashboard e os relatórios têm movimento em qualquer dia em que o seed for rodado.
--
-- Usuários (senha de ambos: Demo1234)
--   iande@demo.com  – perfil completo, com cartões e compras parceladas
--   luiz@demo.com   – perfil simples, usado para mostrar o isolamento entre usuários (RF3)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- crypt() / gen_salt() para o hash bcrypt das senhas

-- Funções auxiliares temporárias (somem ao fim da sessão) -----------------------------------

-- Data no mês "meses_atras" (0 = mês atual), no dia indicado (ajustado ao último dia do mês).
CREATE FUNCTION pg_temp.dia(meses_atras INT, dia INT) RETURNS DATE AS $$
  SELECT LEAST(
    (date_trunc('month', CURRENT_DATE) - meses_atras * INTERVAL '1 month')::date + (dia - 1),
    (date_trunc('month', CURRENT_DATE) - (meses_atras - 1) * INTERVAL '1 month')::date - 1
  );
$$ LANGUAGE SQL;

-- Lançamento à vista, buscando categoria e fonte/destino pelo nome.
CREATE FUNCTION pg_temp.lancar(p_usuario INT, p_tipo TEXT, p_descricao TEXT, p_valor NUMERIC, p_data DATE, p_categoria TEXT, p_fonte TEXT)
RETURNS VOID AS $$
  INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
  SELECT p_usuario, p_tipo, p_descricao, p_valor, p_data, c.id, f.id
    FROM categorias c, fontes_destinos f
   WHERE c.usuario_id = p_usuario AND c.nome = p_categoria AND c.tipo = p_tipo
     AND f.usuario_id = p_usuario AND f.nome = p_fonte;
$$ LANGUAGE SQL;

-- Compra parcelada: N lançamentos com a data da compra, divisão em centavos e a sobra na 1ª parcela.
CREATE FUNCTION pg_temp.parcelar(p_usuario INT, p_descricao TEXT, p_total NUMERIC, p_parcelas INT, p_data DATE, p_categoria TEXT, p_cartao TEXT)
RETURNS VOID AS $$
  WITH valores AS (
    SELECT FLOOR(p_total * 100 / p_parcelas)::INT AS base,                                  -- centavos por parcela
           (p_total * 100)::INT - FLOOR(p_total * 100 / p_parcelas)::INT * p_parcelas AS sobra, -- arredondamento
           gen_random_uuid() AS grupo
  )
  INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                           parcela_atual, total_parcelas, grupo_parcelamento)
  SELECT p_usuario, 'saida', p_descricao,
         (v.base + CASE WHEN n = 1 THEN v.sobra ELSE 0 END) / 100.0,
         p_data, c.id, f.id, n, p_parcelas, v.grupo
    FROM valores v, generate_series(1, p_parcelas) AS n, categorias c, fontes_destinos f
   WHERE c.usuario_id = p_usuario AND c.nome = p_categoria AND c.tipo = 'saida'
     AND f.usuario_id = p_usuario AND f.nome = p_cartao;
$$ LANGUAGE SQL;

-- 1. Usuários ------------------------------------------------------------------------------------
INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
  ('Iandê Richalski', 'iande@demo.com', '52998224725', crypt('Demo1234', gen_salt('bf', 10))),
  ('Luiz Felipe',     'luiz@demo.com',  '11144477735', crypt('Demo1234', gen_salt('bf', 10)));

-- 2. Categorias padrão (as mesmas que o cadastro cria) ------------------------------------------
INSERT INTO categorias (usuario_id, nome, tipo)
SELECT u.id, c.nome, c.tipo
  FROM usuarios u
 CROSS JOIN (VALUES
   ('Salário', 'entrada'), ('Outros', 'entrada'),
   ('Alimentação', 'saida'), ('Moradia', 'saida'), ('Saúde', 'saida'), ('Mobilidade', 'saida'),
   ('Lazer', 'saida'), ('Educação', 'saida'), ('Outros', 'saida')
 ) AS c(nome, tipo);

-- 3. Fontes e destinos ---------------------------------------------------------------------------
INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
SELECT u.id, f.nome, f.tipo, f.fechamento, f.vencimento, f.limite
  FROM usuarios u
  JOIN (VALUES
    ('iande@demo.com', 'Conta corrente', 'conta',          NULL::SMALLINT, NULL::SMALLINT, NULL::NUMERIC),
    ('iande@demo.com', 'Poupança',       'conta',          NULL,           NULL,           NULL),
    ('iande@demo.com', 'Nubank',         'cartao_credito', 3,              10,             6000.00), -- fecha 3, vence 10
    ('iande@demo.com', 'Visa',           'cartao_credito', 25,             5,              3000.00), -- fecha 25, vence 5 do mês seguinte
    ('luiz@demo.com',  'Conta corrente', 'conta',          NULL,           NULL,           NULL),
    ('luiz@demo.com',  'Cartão Inter',   'cartao_credito', 10,             17,             2000.00)
  ) AS f(email, nome, tipo, fechamento, vencimento, limite) ON f.email = u.email;

-- 4. Lançamentos ---------------------------------------------------------------------------------
DO $$
DECLARE
  iande INT := (SELECT id FROM usuarios WHERE email = 'iande@demo.com');
  luiz  INT := (SELECT id FROM usuarios WHERE email = 'luiz@demo.com');
  m INT;
BEGIN
  -- Rotina mensal da Iandê: 3 meses anteriores (m = 3, 2, 1) e o mês atual (m = 0).
  FOR m IN 0..3 LOOP
    PERFORM pg_temp.lancar(iande, 'entrada', 'Salário',                4800.00, pg_temp.dia(m, 5),  'Salário',     'Conta corrente');
    PERFORM pg_temp.lancar(iande, 'entrada', 'Rendimento da poupança',   38.50 + m, pg_temp.dia(m, 1), 'Outros',   'Poupança');
    PERFORM pg_temp.lancar(iande, 'saida',   'Aluguel',                 1400.00, pg_temp.dia(m, 10), 'Moradia',     'Conta corrente');
    PERFORM pg_temp.lancar(iande, 'saida',   'Conta de luz',             148.90 + m * 7, pg_temp.dia(m, 15), 'Moradia', 'Conta corrente');
    PERFORM pg_temp.lancar(iande, 'saida',   'Internet',                  99.90, pg_temp.dia(m, 12), 'Moradia',     'Conta corrente');
    PERFORM pg_temp.lancar(iande, 'saida',   'Academia',                  89.90, pg_temp.dia(m, 8),  'Saúde',       'Conta corrente');
    PERFORM pg_temp.lancar(iande, 'saida',   'Mercado do mês',           412.35 + m * 13, pg_temp.dia(m, 6), 'Alimentação', 'Nubank');
    PERFORM pg_temp.lancar(iande, 'saida',   'Feira e padaria',          186.40 - m * 9, pg_temp.dia(m, 19), 'Alimentação', 'Nubank');
    PERFORM pg_temp.lancar(iande, 'saida',   'Combustível',              210.00 - m * 15, pg_temp.dia(m, 14), 'Mobilidade', 'Nubank');
    PERFORM pg_temp.lancar(iande, 'saida',   'Curso de inglês',          129.00, pg_temp.dia(m, 2),  'Educação',    'Nubank');
    PERFORM pg_temp.lancar(iande, 'saida',   'Streaming',                 55.90, pg_temp.dia(m, 9),  'Lazer',       'Visa');
    PERFORM pg_temp.lancar(iande, 'saida',   'Restaurante',               96.00 + m * 21, pg_temp.dia(m, 22), 'Alimentação', 'Visa');
  END LOOP;

  -- Variações para os relatórios terem diferenças entre um mês e outro.
  PERFORM pg_temp.lancar(iande, 'entrada', 'Freelance – site',         950.00, pg_temp.dia(2, 20), 'Outros',     'Conta corrente');
  PERFORM pg_temp.lancar(iande, 'entrada', 'Freelance – manutenção',   600.00, pg_temp.dia(0, 4),  'Outros',     'Conta corrente');
  PERFORM pg_temp.lancar(iande, 'saida',   'Consulta médica',          250.00, pg_temp.dia(3, 17), 'Saúde',      'Conta corrente');
  PERFORM pg_temp.lancar(iande, 'saida',   'Farmácia',                  74.60, pg_temp.dia(1, 18), 'Saúde',      'Visa');
  PERFORM pg_temp.lancar(iande, 'saida',   'Uber',                      43.20, pg_temp.dia(1, 23), 'Mobilidade', 'Visa');
  PERFORM pg_temp.lancar(iande, 'saida',   'Show',                     180.00, pg_temp.dia(1, 28), 'Lazer',      'Visa');
  PERFORM pg_temp.lancar(iande, 'saida',   'Livro técnico',             89.00, pg_temp.dia(0, 7),  'Educação',   'Nubank');
  PERFORM pg_temp.lancar(iande, 'saida',   'Presente de aniversário',  140.00, pg_temp.dia(2, 26), 'Outros',     'Visa');

  -- Compras parceladas no cartão (aparecem na previsão de faturas).
  PERFORM pg_temp.parcelar(iande, 'Notebook',          3500.00, 10, pg_temp.dia(2, 12), 'Educação', 'Nubank');
  PERFORM pg_temp.parcelar(iande, 'Celular',           1200.00,  3, pg_temp.dia(1, 27), 'Outros',   'Visa');   -- depois do fechamento (25)
  PERFORM pg_temp.parcelar(iande, 'Tênis de corrida',   359.99,  2, pg_temp.dia(0, 3),  'Saúde',    'Nubank'); -- no dia do fechamento (3)

  -- Luiz: perfil simples, só para o teste de isolamento.
  FOR m IN 0..3 LOOP
    PERFORM pg_temp.lancar(luiz, 'entrada', 'Salário', 3200.00, pg_temp.dia(m, 5),  'Salário',     'Conta corrente');
    PERFORM pg_temp.lancar(luiz, 'saida',   'Aluguel',   950.00, pg_temp.dia(m, 10), 'Moradia',     'Conta corrente');
    PERFORM pg_temp.lancar(luiz, 'saida',   'Mercado',   520.00 - m * 20, pg_temp.dia(m, 16), 'Alimentação', 'Cartão Inter');
  END LOOP;
  PERFORM pg_temp.parcelar(luiz, 'Bicicleta', 900.00, 3, pg_temp.dia(1, 5), 'Mobilidade', 'Cartão Inter');
END $$;

COMMIT;