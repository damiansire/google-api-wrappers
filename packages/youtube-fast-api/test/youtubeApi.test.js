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

const {
  makeRequest,
  YouTubeApiError,
  RateLimitError,
  QuotaExceededError,
} = require('../adapters/youtubeApi');

// Reemplaza https.get por un fake mientras corre `run` y lo restaura siempre.
// `drive(req)` se ejecuta en el siguiente tick, cuando makeRequest ya registró
// sus handlers ('error') y llamó a req.setTimeout.
// makeRequest llama https.get(url, { agent }, cb): el fake acepta la firma real
// (url[, options], cb) y toma el ultimo argumento como callback.
function withHttpsGetStub(drive, run) {
  const original = https.get;
  https.get = function fakeGet(url, optionsOrCb, maybeCb) {
    const onResponse = typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb;
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
    req.respond = (statusCode, body, headers = {}) => {
      const res = new EventEmitter();
      res.statusCode = statusCode;
      res.headers = headers;
      onResponse(res);
      for (const chunk of Array.isArray(body) ? body : [body]) {
        res.emit('data', Buffer.from(chunk));
      }
      res.emit('end');
    };
    // Entrega la respuesta y luego emite 'error' sobre el stream `res` (corte a
    // mitad de body): sirve para probar que makeRequest no queda colgado.
    req.respondThenError = (statusCode, err) => {
      const res = new EventEmitter();
      res.statusCode = statusCode;
      res.headers = {};
      onResponse(res);
      res.emit('error', err);
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

test('makeRequest: 500 se reintenta (5xx) y termina rechazando tras agotar los reintentos', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => { calls += 1; req.respond(500, 'internal error'); },
    async () => {
      await assert.rejects(
        makeRequest('https://example.test/broken', { retryBaseMs: 0, maxRetries: 2 }),
        /Request failed with status 500/,
      );
      assert.strictEqual(calls, 3, 'debe intentar 1 vez + 2 reintentos = 3 llamadas');
    },
  );
});

test('makeRequest: 429 se reintenta y un 200 posterior resuelve OK', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => {
      calls += 1;
      if (calls === 1) req.respond(429, '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}');
      else req.respond(200, '{"ok":true}');
    },
    async () => {
      const result = await makeRequest('https://example.test/limited', { retryBaseMs: 0 });
      assert.deepStrictEqual(result, { ok: true });
      assert.strictEqual(calls, 2, 'un reintento tras el 429');
    },
  );
});

test('makeRequest: un 429 que agota los reintentos rechaza con RateLimitError tipado', () =>
  withHttpsGetStub(
    (req) => req.respond(429, '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}'),
    () =>
      assert.rejects(
        makeRequest('https://example.test/limited', { retryBaseMs: 0, maxRetries: 1 }),
        (err) => {
          assert.ok(err instanceof RateLimitError, 'debe ser RateLimitError');
          assert.ok(err instanceof YouTubeApiError, 'y de la jerarquia YouTubeApiError');
          assert.strictEqual(err.status, 429);
          assert.strictEqual(err.reason, 'rateLimitExceeded');
          return true;
        },
      ),
  ));

test('makeRequest: un corte a mitad de body (socket hang up) es transitorio -> reintenta y no cuelga', () =>
  withHttpsGetStub(
    (req) => req.respondThenError(200, new Error('socket hang up mid-body')),
    () => assert.rejects(
      makeRequest('https://example.test/cut', { retryBaseMs: 0, maxRetries: 1 }),
      /socket hang up mid-body/,
    ),
  ));

test('makeRequest: body no-JSON con status 200 NO se reintenta (parse-error) y rechaza', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => { calls += 1; req.respond(200, '<html>not json</html>'); },
    async () => {
      await assert.rejects(
        makeRequest('https://example.test/html', { retryBaseMs: 0 }),
        /Failed to parse response body as JSON/,
      );
      assert.strictEqual(calls, 1, 'un parse-error no es retryable: una sola llamada');
    },
  );
});

test('makeRequest: un ECONNRESET (transporte) se reintenta y un 200 posterior resuelve', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => {
      calls += 1;
      if (calls === 1) {
        const e = new Error('read ECONNRESET');
        e.code = 'ECONNRESET';
        req.emit('error', e);
      } else {
        req.respond(200, '{"ok":true}');
      }
    },
    async () => {
      const result = await makeRequest('https://example.test/reset', { retryBaseMs: 0 });
      assert.deepStrictEqual(result, { ok: true });
      assert.strictEqual(calls, 2, 'reintentó tras el ECONNRESET (socket keep-alive cerrado por el server)');
    },
  );
});

test('makeRequest: el timeout de 30s es retryable (transporte) -> reintenta y agota', () => {
  let timeoutMs = null;
  let calls = 0;
  return withHttpsGetStub(
    (req) => { calls += 1; timeoutMs = req.timeoutMs; req.timeoutCallback(); },
    async () => {
      await assert.rejects(
        makeRequest('https://example.test/hang', { retryBaseMs: 0, maxRetries: 2 }),
        /Request timed out/,
      );
      assert.strictEqual(timeoutMs, 30000, 'el timeout debe registrarse en 30000 ms');
      assert.strictEqual(calls, 3, '1 intento + 2 reintentos (el timeout es transporte, retryable)');
    },
  );
});

test('makeRequest: 403 quotaExceeded (body estructurado real) -> QuotaExceededError, no retryable', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => { calls += 1; req.respond(403, '{"error":{"errors":[{"reason":"quotaExceeded"}]}}'); },
    async () => {
      await assert.rejects(makeRequest('https://example.test/quota', { retryBaseMs: 0 }), (err) => {
        assert.ok(err instanceof QuotaExceededError, 'debe ser QuotaExceededError');
        assert.ok(err instanceof YouTubeApiError, 'y de la jerarquia');
        assert.strictEqual(err.status, 403);
        assert.strictEqual(err.reason, 'quotaExceeded');
        return true;
      });
      assert.strictEqual(calls, 1, 'un 403 de cuota es permanente: no se reintenta');
    },
  );
});

test('makeRequest: acota el Retry-After enorme al tope maximo (no cuelga la operacion)', () => {
  let calls = 0;
  return withHttpsGetStub(
    (req) => {
      calls += 1;
      // Retry-After: 99999s -> sin cap la espera seria ~28h; con maxBackoffMs:5 es 5ms.
      if (calls === 1) req.respond(429, '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}', { 'retry-after': '99999' });
      else req.respond(200, '{"ok":true}');
    },
    async () => {
      const started = process.hrtime.bigint();
      const result = await makeRequest('https://example.test/limited', { retryBaseMs: 0, maxBackoffMs: 5 });
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      assert.deepStrictEqual(result, { ok: true });
      assert.ok(elapsedMs < 1000, `la espera se acotó (tardó ${elapsedMs.toFixed(0)}ms, no las 28h del Retry-After)`);
    },
  );
});

test('makeRequest: honra el header Retry-After (segundos -> ms) en el error rechazado', () =>
  withHttpsGetStub(
    (req) => req.respond(429, '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}', { 'retry-after': '2' }),
    () => assert.rejects(
      // maxRetries:0 -> rechaza en el primer intento, sin dormir; verifica el parseo s->ms.
      makeRequest('https://example.test/limited', { retryBaseMs: 0, maxRetries: 0 }),
      (err) => {
        assert.ok(err instanceof RateLimitError, 'RateLimitError');
        assert.strictEqual(err.retryAfterMs, 2000, 'Retry-After: 2 -> 2000 ms');
        return true;
      },
    ),
  ));
