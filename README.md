# Sistema da Hamburgueria

Aplicação responsiva com três áreas integradas: cliente, administrador e garçom. O frontend usa React e a API Node.js persiste os dados em um MySQL Server que pode ser administrado pelo MySQL Workbench.

## Recursos conectados ao MySQL

- login e sessões do administrador;
- múltiplos administradores, troca segura de senha e auditoria das ações críticas;
- categorias administráveis, produtos, fotos, adicionais e vínculos por produto;
- promoções exibidas no site;
- pedidos de delivery e retirada, itens, adicionais, pagamentos e acompanhamento;
- confirmação manual e idempotente de pagamentos, cancelamento e estorno com autor e horário;
- funcionários com PIN protegido por `scrypt` e token individual para QR Code;
- sessões do garçom, mesas, comandas e itens da comanda;
- vínculo automático entre garçom, mesa, comanda e pedido do salão;
- identidade e operação da lanchonete: nome, logo, contatos, horário, redes sociais, status, delivery, áreas, taxas, mínimo e pagamentos;
- dados de dashboard e relatórios calculados a partir dos registros compartilhados.

O carrinho permanece no navegador somente até o cliente finalizar a compra. Ao abrir o carrinho e antes do checkout, a API remove itens indisponíveis e atualiza preço, promoção e adicionais. Na criação do pedido, o servidor recalcula tudo novamente, inclusive taxa por bairro e pedido mínimo, e grava pedido, itens e pagamento na mesma transação. Cada tentativa leva uma chave idempotente para que reenvios não criem pedidos duplicados.

## Requisitos

- Node.js 22.13 ou superior;
- npm;
- MySQL Server 8.0 em execução;
- MySQL Workbench opcional para visualizar e administrar o banco.

## Configuração do MySQL Workbench

1. Abra a conexão local, normalmente `Local instance MySQL80`.
2. Confirme que o servidor está disponível em `127.0.0.1:3306`.
3. Na pasta do projeto, crie a configuração local:

```powershell
Copy-Item .env.example .env
```

4. No editor SQL conectado como administrador, crie bancos separados para a aplicação e para os testes, além de um usuário restrito:

```sql
CREATE DATABASE IF NOT EXISTS hamburgueria
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS hamburgueria_testes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'hamburgueria_app'@'localhost'
  IDENTIFIED BY 'troque-por-uma-senha-local-segura';
GRANT ALL PRIVILEGES ON hamburgueria.*
  TO 'hamburgueria_app'@'localhost';
GRANT ALL PRIVILEGES ON hamburgueria_testes.*
  TO 'hamburgueria_app'@'localhost';
FLUSH PRIVILEGES;
```

5. Edite o `.env` com a conta exclusiva da aplicação, usando a mesma senha definida no SQL:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=hamburgueria_app
DB_PASSWORD=sua-senha-local-da-aplicacao
DB_NAME=hamburgueria

ADMIN_USER=admin
ADMIN_EMAIL=admin@hamburgueria.com
ADMIN_PASSWORD=uma-senha-administrativa-segura
```

O `.env` é ignorado pelo Git. Nunca envie senhas ao repositório.

`ADMIN_PASSWORD` é obrigatório também em desenvolvimento; o projeto não contém senha administrativa padrão no código.
Ele cria a primeira conta quando o banco ainda não possui administradores. Para forçar uma redefinição controlada da conta inicial, use temporariamente `SYNC_ADMIN_CREDENTIALS=1` em uma única inicialização e volte a `0`; assim, alterações de senha feitas no painel não são sobrescritas a cada reinício.

Em desenvolvimento, a API pode criar o banco ausente. Em produção, o banco deve ser provisionado antes da primeira inicialização; a aplicação cria ou atualiza as tabelas dentro dele, mas não solicita privilégio global de `CREATE DATABASE`. O arquivo [`server/schema.mysql.sql`](server/schema.mysql.sql) também pode ser aberto no Workbench para consultar o esquema completo. O backend não precisa armazenar a senha do usuário `root`.

## Executar localmente

```bash
npm install
npm run dev
```

Esse comando inicia a API e o site juntos. O frontend normalmente fica em `http://localhost:5173` e a API em `http://localhost:3001`.

## Acessos iniciais

- Cliente: `/`
- Política de privacidade: `/politica-de-privacidade`
- Termos de uso: `/termos-de-uso`
- Administrador: `/admin/login`, com as credenciais definidas em `ADMIN_USER` e `ADMIN_PASSWORD`
- Garçom: cadastre o funcionário no painel administrativo e abra o QR Code individual por esse painel

Em desenvolvimento, o banco pode receber dados demonstrativos. Em produção eles ficam desativados por padrão: a loja nasce fechada, sem produtos, adicionais, promoções, funcionários ou pedidos fictícios. Use `SEED_DEMO_DATA=1` somente em ambientes descartáveis. Os tokens demonstrativos são aleatórios e, sem `DEMO_WAITER_PIN`, o PIN inicial também é aleatório: defina um novo PIN no painel antes de usar esse funcionário. Se precisar de um PIN conhecido em um ambiente descartável, configure explicitamente `DEMO_WAITER_PIN` com 4 a 6 dígitos. Contas demonstrativas legadas com credenciais conhecidas são revogadas automaticamente e devem ser redefinidas pelo administrador. PINs são armazenados como hash, e tokens de acesso só aparecem em rotas administrativas autenticadas. O QR Code identifica o funcionário, mas a sessão só é criada depois da validação do PIN.

## Comandos

```bash
npm run dev       # frontend e backend
npm run dev:web   # somente frontend
npm run dev:api   # somente backend
npm run db:backup # backup consistente com mysqldump
npm run db:restore -- caminho/backup.sql # restauração com confirmação explícita
npm run lint      # análise estática
npm test          # testes puros e integração MySQL quando DB_PASSWORD estiver definido
npm run build     # frontend de produção
npm start         # API, uploads e frontend já compilado
```

Os testes de integração usam e removem o banco isolado `hamburgueria_testes`. Eles nunca usam o banco `hamburgueria` como alvo de limpeza. A permissão sobre `hamburgueria_testes.*` permanece registrada no MySQL, permitindo que o banco seja recriado na próxima execução.

## Rotas principais da API

### Públicas

- `GET /api/saude`
- `GET /api/catalogo`
- `GET /api/publico/inicial`
- `POST /api/pedidos`
- `POST /api/carrinho/validar`
- `GET /api/pedidos/:codigo?token=...`

### Administrador

- `POST /api/admin/login`
- `GET|DELETE /api/admin/sessao`
- `GET /api/admin/dados`
- CRUD de `/api/admin/produtos`, `/api/admin/adicionais`, `/api/admin/promocoes` e `/api/admin/funcionarios`
- criação/edição/status de `/api/admin/categorias`
- criação/status de `/api/admin/administradores` e `PUT /api/admin/senha`
- `PATCH /api/admin/pedidos/:codigo/status`
- `POST /api/admin/pedidos/:codigo/pagamento/confirmar`
- `POST /api/admin/pedidos/:codigo/pagamento/estornar`
- `PUT /api/admin/configuracao`

### Garçom

- `POST /api/garcom/login`
- `GET|DELETE /api/garcom/sessao`
- `GET /api/garcom/dados`
- abertura de comanda, inclusão/remoção de itens, envio à cozinha, solicitação de conta e fechamento em `/api/garcom/comandas/...`

## Produção

Defina `NODE_ENV=production`, `ADMIN_PASSWORD` com pelo menos 12 caracteres e todas as variáveis `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. Use uma conta MySQL com acesso somente ao banco já provisionado da aplicação. Antes de abrir pedidos, cadastre o cardápio e preencha **Configurações** com identidade, contatos, horário, áreas atendidas, taxas, mínimo e pagamentos reais. O Pix só aparece com chave, beneficiário e cidade; o QR Code BR Code é montado a partir desses dados, do total recalculado e do identificador real do pedido. Não há confirmação bancária automática: um administrador autenticado precisa confirmar o recebimento. Cartão e dinheiro também entram na receita somente após confirmação.

Fotos e logo ficam no caminho configurado em `UPLOADS_PATH` (padrão local `server/uploads`). Em hospedagem, esse caminho precisa ser um volume persistente e deve ter backup próprio. O sitemap usa `PUBLIC_SITE_URL`/`VITE_PUBLIC_URL`; nenhum domínio é inventado quando elas não estão definidas. Consulte [implantação](docs/DEPLOY.md) e [backup/restauração](docs/BACKUP.md).

Alterações compatíveis são aplicadas na inicialização. Para operação controlada pelo MySQL Workbench, o script não destrutivo [20260824_operacao_comercial.sql](server/migrations/20260824_operacao_comercial.sql) documenta as novas colunas, chaves e a tabela de auditoria; aplique-o uma única vez em bancos gerenciados manualmente e mantenha um backup antes de migrations.

O sistema não possui gateway bancário nem serviço SMTP. A conciliação é manual e auditada; recuperação de senha por e-mail depende da infraestrutura descrita em [implantação](docs/DEPLOY.md). Logs HTTP 5xx são emitidos em JSON com campos sensíveis redigidos e devem ser coletados/rotacionados pela infraestrutura.

Os textos de privacidade e termos são modelos operacionais. O proprietário precisa revisá-los com orientação jurídica, definir retenção de dados, fornecedores, políticas de cancelamento e regras locais antes da venda ou publicação comercial.
