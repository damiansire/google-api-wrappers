'use strict';

// Suite del adapter de red: ejercita el makeRequest REAL (parseo del body,
// rechazo en status >= 400, body no-JSON, error de socket y timeout de 30s).
// A diferencia de las otras suites —que reemplazan makeRequest entero— acá lo
// único que se stubbea es https.get: todo el código de youtubeApi.js corre de
// verdad, sin tocar la red.

const test = require('node:test');
const assert = require('node:assert');
const https = require('https');
const { EventEmitter } = require('node:events');

const { makeRequest } = require('../adapters/youtubeApi');

// Reemplaza https.get por un fake mientras corre `run` y lo restaura siempre.
// `drive(req)` se ejecuta en el siguiente tick, cuando makeRequest ya registró
// sus handlers ('error') y llamó a req.setTimeout.
function withHttpsGetStub(drive, run) {
  const original = https.get;
  https.get = function fakeGet(url, onResponse) {
    const req = new EventEmitter();
    req.requestedUrl = url;
    req.timeoutMs = null;
    req.setTimeout = (ms, cb) => {
      req.timeoutMs = ms;
      req.timeoutCallback = cb;
      return req;
    };
    // Como el ClientRequest real: destroy(err) emite 'error' con ese error.
    req.destroy = (err) => {
      if (err) {
        req.emit('error', err);
      }
    };
    req.respond = (statusCode, body) => {
      const res = new EventEmitter();
      res.statusCode = statusCode;
      onResponse(res);
      for (const chunk of Array.isArray(body) ? body : [body]) {
        res.emit('data', Buffer.from(chunk));
      }
      res.emit('end');
    };
    setImmediate(() => drive(req));
    return req;
  };
  return Promise.resolve()
    .then(run)
    .finally(() => {
      https.get = original;
    });
}

test('makeRequest: 200 con JSON valido resuelve con el objeto parseado (concatenando chunks)', () =>
  withHttpsGetStub(
    (req) => req.respond(200, ['{"items":', '[1,2]}']),
    async () => {
      const result = await makeRequest('https://example.test/ok');
      assert.deepStrictEqual(result, { items: [1, 2] });
    },
  ));

test('makeRequest: 403 rechaza con el status y el body en el mensaje', () =>
  withHttpsGetStub(
    (req) => req.respond(403, '{"error":"quotaExceeded"}'),
    () =>
      assert.rejects(makeRequest('https://example.test/forbidden'), (err) => {
        assert.match(err.message, /Request failed with status 403/);
        assert.match(err.message, /quotaExceeded/);
        return true;
      }),
  ));

test('makeRequest: 500 tambien rechaza (el corte es statusCode >= 400)', () =>
  withHttpsGetStub(
    (req) => req.respond(500, 'internal error'),
    () =>
      assert.rejects(
        makeRequest('https://example.test/broken'),
        /Request failed with status 500/,
      ),
  ));

test('makeRequest: body no-JSON con status 200 rechaza con "Failed to parse"', () =>
  withHttpsGetStub(
    (req) => req.respond(200, '<html>not json</html>'),
    () =>
      assert.rejects(
        makeRequest('https://example.test/html'),
        /Failed to parse response body as JSON/,
      ),
  ));

test('makeRequest: un error de socket rechaza con ese mismo error', () =>
  withHttpsGetStub(
    (req) => req.emit('error', new Error('read ECONNRESET')),
    () => assert.rejects(makeRequest('https://example.test/reset'), /ECONNRESET/),
  ));

test('makeRequest: configura un timeout de 30s y al dispararse rechaza con "Request timed out"', () => {
  let timeoutMs = null;
  return withHttpsGetStub(
    (req) => {
      timeoutMs = req.timeoutMs;
      // Simula que el socket se quedo colgado: dispara el callback del timeout,
      // que en makeRequest hace req.destroy(new Error('Request timed out')).
      req.timeoutCallback();
    },
    async () => {
      await assert.rejects(makeRequest('https://example.test/hang'), /Request timed out/);
      assert.strictEqual(timeoutMs, 30000, 'el timeout debe registrarse en 30000 ms');
    },
  );
});
