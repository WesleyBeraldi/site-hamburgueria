CREATE TABLE IF NOT EXISTS metadados (
  chave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administradores (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessoes_admin (
  token_hash CHAR(64) PRIMARY KEY,
  administrador_id BIGINT UNSIGNED NOT NULL,
  expira_em DATETIME(3) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessoes_admin_administrador
    FOREIGN KEY (administrador_id) REFERENCES administradores(id) ON DELETE CASCADE,
  INDEX idx_sessoes_admin_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adicionais (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  preco_centavos INT UNSIGNED NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produtos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT NOT NULL,
  preco_centavos INT UNSIGNED NOT NULL,
  imagem_url VARCHAR(500),
  destaque VARCHAR(100),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produtos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_produtos_categoria (categoria_id),
  INDEX idx_produtos_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produto_adicionais (
  produto_id BIGINT UNSIGNED NOT NULL,
  adicional_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (produto_id, adicional_id),
  CONSTRAINT fk_produto_adicionais_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  CONSTRAINT fk_produto_adicionais_adicional
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE CASCADE,
  INDEX idx_produto_adicionais_adicional (adicional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promocoes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id BIGINT UNSIGNED,
  nome VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  preco_anterior_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  preco_centavos INT UNSIGNED NOT NULL,
  imagem_url VARCHAR(500),
  destaque VARCHAR(100),
  tipo VARCHAR(100),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  inicio_em DATETIME,
  fim_em DATETIME,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_promocoes_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  INDEX idx_promocoes_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS funcionarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  cargo VARCHAR(80) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  token_acesso VARCHAR(160) NOT NULL UNIQUE,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_funcionarios_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessoes_garcom (
  token_hash CHAR(64) PRIMARY KEY,
  funcionario_id BIGINT UNSIGNED NOT NULL,
  expira_em DATETIME(3) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessoes_garcom_funcionario
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE,
  INDEX idx_sessoes_garcom_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mesas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(10) NOT NULL UNIQUE,
  lugares INT UNSIGNED NOT NULL DEFAULT 4,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comandas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mesa_id BIGINT UNSIGNED NOT NULL,
  funcionario_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Aberta',
  pagamento VARCHAR(40),
  aberta_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrada_em DATETIME,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comandas_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id),
  CONSTRAINT fk_comandas_funcionario
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
  INDEX idx_comandas_mesa_status (mesa_id, status),
  INDEX idx_comandas_funcionario (funcionario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda_itens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comanda_id BIGINT UNSIGNED NOT NULL,
  produto_id BIGINT UNSIGNED,
  nome_produto VARCHAR(160) NOT NULL,
  preco_unitario_centavos INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL,
  observacao TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comanda_itens_comanda
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
  CONSTRAINT fk_comanda_itens_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  INDEX idx_comanda_itens_comanda (comanda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda_item_adicionais (
  comanda_item_id BIGINT UNSIGNED NOT NULL,
  adicional_id BIGINT UNSIGNED,
  nome_adicional VARCHAR(120) NOT NULL,
  preco_centavos INT UNSIGNED NOT NULL,
  PRIMARY KEY (comanda_item_id, nome_adicional),
  CONSTRAINT fk_comanda_item_adicionais_item
    FOREIGN KEY (comanda_item_id) REFERENCES comanda_itens(id) ON DELETE CASCADE,
  CONSTRAINT fk_comanda_item_adicionais_adicional
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_acompanhamento_hash CHAR(64),
  chave_idempotencia_hash CHAR(64),
  origem VARCHAR(20) NOT NULL,
  cliente VARCHAR(160) NOT NULL,
  telefone VARCHAR(40) NOT NULL,
  email VARCHAR(160),
  status VARCHAR(40) NOT NULL DEFAULT 'Recebido',
  pagamento VARCHAR(40) NOT NULL,
  rua VARCHAR(180),
  numero VARCHAR(30),
  bairro VARCHAR(120),
  complemento VARCHAR(160),
  referencia VARCHAR(255),
  taxa_entrega_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  total_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  comanda_id BIGINT UNSIGNED,
  mesa_id BIGINT UNSIGNED,
  funcionario_id BIGINT UNSIGNED,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_comanda
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedidos_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedidos_funcionario
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE SET NULL,
  UNIQUE KEY uk_pedidos_comanda (comanda_id),
  UNIQUE KEY uk_pedidos_chave_idempotencia (chave_idempotencia_hash),
  INDEX idx_pedidos_criado_em (criado_em),
  INDEX idx_pedidos_status (status),
  INDEX idx_pedidos_token_acompanhamento (token_acompanhamento_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  produto_id BIGINT UNSIGNED,
  promocao_id BIGINT UNSIGNED,
  nome_produto VARCHAR(160) NOT NULL,
  descricao_produto TEXT,
  imagem_url VARCHAR(500),
  preco_unitario_centavos INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL,
  observacao TEXT,
  CONSTRAINT fk_pedido_itens_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_itens_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  CONSTRAINT fk_pedido_itens_promocao
    FOREIGN KEY (promocao_id) REFERENCES promocoes(id) ON DELETE SET NULL,
  INDEX idx_pedido_itens_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_item_adicionais (
  pedido_item_id BIGINT UNSIGNED NOT NULL,
  adicional_id BIGINT UNSIGNED,
  nome_adicional VARCHAR(120) NOT NULL,
  preco_centavos INT UNSIGNED NOT NULL,
  PRIMARY KEY (pedido_item_id, nome_adicional),
  CONSTRAINT fk_pedido_item_adicionais_item
    FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_item_adicionais_adicional
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED,
  comanda_id BIGINT UNSIGNED,
  forma VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Aguardando pagamento',
  valor_centavos INT UNSIGNED NOT NULL,
  pix_chave VARCHAR(180),
  pix_beneficiario VARCHAR(160),
  sem_troco TINYINT(1),
  troco_para_centavos INT UNSIGNED,
  pago_em DATETIME,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagamentos_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pagamentos_comanda
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE SET NULL,
  INDEX idx_pagamentos_pedido (pedido_id),
  INDEX idx_pagamentos_comanda (comanda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracoes (
  id TINYINT UNSIGNED PRIMARY KEY,
  nome_loja VARCHAR(160) NOT NULL,
  telefone VARCHAR(40) NOT NULL,
  email VARCHAR(160) NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  taxa_entrega_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  tempo_entrega VARCHAR(60) NOT NULL,
  pedido_minimo_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  loja_aberta TINYINT(1) NOT NULL DEFAULT 1,
  pix_chave VARCHAR(180),
  pix_beneficiario VARCHAR(160),
  logo_url VARCHAR(500),
  whatsapp VARCHAR(40),
  horario_funcionamento TEXT,
  instagram_url VARCHAR(500),
  facebook_url VARCHAR(500),
  entrega_ativa TINYINT(1) NOT NULL DEFAULT 1,
  aceita_cartao TINYINT(1) NOT NULL DEFAULT 1,
  aceita_dinheiro TINYINT(1) NOT NULL DEFAULT 1,
  areas_entrega_json JSON,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
