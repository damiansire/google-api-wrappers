'use strict';

// Suite de metadata (videos.list) y busqueda (search.list): mockea makeRequest
// (la frontera de red) y ejercita dao -> controller -> client sin tocar la red.
// Igual que videos.test.js, se parchea el export del adapter ANTES de requerir
// las capas bajo prueba (los dao desestructuran makeRequest en tiempo de require).

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

const videoController = require('../controllers/videoController');
const YoutubeClient = require('../index');

// Respuesta cruda de videos.list (part=snippet,statistics). Las cuentas vienen
// como STRING, tal cual la API.
function videosResponse(...items) {
  return { items };
}

function videoItem(id, { hideStats = false } = {}) {
  const item = {
    id,
    snippet: {
      channelId: 'UCcanal',
      title: `titulo ${id}`,
      description: 'desc',
      tags: ['a', 'b'],
      publishedAt: '2021-09-27T03:00:00Z',
    },
  };
  if (!hideStats) {
    item.statistics = { viewCount: '1234', likeCount: '56', commentCount: '7' };
  }
  return item;
}

function searchResponse(videoIds, nextPageToken) {
  return {
    nextPageToken,
    items: videoIds.map((id) => ({
      id: { videoId: id },
      snippet: { channelId: 'UCotro', title: `hit ${id}`, publishedAt: '2021-09-27T03:00:00Z' },
    })),
  };
}

// --- videos.list ---

test('controller: getVideosMetadata mapea snippet+statistics y parsea cuentas string a number', async () => {
  setResponses(videosResponse(videoItem('v1')));
  const [meta] = await videoController.getVideosMetadata('KEY', ['v1']);
  assert.strictEqual(meta.id, 'v1');
  assert.strictEqual(meta.title, 'titulo v1');
  assert.deepStrictEqual(meta.tags, ['a', 'b']);
  assert.strictEqual(meta.viewCount, 1234);
  assert.strictEqual(meta.likeCount, 56);
  assert.strictEqual(meta.commentCount, 7);
  assert.ok(requestedUrls[0].includes('/videos?'), 'debe pegarle a videos.list');
  assert.ok(requestedUrls[0].includes('id=v1'), 'la URL debe incluir el id');
});

test('controller: getVideosMetadata deja en null las estadisticas ocultas (no 0)', async () => {
  setResponses(videosResponse(videoItem('v2', { hideStats: true })));
  const [meta] = await videoController.getVideosMetadata('KEY', ['v2']);
  assert.strictEqual(meta.viewCount, null);
  assert.strictEqual(meta.likeCount, null);
  assert.strictEqual(meta.commentCount, null);
});

test('controller: getVideosMetadata reconcilia por id — orden de entrada aunque la API reordene, y omite los ausentes', async () => {
  // La API devuelve v3, v1 (reordenados) y OMITE v2 (privado/borrado).
  setResponses(videosResponse(videoItem('v3'), videoItem('v1')));
  const metas = await videoController.getVideosMetadata('KEY', ['v1', 'v2', 'v3']);
  // Debe salir en el ORDEN DE ENTRADA (v1, v3), no en el de la respuesta (v3, v1),
  // y v2 (omitido por la API) no aparece.
  assert.deepStrictEqual(metas.map((m) => m.id), ['v1', 'v3']);
});

test('controller: getVideosMetadata chunkea de a 50 ids', async () => {
  // 51 ids -> 2 requests (50 + 1). Cada request devuelve 1 item cuyo id SÍ está en
  // la entrada (uno del primer chunk, otro del segundo), para que sobreviva la
  // reconciliacion por id.
  const ids = Array.from({ length: 51 }, (_, i) => `id${i}`);
  setResponses(videosResponse(videoItem('id0')), videosResponse(videoItem('id50')));
  const metas = await videoController.getVideosMetadata('KEY', ids);
  assert.strictEqual(requestedUrls.length, 2, 'debe hacer exactamente 2 requests');
  assert.deepStrictEqual(metas.map((m) => m.id), ['id0', 'id50']);
});

// --- search.list ---

test('controller: searchVideos pagina hasta maxPages y descarta items sin videoId', async () => {
  setResponses(searchResponse(['v1', 'v2'], 'P2'), searchResponse(['v3'], undefined));
  const hits = await videoController.searchVideos('KEY', 'angular', { maxPages: 2 });
  assert.deepStrictEqual(hits.map((h) => h.videoId), ['v1', 'v2', 'v3']);
  assert.strictEqual(requestedUrls.length, 2);
  assert.ok(requestedUrls[0].includes('q=angular'), 'la URL debe incluir el query');
});

test('controller: searchVideos propaga el nextPageToken a la URL de la 2da pagina', async () => {
  // Guard contra que el cursor no llegue: la 2da request DEBE llevar pageToken=P2,
  // y la 1ra NO debe llevar pageToken (es la primera pagina).
  setResponses(searchResponse(['v1'], 'P2'), searchResponse(['v2'], undefined));
  await videoController.searchVideos('KEY', 'x', { maxPages: 2 });
  assert.strictEqual(requestedUrls.length, 2);
  assert.ok(!requestedUrls[0].includes('pageToken='), 'la 1ra pagina no lleva pageToken');
  assert.ok(requestedUrls[1].includes('pageToken=P2'), 'la 2da pagina debe llevar el token previo');
});

test('controller: searchVideos respeta el tope de paginas aunque haya nextPageToken', async () => {
  // La primera pagina trae token, pero maxPages=1 corta igual.
  setResponses(searchResponse(['v1', 'v2'], 'P2'));
  const hits = await videoController.searchVideos('KEY', 'x', { maxPages: 1 });
  assert.strictEqual(hits.length, 2);
  assert.strictEqual(requestedUrls.length, 1, 'no debe pedir la segunda pagina');
});

test('controller: searchVideos filtra resultados que no son videos (canales/playlists)', async () => {
  setResponses({
    nextPageToken: undefined,
    items: [
      { id: { videoId: 'v1' }, snippet: { title: 't1' } },
      { id: { channelId: 'UCx' }, snippet: { title: 'un canal' } },
    ],
  });
  const hits = await videoController.searchVideos('KEY', 'x', { maxPages: 1 });
  assert.deepStrictEqual(hits.map((h) => h.videoId), ['v1']);
});

test('controller: searchVideos clampea pageSize al tope de 50 que admite search.list', async () => {
  setResponses(searchResponse(['v1'], undefined));
  await videoController.searchVideos('KEY', 'x', { maxPages: 1, pageSize: 500 });
  assert.ok(requestedUrls[0].includes('maxResults=50'), 'pageSize > 50 debe clampearse a 50');
});

test('controller: searchVideos rechaza pageSize inválido en vez de mandar maxResults=0', async () => {
  // Antes clampeaba a 0 -> maxResults=0 -> 400 garantizado de la API. Ahora falla
  // temprano y claro (fail-closed frente a un input roto del caller).
  await assert.rejects(
    () => videoController.searchVideos('KEY', 'x', { maxPages: 1, pageSize: -10 }),
    /invalid pageSize/,
  );
  await assert.rejects(
    () => videoController.searchVideos('KEY', 'x', { maxPages: 1, pageSize: 0 }),
    /invalid pageSize/,
  );
});

test('controller: searchVideos rechaza un order fuera del set permitido', async () => {
  await assert.rejects(
    () => videoController.searchVideos('KEY', 'x', { order: 'popularidad' }),
    TypeError,
  );
});

test('controller: searchVideos acepta los order validos de search.list', async () => {
  setResponses(searchResponse(['v1'], undefined));
  await videoController.searchVideos('KEY', 'x', { order: 'viewCount', maxPages: 1 });
  assert.ok(requestedUrls[0].includes('order=viewCount'), 'el order valido debe llegar a la URL');
});

// --- client ---

test('client: getVideoMetadata devuelve el primer item', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(videosResponse(videoItem('v1')));
  const meta = await client.getVideoMetadata('v1');
  assert.strictEqual(meta.id, 'v1');
});

test('client: getVideoMetadata devuelve null si la API no lo encontro', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(videosResponse()); // items vacio
  const meta = await client.getVideoMetadata('inexistente');
  assert.strictEqual(meta, null);
});

test('client: getVideosMetadata rechaza un argumento que no es array', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.getVideosMetadata('v1'), TypeError);
});

test('client: getVideosMetadata rechaza un id no-string (evita omision silenciosa por mismatch de key)', async () => {
  // Un number/''/null se mandaria pero no matchearia la key string del Map de
  // reconciliacion y desapareceria del resultado sin error. Debe fallar con el indice.
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.getVideosMetadata(['v1', 12345, 'v3']), (err) => {
    assert.ok(err instanceof TypeError);
    assert.match(err.message, /index 1/);
    return true;
  });
  await assert.rejects(() => client.getVideosMetadata(['']), /index 0/);
});

test('client: searchVideos rechaza un query que no es string', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.searchVideos(123), TypeError);
});
