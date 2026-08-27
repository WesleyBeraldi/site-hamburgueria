import { config } from '../config.js';
import { abrirBanco, fecharBanco } from '../database.js';

let banco;
try {
  banco = await abrirBanco({ mysql: config.mysql });
  const [linhas] = await banco.query('SELECT 1 AS conexao');
  if (Number(linhas[0]?.conexao) !== 1) throw new Error('O MySQL não confirmou a consulta de verificação.');
  console.log('Conexão com o MySQL validada com sucesso.');
} catch (erro) {
  console.error(`Não foi possível validar a conexão com o MySQL: ${erro.message}`);
  process.exitCode = 1;
} finally {
  if (banco) await fecharBanco(banco);
}
