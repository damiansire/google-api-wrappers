'use strict';

// Suite de comentarios: mockea makeRequest (la frontera de red) y ejercita el
// stack completo dao -> controller -> client (youtubeClient) sin tocar la red.
//
// Parcheamos makeRequest sobre los dos adapters posibles para que el mock quede
// activo sin importar desde cual modulo lo capture el DAO. Esta suite codifica
// el contrato CORRECTO del path de comentarios; si los imports del DAO estan mal
// cableados, estos tests lo detectan (que es justo el objetivo de tener red de
// seguridad).

const test = require('node:test');
const assert = require('node:assert');

const youtubeApi = require('../adapters/youtubeApi');
const commentsAdapter = require('../adapters/commentsAdapter');

let pending = [];
const requestedUrls = [];

function mockMakeRequest(url) {
  requestedUrls.push(url);
  if (pending.length === 0) {
    return Promise.reject(new Error(`mockMakeRequest: llamada inesperada a ${url}`));
  }
  return Promise.resolve(pending.shift());
}

youtubeApi.makeRequest = mockMakeRequest;
commentsAdapter.makeRequest = mockMakeRequest;

function setResponses(...responses) {
  pending = responses;
  requestedUrls.length = 0;
}

// Las capas se requieren DESPUES del parcheo para que capturen el mock.
const commentsController = require('../controllers/commentsController');
const YoutubeClient = require('../index');

// Respuesta cruda del endpoint youtube/v3/commentThreads.
function commentsResponse(comments, nextPageToken) {
  return {
    nextPageToken,
    items: comments.map((c) => ({
      snippet: {
        topLevelComment: {
          id: c.id,
          snippet: { textDisplay: c.text, authorDisplayName: c.author },
        },
      },
    })),
  };
}

function comment(id, text, author) {
  return { textDisplay: text, authorDisplayName: author, id };
}

test('controller: getPaginatedComments mapea los comentarios y propaga el token', async () => {
  setResponses(commentsResponse([{ id: 'c1', text: 'hola', author: 'ana' }], 'TOKEN_2'));
  const res = await commentsController.getPaginatedComments('KEY', 'VID', 20);
  assert.strictEqual(res.nextPageToken, 'TOKEN_2');
  assert.deepStrictEqual(res.comments, [comment('c1', 'hola', 'ana')]);
  assert.ok(requestedUrls[0].includes('VID'), 'la URL debe incluir el videoId');
  assert.ok(requestedUrls[0].includes('KEY'), 'la URL debe incluir la apiKey');
});

test('controller: getNextCommentsPage mapea la pagina siguiente', async () => {
  setResponses(commentsResponse([{ id: 'c2', text: 'chau', author: 'beto' }], undefined));
  const res = await commentsController.getNextCommentsPage('KEY', 'VID', 'TOKEN_2', 20);
  assert.strictEqual(res.nextPageToken, undefined);
  assert.deepStrictEqual(res.comments, [comment('c2', 'chau', 'beto')]);
});

test('controller: getAllComments pagina hasta agotar el token y concatena', async () => {
  setResponses(
    commentsResponse([{ id: 'c1', text: 'uno', author: 'ana' }], 'TOKEN_2'),
    commentsResponse([{ id: 'c2', text: 'dos', author: 'beto' }], undefined),
  );
  const all = await commentsController.getAllComments('KEY', 'VID');
  assert.deepStrictEqual(all, [comment('c1', 'uno', 'ana'), comment('c2', 'dos', 'beto')]);
  assert.strictEqual(requestedUrls.length, 2, 'debe hacer exactamente 2 requests');
});

test('client: getPaginatedComments guarda el token y getNextCommentsPage lo consume', async () => {
  const client = new YoutubeClient('KEY');

  setResponses(commentsResponse([{ id: 'c1', text: 'hola', author: 'ana' }], 'TOKEN_2'));
  const first = await client.getPaginatedComments('VID', 20);
  assert.deepStrictEqual(first, [comment('c1', 'hola', 'ana')]);
  assert.strictEqual(client.nextCommentsPageToken, 'TOKEN_2');

  setResponses(commentsResponse([{ id: 'c2', text: 'chau', author: 'beto' }], undefined));
  const next = await client.getNextCommentsPage();
  assert.deepStrictEqual(next, [comment('c2', 'chau', 'beto')]);
  assert.strictEqual(client.nextCommentsPageToken, undefined);

  // Sin token, no debe tocar la red y devuelve [].
  const empty = await client.getNextCommentsPage();
  assert.deepStrictEqual(empty, []);
});

test('client: getAllComments delega en el controller', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(
    commentsResponse([{ id: 'c1', text: 'uno', author: 'ana' }], 'TOKEN_2'),
    commentsResponse([{ id: 'c2', text: 'dos', author: 'beto' }], undefined),
  );
  const all = await client.getAllComments('VID');
  assert.deepStrictEqual(all, [comment('c1', 'uno', 'ana'), comment('c2', 'dos', 'beto')]);
});

test('client: getPaginatedComments rechaza un videoId numerico', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.getPaginatedComments(123), TypeError);
});
