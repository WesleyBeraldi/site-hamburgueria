-- Dados mínimos e não sensíveis da instalação atual.

START TRANSACTION;

-- Em instalações novas, a estrutura final já incorpora estas migrations.
-- Os checksums impedem que o runner tente reaplicar ALTERs sobre o schema novo.
INSERT INTO schema_migrations (versao, checksum) VALUES
  ('001_adicionar_estabelecimentos.sql', 'fe5a3c02b5519e7a7b6007f4d6c180cf54d18cf78f640d41e3161d45b4c3a10c'),
  ('002_adicionar_escopo_estabelecimento.sql', '379ac9882c45d603cd978ea0900f89a680ffff820ef49f8539d023e0ce45963c'),
  ('003_relacionar_dados_estabelecimento.sql', '62f6e86e05a80b98fa1ce6cfa4f0e423893944ec8290810c0abe052f2673e4bc'),
  ('004_adicionar_integridade_estabelecimento.sql', 'c8e52b9245f1ab2866718e979e118249cf0118f809ecf41a76b4c4191f577a46')
ON DUPLICATE KEY UPDATE versao = VALUES(versao);

INSERT INTO categorias (id, nome, ordem, ativo) VALUES
  (1, 'Hambúrgueres', 1, 1),
  (2, 'Combos', 2, 1),
  (3, 'Porções', 3, 1),
  (4, 'Bebidas', 4, 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome), ordem = VALUES(ordem);

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

INSERT INTO metadados (chave, valor) VALUES
  ('catalogo_inicial_criado', '1'),
  ('operacao_inicial_criada', '1')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

COMMIT;
