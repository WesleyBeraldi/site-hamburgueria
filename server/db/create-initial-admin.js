import { config } from '../config.js';
import { abrirBanco, criarAdministradorInicial, fecharBanco } from '../database.js';

if (!config.administrador.senha) {
  throw new Error('Defina ADMIN_PASSWORD antes de criar o administrador inicial.');
}
if (config.producao && config.administrador.senha.length < 12) {
  throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres em produção.');
}

const banco = await abrirBanco({ mysql: config.mysql });
try {
  await criarAdministradorInicial(banco, config.administrador);
  console.log('Administrador inicial verificado com sucesso.');
} finally {
  await fecharBanco(banco);
}
