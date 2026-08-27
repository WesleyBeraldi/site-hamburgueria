-- Verificações somente leitura para uma instalação já selecionada.

SELECT
  DATABASE() AS banco_selecionado,
  VERSION() AS versao_mysql,
  @@character_set_database AS charset_banco,
  @@collation_database AS collation_banco;

SELECT
  t.table_name AS tabela,
  t.engine AS mecanismo,
  t.table_collation AS collation_tabela
FROM information_schema.tables AS t
WHERE t.table_schema = DATABASE()
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

SELECT
  rc.constraint_name AS relacionamento,
  rc.table_name AS tabela_origem,
  rc.referenced_table_name AS tabela_destino,
  rc.delete_rule AS regra_exclusao,
  rc.update_rule AS regra_atualizacao
FROM information_schema.referential_constraints AS rc
WHERE rc.constraint_schema = DATABASE()
ORDER BY rc.table_name, rc.constraint_name;

SELECT
  sm.versao,
  sm.checksum,
  sm.executado_em
FROM schema_migrations AS sm
ORDER BY sm.executado_em, sm.versao;

SELECT
  e.id_estabelecimento,
  e.nome_fantasia,
  e.slug,
  e.dominio_personalizado,
  e.status,
  e.plano,
  e.status_assinatura,
  e.vencimento_assinatura_em,
  e.criado_em,
  e.atualizado_em
FROM estabelecimentos AS e
ORDER BY e.id_estabelecimento;

SELECT
  COUNT(*) AS configuracoes_sem_estabelecimento
FROM configuracoes_estabelecimento AS ce
LEFT JOIN estabelecimentos AS e
  ON e.id_estabelecimento = ce.id_estabelecimento
WHERE e.id_estabelecimento IS NULL;

SELECT
  CASE
    WHEN COUNT(*) = 23 THEN 'OK'
    ELSE CONCAT('REVISAR: ', COUNT(*), ' tabelas encontradas; eram esperadas 23')
  END AS resultado_estrutura
FROM information_schema.tables AS t
WHERE t.table_schema = DATABASE()
  AND t.table_type = 'BASE TABLE';
