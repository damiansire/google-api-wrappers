'use strict';

// Suite de comentarios: mockea makeRequest (la frontera de red) y ejercita el
// stack completo dao -> controller -> client (youtubeClient) sin tocar la red.
//
// El mock se captura porque commentsDao desestructura `makeRequest` desde
// '../adapters/youtubeApi' en tiempo de require; por eso parcheamos ese export
// ANTES de requerir las capas bajo prueba. (commentsAdapter no exporta
// makeRequest, asi que no hay nada que parchear ahi.)

const test = require('node:test');
const assert = require('node:assert');

const youtubeApi = require('../adapters/youtubeApi');

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

test('controller: getNextCommentsPage mapea la pagina siguiente y manda maxResults/pageToken en la URL', async () => {
  setResponses(commentsResponse([{ id: 'c2', text: 'chau', author: 'beto' }], undefined));
  const res = await commentsController.getNextCommentsPage('KEY', 'VID', 'TOKEN_2', 20);
  assert.strictEqual(res.nextPageToken, undefined);
  assert.deepStrictEqual(res.comments, [comment('c2', 'chau', 'beto')]);
  // Guarda contra invertir el orden de (token, size): la URL debe llevar el
  // size numerico en maxResults y el token en pageToken.
  assert.ok(requestedUrls[0].includes('maxResults=20'), 'maxResults debe ser el size numerico');
  assert.ok(requestedUrls[0].includes('pageToken=TOKEN_2'), 'pageToken debe ser el token');
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

test('client: comments() itera todos los comentarios via el paginador stateless', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(
    commentsResponse([{ id: 'c1', text: 'uno', author: 'ana' }], 'TOKEN_2'),
    commentsResponse([{ id: 'c2', text: 'dos', author: 'beto' }], undefined),
  );
  const collected = [];
  for await (const c of client.comments('VID', { pageSize: 100 })) collected.push(c);
  assert.deepStrictEqual(collected, [comment('c1', 'uno', 'ana'), comment('c2', 'dos', 'beto')]);
  // La propiedad clave del paginador stateless: NO toca el estado de la instancia
  // (a diferencia de getPaginatedComments). Por eso dos iteraciones no se pisan.
  assert.strictEqual(client.nextCommentsPageToken, '', 'el iterador no debe mutar el cursor de la instancia');
  assert.strictEqual(client.videoId, '', 'el iterador no debe mutar el videoId de la instancia');
});

test('client: commentsPages() entrega un array por pagina', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(
    commentsResponse([{ id: 'c1', text: 'uno', author: 'ana' }], 'TOKEN_2'),
    commentsResponse([{ id: 'c2', text: 'dos', author: 'beto' }], undefined),
  );
  const pages = [];
  for await (const page of client.commentsPages('VID')) pages.push(page);
  assert.strictEqual(pages.length, 2, 'dos paginas');
  assert.deepStrictEqual(pages[0], [comment('c1', 'uno', 'ana')]);
  assert.deepStrictEqual(pages[1], [comment('c2', 'dos', 'beto')]);
});

test('client: comments() rechaza un videoId invalido al empezar a iterar', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(async () => {
    // eslint-disable-next-line no-unused-vars
    for await (const _ of client.comments(123)) break;
  }, TypeError);
});

test('client: getPaginatedComments rechaza un videoId numerico', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.getPaginatedComments(123), TypeError);
});

test('client: los metodos que reciben un videoId rechazan undefined, null, "" y objetos', async () => {
  const client = new YoutubeClient('KEY');
  const invalid = [undefined, null, '', {}, 123];
  for (const bad of invalid) {
    await assert.rejects(() => client.getAllComments(bad), TypeError, `getAllComments(${JSON.stringify(bad)})`);
    await assert.rejects(() => client.getPaginatedComments(bad), TypeError, `getPaginatedComments(${JSON.stringify(bad)})`);
  }
});
