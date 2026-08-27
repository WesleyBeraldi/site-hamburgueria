-- ============================================================
-- SISTEMA DA HAMBURGUERIA - ORDEM DE CRIACAO DO BANCO
-- MySQL 8.0+
-- ============================================================
-- Execute os arquivos desta pasta, no MySQL Workbench, nesta ordem:
--   001-CRIAR-BD.sql
--   002-CRIAR-TABELAS.sql
--   003-DEFINIR-RELACIONAMENTOS.sql
--   004-INSERT-REGISTROS-ESSENCIAIS.sql
--   005-INSERT-REGISTROS-DEMONSTRACAO.sql (opcional e desativado)
--   006-RECURSOS-E-COMANDOS.sql
--
-- Os scripts criam uma instalacao limpa. Eles NAO apagam nem exportam
-- os dados reais de um banco existente.
-- Nunca execute comandos DELETE/DROP em producao sem uma copia valida.

SET NAMES utf8mb4;
SET time_zone = '-03:00';

SELECT 'Leia as instrucoes e execute os arquivos numerados em ordem.' AS orientacao;
