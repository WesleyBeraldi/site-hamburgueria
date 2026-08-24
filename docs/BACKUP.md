# Backup e restauração do MySQL

Os scripts usam `mysqldump` e `mysql` do MySQL Client. Eles leem as mesmas variáveis `DB_*` do `.env`; a senha não é incluída na linha de comando nem gravada no arquivo.

## Gerar e verificar

```powershell
npm run db:backup
```

Defina `BACKUP_PATH` para um disco/volume persistente fora da pasta de releases. O padrão local é `backups/mysql`. `BACKUP_RETENTION_DAYS` controla a remoção apenas de arquivos `.sql` antigos criados para o banco configurado; o padrão é 14 dias.

Depois de cada backup, verifique se o arquivo não está vazio e faça periodicamente uma restauração em banco isolado. Um backup não testado não deve ser considerado recuperável.

## Restaurar

A restauração altera os dados do banco configurado. Pare a aplicação, faça um backup atual, confira `DB_NAME` e use a confirmação explícita:

```powershell
$env:CONFIRM_RESTORE=$env:DB_NAME
npm run db:restore -- C:\backups\hamburgueria\hamburgueria-data.sql
Remove-Item Env:CONFIRM_RESTORE
```

O banco de destino deve existir e o usuário precisa de permissões para recriar as estruturas contidas no dump.

## Automação e retenção

Agende `npm run db:backup` diariamente no Agendador de Tarefas, cron ou serviço equivalente. Mantenha ao menos uma cópia criptografada fora do servidor, restrinja o acesso ao diretório e adote, como ponto de partida, 14 backups diários, 8 semanais e 12 mensais. A rotação semanal/mensal e o envio para armazenamento externo dependem da infraestrutura escolhida pelo proprietário.
