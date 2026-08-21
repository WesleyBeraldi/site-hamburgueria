export function aguardarServidor(servidor, porta) {
  return new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(porta, () => {
      servidor.off('error', reject);
      resolve();
    });
  });
}

export function fecharServidor(servidor) {
  if (!servidor.listening) return Promise.resolve();
  return new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
}
