'use strict';

const fail = (surface) => () => {
  throw new Error(`NETWORK_ATTEMPT:${surface}`);
};

globalThis.fetch = fail('fetch');

for (const moduleName of ['http', 'https', 'net', 'tls', 'dns']) {
  const module = require(moduleName);
  for (const method of ['connect', 'createConnection', 'get', 'lookup', 'request', 'resolve']) {
    if (typeof module[method] === 'function') module[method] = fail(`${moduleName}.${method}`);
  }
}
