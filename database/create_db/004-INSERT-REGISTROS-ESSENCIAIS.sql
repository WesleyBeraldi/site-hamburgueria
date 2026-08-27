USE hamburgueria;

START TRANSACTION;

-- Categorias iniciais preservam a compatibilidade com o catalogo existente.
INSERT INTO categorias (id, nome, ordem, ativo) VALUES
  (1, 'Hambúrgueres', 1, 1),
  (2, 'Combos', 2, 1),
  (3, 'Porções', 3, 1),
  (4, 'Bebidas', 4, 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome), ordem = VALUES(ordem);

-- A loja nasce fechada e sem dados ficticios. Preencha tudo pelo painel.
INSERT INTO configuracoes (
  id, nome_loja, telefone, email, endereco, taxa_entrega_centavos,
  tempo_entrega, pedido_minimo_centavos, loja_aberta, entrega_ativa,
  retirada_ativa, aceita_cartao, aceita_dinheiro
) VALUES (
  1, '', '', '', '', 0,
  '', 0, 0, 0,
  0, 0, 0
)
ON DUPLICATE KEY UPDATE id = VALUES(id);

-- Impede que o bootstrap inclua dados demonstrativos nesta instalacao limpa.
INSERT INTO metadados (chave, valor) VALUES
  ('catalogo_inicial_criado', '1'),
  ('operacao_inicial_criada', '1')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

COMMIT;
