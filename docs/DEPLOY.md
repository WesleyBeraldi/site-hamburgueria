# Implantação em produção

## Arquitetura recomendada

- Node.js 22 executa a API e serve o `dist` já compilado.
- MySQL 8 usa banco e usuário exclusivos.
- Um proxy reverso (Nginx, Caddy, IIS ou serviço gerenciado) termina HTTPS e encaminha para `127.0.0.1:3001`.
- `UPLOADS_PATH` aponta para volume persistente fora da pasta substituída a cada release.
- `BACKUP_PATH` aponta para outro volume persistente e protegido.
- Um gerenciador de processos (serviço do Windows, systemd ou PM2) reinicia o Node após falhas e inicialização da máquina.

## Preparação

1. Provisione o banco e o usuário conforme o README. Não use `root` na aplicação.
2. Copie `.env.example` para `.env` somente no servidor e preencha os valores reais.
3. Defina `NODE_ENV=production`, `ADMIN_PASSWORD` com no mínimo 12 caracteres, `PUBLIC_SITE_URL`, `VITE_PUBLIC_URL` e `CORS_ORIGINS` com a origem HTTPS exata.
4. Defina caminhos absolutos e persistentes para `UPLOADS_PATH` e `BACKUP_PATH`.
5. Execute `npm ci`, `npm run test`, `npm run lint` e `npm run build`.
6. Inicie com `npm start`; exponha apenas o proxy HTTPS, nunca a porta interna diretamente à internet.

Exemplo conceitual de proxy:

```text
https://pedidos.exemplo -> proxy HTTPS -> http://127.0.0.1:3001
```

O domínio acima é apenas formato ilustrativo: use o domínio real do proprietário. Em produção, a API envia HSTS e CSP; portanto o serviço deve estar realmente protegido por HTTPS. Mantenha frontend e API na mesma origem quando possível.

## Operação

- Preserve `UPLOADS_PATH` entre releases e inclua-o em backup separado do banco.
- Direcione stdout/stderr estruturados do processo para a solução de logs do servidor, com rotação e acesso restrito.
- Monitore `/api/saude`, uso de disco, conexões MySQL, erros HTTP 5xx e validade do certificado.
- Rode o backup diário e teste a restauração em ambiente isolado.
- Faça o primeiro acesso administrativo, troque a senha e cadastre os dados reais da loja antes de abrir pedidos.

## Recuperação de acesso

Não existe SMTP ou provedor de e-mail configurado, então o sistema não apresenta um fluxo de “esqueci minha senha” fictício. Uma recuperação autônoma futura exige provedor SMTP/API, remetente e domínio verificados, tokens de uso único com hash e expiração, rate limit e templates. Até isso ser implantado, outro administrador ativo pode manter acessos e a recuperação de último recurso exige procedimento operacional direto e controlado no banco/ambiente pelo responsável técnico.
