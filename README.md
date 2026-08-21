# Sistema da Hamburgueria

Aplicação responsiva com três áreas integradas: cliente, administrador e garçom. O frontend usa React e a API Node.js persiste os dados em um MySQL Server que pode ser administrado pelo MySQL Workbench.

## Recursos conectados ao MySQL

- login e sessões do administrador;
- categorias, produtos, fotos, adicionais e vínculos por produto;
- promoções exibidas no site;
- pedidos de delivery, itens, adicionais, pagamentos e acompanhamento;
- funcionários com PIN protegido por `scrypt` e token individual para QR Code;
- sessões do garçom, mesas, comandas e itens da comanda;
- vínculo automático entre garçom, mesa, comanda e pedido do salão;
- configurações da lanchonete;
- dados de dashboard e relatórios calculados a partir dos registros compartilhados.

O carrinho permanece no navegador somente até o cliente finalizar a compra. Depois disso, o servidor recalcula os preços usando o catálogo do banco e grava o pedido no MySQL.

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

4. Edite o `.env` e informe a mesma conta usada no Workbench:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua-senha-do-mysql
DB_NAME=hamburgueria

ADMIN_USER=admin
ADMIN_EMAIL=admin@hamburgueria.com
ADMIN_PASSWORD=uma-senha-administrativa-segura
```

O `.env` é ignorado pelo Git. Nunca envie senhas ao repositório.

Ao iniciar a API, o banco `hamburgueria`, as tabelas, os índices, as chaves estrangeiras e os dados iniciais são criados automaticamente. O arquivo [`server/schema.mysql.sql`](server/schema.mysql.sql) também pode ser aberto no Workbench para consultar o esquema completo.

## Executar localmente

```bash
npm install
npm run dev
```

Esse comando inicia a API e o site juntos. O frontend normalmente fica em `http://localhost:5173` e a API em `http://localhost:3001`.

## Acessos iniciais

- Cliente: `/`
- Administrador: `/admin/login`, com as credenciais definidas em `ADMIN_USER` e `ADMIN_PASSWORD`
- Garçom Carlos: `/garcom/acesso/carlos-7f3a9d2c`, PIN `1234`
- Garçonete Ana: `/garcom/acesso/ana-4b8e1c6f`, PIN `5678`

Os PINs acima existem apenas nos dados de demonstração. No banco eles são armazenados como hash. O QR Code contém somente o token de identificação do funcionário; a sessão autenticada é criada apenas depois da validação do PIN.

## Comandos

```bash
npm run dev       # frontend e backend
npm run dev:web   # somente frontend
npm run dev:api   # somente backend
npm run lint      # análise estática
npm test          # testes puros e integração MySQL quando DB_PASSWORD estiver definido
npm run build     # frontend de produção
npm start         # API, uploads e frontend já compilado
```

Os testes de integração criam um banco temporário com sufixo `_teste_<processo>` e o removem ao terminar. Eles nunca usam o banco `hamburgueria` como alvo de limpeza.

## Rotas principais da API

### Públicas

- `GET /api/saude`
- `GET /api/catalogo`
- `GET /api/publico/inicial`
- `POST /api/pedidos`
- `GET /api/pedidos/:codigo?token=...`

### Administrador

- `POST /api/admin/login`
- `GET|DELETE /api/admin/sessao`
- `GET /api/admin/dados`
- CRUD de `/api/admin/produtos`, `/api/admin/adicionais`, `/api/admin/promocoes` e `/api/admin/funcionarios`
- `PATCH /api/admin/pedidos/:codigo/status`
- `PUT /api/admin/configuracao`

### Garçom

- `POST /api/garcom/login`
- `GET|DELETE /api/garcom/sessao`
- `GET /api/garcom/dados`
- abertura de comanda, inclusão/remoção de itens, envio à cozinha, solicitação de conta e fechamento em `/api/garcom/comandas/...`

## Produção

Defina `NODE_ENV=production`, senhas fortes e uma conta MySQL com acesso somente ao banco da aplicação. Fotos enviadas ficam em `server/uploads/`; em hospedagem, use volume persistente para essa pasta e para o MySQL.
