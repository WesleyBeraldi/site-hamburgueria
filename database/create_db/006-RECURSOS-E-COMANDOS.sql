USE hamburgueria;

-- Consultas de verificacao seguras.
SHOW TABLES;

SELECT
  TABLE_NAME AS tabela,
  TABLE_ROWS AS linhas_estimadas,
  TABLE_COLLATION AS collation_atual
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT
  rc.CONSTRAINT_NAME AS relacionamento,
  rc.TABLE_NAME AS tabela_origem,
  rc.REFERENCED_TABLE_NAME AS tabela_destino,
  rc.DELETE_RULE AS regra_exclusao
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME;

-- Exemplos de manutencao. Permanecem comentados para evitar perda acidental.
-- INSERT INTO categorias (nome, ordem, ativo) VALUES ('Nova categoria', 10, 1);
-- UPDATE categorias SET ativo = 0 WHERE id = 1;
-- DELETE FROM categorias WHERE id = 1;
--
-- Antes de qualquer DELETE real:
-- START TRANSACTION;
-- SELECT * FROM categorias WHERE id = 1 FOR UPDATE;
-- DELETE FROM categorias WHERE id = 1;
-- ROLLBACK; -- troque por COMMIT somente depois de conferir.

ANALYZE TABLE
  administradores, categorias, adicionais, produtos, promocoes,
  funcionarios, mesas, comandas, pedidos, pagamentos;
