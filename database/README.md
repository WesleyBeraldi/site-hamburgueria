# Banco de dados

Esta pasta é a fonte versionada da estrutura MySQL. A fundação multiempresa
possui `estabelecimentos`, `configuracoes_estabelecimento` e escopo
`id_estabelecimento` nas tabelas de negócio. As migrations preservam os dados
atuais associando-os a um estabelecimento padrão. Até o isolamento do backend
ser concluído, a aplicação continua operando como instalação de uma única
hamburgueria.

## Fundação multiempresa

`estabelecimentos` é a entidade global que guarda nome, slug, domínio
personalizado, estado operacional, plano e situação da assinatura. `slug` é
obrigatório e único; o domínio personalizado também é único quando informado e
deve ser gravado como `NULL` quando não existir.

`configuracoes_estabelecimento` mantém uma configuração individual por
estabelecimento. Ela contém URLs de logo/banner, a paleta visual padrão, fonte,
contatos, endereço, horários, opções de atendimento e pagamento e textos
operacionais. Imagens permanecem fora do MySQL; somente URLs e caminhos são
armazenados. A futura API deverá validar a fonte contra uma lista permitida e
nunca aceitar CSS, HTML ou JavaScript arbitrários.

A separação foi aplicada somente a dados de negócio. `schema_migrations` e
`metadados` permanecem globais; a própria tabela `estabelecimentos` é o registro
global dos tenants. As demais 19 tabelas atuais recebem o escopo diretamente,
inclusive itens e sessões, para permitir filtros simples e auditoria sem
depender apenas de relacionamentos indiretos. A tabela `configuracoes` é mantida
como compatibilidade temporária, enquanto `configuracoes_estabelecimento` é o
modelo definitivo.

As colunas novas permanecem nullable de forma intencional nesta fase. Isso
mantém compatibilidade com o backend anterior durante uma implantação gradual.
Depois que todas as leituras e escritas forem isoladas pelo backend, uma
migration posterior deverá confirmar ausência de nulos, tornar as colunas
obrigatórias e substituir unicidades globais por restrições compostas quando
necessário.

## Instalação nova pelo MySQL Workbench

1. Crie um schema vazio pelo painel do provedor ou selecione o schema já fornecido.
2. Faça login nesse schema e execute `CRIAR_db.sql` completo uma única vez.
3. Configure a conta restrita da aplicação no `.env`.
4. Defina uma senha administrativa forte e execute
   `npm run criar-admin-inicial`.
5. Valide com `npm run db:check` e, no Workbench, execute
   `verificacoes/001_verificar_instalacao.sql`.

`CRIAR_db.sql` contém tabelas, índices, relacionamentos e apenas os dados
iniciais não sensíveis. Ele não contém estabelecimento, conta administrativa
nem dados demonstrativos.

Se preferir executar os módulos menores no schema já selecionado, use nesta
ordem os arquivos de `estrutura/` e depois `seeds/001_dados_iniciais.sql`:

1. `estrutura/001_criar_tabelas.sql`;
2. `estrutura/003_criar_indices.sql`;
3. `estrutura/002_criar_relacionamentos.sql`;
4. `seeds/001_dados_iniciais.sql`.

## Preparação local explícita

`npm run db:prepare` é uma conveniência para um banco novo e vazio. Em
desenvolvimento ele pode criar o schema ausente, aplica a estrutura e cria o
primeiro administrador a partir do `.env`. O comando recusa qualquer schema que
já contenha tabelas, evitando que uma reinstalação altere dados existentes.

Dados fictícios são opt-in: somente `SEED_DEMO_DATA=1` faz o preparo inserir o
catálogo e a operação de demonstração. Use essa opção apenas em ambiente
descartável; ela deve permanecer desativada em produção.

O servidor (`npm run dev`, `npm start`) apenas abre e valida a conexão. Ele não
cria banco, tabelas, índices, relacionamentos, usuários ou seeds no startup.

## Banco existente e migrations

Nunca execute `CRIAR_db.sql` em um banco persistente. Antes de alterar um banco
existente:

1. crie um backup e teste a restauração em ambiente isolado;
2. valide as variáveis com `npm run db:check`;
3. revise as migrations pendentes em `migrations/`;
4. execute `npm run db:migrate` em uma janela controlada;
5. rode as consultas de `verificacoes/` e os testes da aplicação.

Para migrar a instalação atual, mantenha a aplicação sem novas escritas e use a
ordem registrada pelo runner:

1. `001_adicionar_estabelecimentos.sql` cria a fundação;
2. `002_adicionar_escopo_estabelecimento.sql` adiciona colunas nullable;
3. `003_relacionar_dados_estabelecimento.sql` cria o estabelecimento padrão,
   copia a configuração e associa todos os registros existentes;
4. `004_adicionar_integridade_estabelecimento.sql` cria índices e FKs;
5. `verificacoes/002_verificar_migracao_estabelecimento.sql` deve retornar zero
   para todos os registros sem escopo e relacionamentos divergentes.

Não aplique essas migrations em produção enquanto o deploy do backend
multiempresa não estiver preparado. Nesta etapa os arquivos foram somente
versionados e verificados estaticamente; nenhum banco foi alterado.

Novas migrations usam o formato `NNN_descricao.sql`. O runner registra nome e
checksum em `schema_migrations` e interrompe a execução se uma migration já
registrada tiver sido modificada. DDL do MySQL pode efetuar commit implícito;
uma migration deve ser pequena, revisada, idempotente quando possível e
acompanhada de estratégia de recuperação. O histórico em `migrations/legado/`
é documental e não é executado automaticamente.

Uma instalação feita por `CRIAR_db.sql` já contém a estrutura final e registra
os checksums das migrations incorporadas. `npm run db:prepare` faz o mesmo para
um schema local vazio. Assim, o runner não tenta reaplicar alterações de coluna
em uma instalação nova.

## TLS e segredos

- Nunca versione `.env`, senha, token, chave privada ou backup real.
- Use uma conta MySQL exclusiva, com acesso somente ao schema da aplicação.
- Mantenha a conta da aplicação apenas com permissões operacionais. Para
  migrations, forneça temporariamente ao comando uma credencial de manutenção
  com os privilégios DDL estritamente necessários e retire-a depois.
- Para MySQL remoto, habilite `DB_SSL=true` e informe em `DB_SSL_CA` o conteúdo
  PEM da CA ou o caminho para o certificado. A validação do certificado não é
  desativada.
- `SYNC_ADMIN_CREDENTIALS=1` pode atualizar a primeira conta administrativa;
  use-o apenas de forma pontual e volte a `0` após a recuperação controlada.
