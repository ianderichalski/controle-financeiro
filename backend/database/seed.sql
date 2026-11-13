
BEGIN;

-- Habilita funções para gerar hashes bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Usuários fictícios para testes.
INSERT INTO usuarios (nome, email, cpf, senha_hash)
VALUES
(
    'Usuário Teste A',
    'demo.a@example.com',
    '52998224725',
    crypt('Teste12345', gen_salt('bf', 10))
),
(
    'Usuário Teste B',
    'demo.b@example.com',
    '11144477735',
    crypt('Teste12345', gen_salt('bf', 10))
);

-- 2. Categorias para cada usuário.
INSERT INTO categorias (usuario_id, nome, tipo)
SELECT u.id, c.nome, c.tipo
FROM usuarios u
CROSS JOIN (
    VALUES
        ('Salário', 'entrada'),
        ('Outros', 'entrada'),
        ('Alimentação', 'saida'),
        ('Moradia', 'saida'),
        ('Lazer', 'saida'),
        ('Saúde', 'saida')
) AS c(nome, tipo)
WHERE u.email IN (
    'demo.a@example.com',
    'demo.b@example.com'
);

-- 3. Fontes e destinos.
INSERT INTO fontes_destinos (
    usuario_id, nome, tipo,
    dia_fechamento, dia_vencimento, limite
)
SELECT u.id, f.nome, f.tipo,
       f.fechamento, f.vencimento, f.limite
FROM usuarios u
CROSS JOIN (
    VALUES
        (
            'Conta corrente',
            'conta',
            NULL::SMALLINT,
            NULL::SMALLINT,
            NULL::NUMERIC
        ),
        (
            'Cartão de crédito',
            'cartao_credito',
            3::SMALLINT,
            10::SMALLINT,
            2500.00::NUMERIC
        )
) AS f(nome, tipo, fechamento, vencimento, limite)
WHERE u.email IN (
    'demo.a@example.com',
    'demo.b@example.com'
);

-- 4. Lançamentos de setembro, outubro e novembro.
INSERT INTO lancamentos (
    usuario_id, tipo, descricao, valor, data,
    categoria_id, fonte_destino_id
)
SELECT
    u.id,
    t.tipo,
    t.descricao || ' ' || m.mes || '/2026',
    CASE
        WHEN u.email = 'demo.a@example.com'
        THEN t.valor_a
        ELSE t.valor_b
    END,
    make_date(2026, m.mes, t.dia),
    c.id,
    f.id
FROM usuarios u
CROSS JOIN generate_series(9, 11) AS m(mes)
CROSS JOIN (
    VALUES
        ('entrada', 'Salário', 'Salário mensal',
         5, 2800.00::NUMERIC, 2200.00::NUMERIC),
        ('saida', 'Moradia', 'Aluguel',
         10, 800.00::NUMERIC, 650.00::NUMERIC),
        ('saida', 'Alimentação', 'Mercado',
         16, 350.00::NUMERIC, 300.00::NUMERIC)
) AS t(tipo, categoria, descricao, dia, valor_a, valor_b)
JOIN categorias c
    ON c.usuario_id = u.id
    AND c.nome = t.categoria
    AND c.tipo = t.tipo
JOIN fontes_destinos f
    ON f.usuario_id = u.id
    AND f.nome = 'Conta corrente'
WHERE u.email IN (
    'demo.a@example.com',
    'demo.b@example.com'
);

-- 5. Compra parcelada: R$ 100,00 em 3 vezes.
INSERT INTO lancamentos (
    usuario_id, tipo, descricao, valor, data,
    categoria_id, fonte_destino_id,
    parcela_atual, total_parcelas, grupo_parcelamento
)
SELECT
    u.id,
    'saida',
    'Compra parcelada - exemplo',
    p.valor,
    '2026-10-02'::DATE,
    c.id,
    f.id,
    p.numero,
    3,
    '6b343e3b-bbda-41ff-964c-eed4824139a1'::UUID
FROM usuarios u
JOIN categorias c
    ON c.usuario_id = u.id
    AND c.nome = 'Lazer'
    AND c.tipo = 'saida'
JOIN fontes_destinos f
    ON f.usuario_id = u.id
    AND f.nome = 'Cartão de crédito'
CROSS JOIN (
    VALUES
        (1, 33.34::NUMERIC),
        (2, 33.33::NUMERIC),
        (3, 33.33::NUMERIC)
) AS p(numero, valor)
WHERE u.email = 'demo.a@example.com';

COMMIT;
