const cache = new Map();

function set(key, value, ttlSeconds = 300) {
  const expires = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expires });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

module.exports = {
  set,
  get,
};