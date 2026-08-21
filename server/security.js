import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TAMANHO_HASH = 64;

export function criarHashSenha(senha) {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, TAMANHO_HASH);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verificarSenha(senha, valorSalvo) {
  const [algoritmo, saltHex, hashHex] = String(valorSalvo).split(':');
  if (algoritmo !== 'scrypt' || !saltHex || !hashHex) return false;

  try {
    const hashSalvo = Buffer.from(hashHex, 'hex');
    const hashInformado = scryptSync(senha, Buffer.from(saltHex, 'hex'), hashSalvo.length);
    return hashSalvo.length === hashInformado.length && timingSafeEqual(hashSalvo, hashInformado);
  } catch {
    return false;
  }
}

export function criarTokenSessao() {
  return randomBytes(32).toString('base64url');
}

export function criarHashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
