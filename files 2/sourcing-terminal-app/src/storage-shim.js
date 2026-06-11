// Shim pour simuler l'API window.storage des artifacts Claude.
// Utilise localStorage pour la persistance cote navigateur.

const PREFIX = 'sourcing-terminal:';

window.storage = {
  async get(key) {
    const value = localStorage.getItem(PREFIX + key);
    if (value === null) throw new Error('Key not found: ' + key);
    return { key, value, shared: false };
  },

  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value, shared: false };
  },

  async delete(key) {
    const existed = localStorage.getItem(PREFIX + key) !== null;
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: existed, shared: false };
  },

  async list(prefix = '') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) {
        keys.push(k.slice(PREFIX.length));
      }
    }
    return { keys, prefix, shared: false };
  },
};
