-- Cria somente o banco da aplicacao. Execute com um usuario que possua
-- permissao CREATE DATABASE. A aplicacao deve usar um usuario restrito.

CREATE DATABASE IF NOT EXISTS hamburgueria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hamburgueria;

-- Sugestao para bancos antigos com outro collation:
-- ALTER DATABASE hamburgueria
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
