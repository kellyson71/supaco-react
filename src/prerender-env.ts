// O build monta as páginas abertas no Node, onde não existe o armazenamento do navegador: lá ninguém está logado.
if (typeof window === 'undefined') {
  const empty = { length: 0, getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null };
  Object.defineProperty(globalThis, 'localStorage', { value: empty, configurable: true });
}
