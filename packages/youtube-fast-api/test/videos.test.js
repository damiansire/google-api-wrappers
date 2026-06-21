'use strict';

// Suite de videos: mockea makeRequest (la frontera de red) y ejercita el stack
// completo dao -> controller -> client (youtubeClient) sin tocar la red.
//
// Los DAO desestructuran makeRequest en tiempo de require, por eso parcheamos el
// export del adapter ANTES de requerir las capas bajo prueba.

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
const videoController = require('../controllers/videoController');
const YoutubeClient = require('../index');

// Respuesta cruda del endpoint youtube/v3/search (id.videoId por item).
function searchResponse(videoIds, nextPageToken) {
  return {
    nextPageToken,
    items: videoIds.map((id) => ({ id: { videoId: id } })),
  };
}

// Respuesta cruda del endpoint youtube/v3/playlists (id de playlist directo en
// item.id, NO item.id.playlistId como search.list).
function playlistResponse(playlistIds, nextPageToken) {
  return {
    nextPageToken,
    items: playlistIds.map((id) => ({ id })),
  };
}

test('controller: getPaginatedVideosByChannelId mapea ids y propaga el token', async () => {
  setResponses(searchResponse(['v1', 'v2'], 'TOKEN_2'));
  const res = await videoController.getPaginatedVideosByChannelId('KEY', 'CHAN', 50);
  assert.deepStrictEqual(res.allVideosId, ['v1', 'v2']);
  assert.strictEqual(res.nextPageToken, 'TOKEN_2');
  assert.ok(requestedUrls[0].includes('CHAN'), 'la URL debe incluir el channelId');
  assert.ok(requestedUrls[0].includes('KEY'), 'la URL debe incluir la apiKey');
});

test('controller: getPaginatedVideosByChannelId descarta items sin videoId', async () => {
  setResponses({
    nextPageToken: undefined,
    items: [{ id: { videoId: 'v1' } }, { id: {} }, { id: { videoId: 'v3' } }],
  });
  const res = await videoController.getPaginatedVideosByChannelId('KEY', 'CHAN', 50);
  assert.deepStrictEqual(res.allVideosId, ['v1', 'v3']);
});

test('controller: getNextVideosPage mapea la pagina siguiente', async () => {
  setResponses(searchResponse(['v4', 'v5'], undefined));
  const res = await videoController.getNextVideosPage('KEY', 'CHAN', 50, 'TOKEN_2');
  assert.deepStrictEqual(res.allVideosId, ['v4', 'v5']);
  assert.strictEqual(res.nextPageToken, undefined);
});

test('controller: getAllVideosByChannelId pagina hasta agotar el token y deduplica', async () => {
  setResponses(
    searchResponse(['v1', 'v2'], 'TOKEN_2'),
    searchResponse(['v2', 'v3'], undefined), // v2 repetido -> debe deduplicarse
  );
  const all = await videoController.getAllVideosByChannelId('KEY', 'CHAN');
  assert.deepStrictEqual(all, ['v1', 'v2', 'v3']);
  assert.strictEqual(requestedUrls.length, 2, 'debe hacer exactamente 2 requests');
});

test('controller: getAllPlaylistByChannelId usa el endpoint playlists con maxResults y pagina hasta agotar el token', async () => {
  setResponses(
    playlistResponse(['p1', 'p2'], 'TOKEN_2'),
    playlistResponse(['p3'], undefined),
  );
  const res = await videoController.getAllPlaylistByChannelId('KEY', 'CHAN');
  assert.deepStrictEqual(res.allVideosId, ['p1', 'p2', 'p3']);
  assert.strictEqual(requestedUrls.length, 2, 'debe paginar: una request por pagina');
  // Debe pegarle a playlists.list (no a search.list) con maxResults y propagar el token.
  assert.ok(requestedUrls[0].includes('/playlists?'), 'debe usar el endpoint playlists, no search');
  assert.ok(requestedUrls[0].includes('channelId=CHAN'), 'la URL debe incluir el channelId');
  assert.ok(requestedUrls[0].includes('maxResults=50'), 'la URL debe pedir maxResults');
  assert.ok(requestedUrls[1].includes('pageToken=TOKEN_2'), 'la segunda pagina debe propagar el nextPageToken');
});

test('client: getPlaylist devuelve los ids de playlist deduplicados a traves de todas las paginas', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(
    playlistResponse(['p1', 'p2'], 'TOKEN_2'),
    playlistResponse(['p2', 'p3'], undefined), // p2 repetido -> debe deduplicarse
  );
  const playlists = await client.getPlaylist('CHAN');
  assert.deepStrictEqual(playlists, ['p1', 'p2', 'p3']);
});

test('client: getPaginatedChannelVideos guarda el token y getNextVideosPage lo consume', async () => {
  const client = new YoutubeClient('KEY');

  setResponses(searchResponse(['v1', 'v2'], 'TOKEN_2'));
  const first = await client.getPaginatedChannelVideos('CHAN', 2);
  assert.deepStrictEqual(first, ['v1', 'v2']);
  assert.strictEqual(client.nextVideosPageToken, 'TOKEN_2');

  setResponses(searchResponse(['v3'], undefined));
  const next = await client.getNextVideosPage();
  assert.deepStrictEqual(next, ['v3']);
  assert.strictEqual(client.nextVideosPageToken, undefined);

  // Sin token, no debe tocar la red y devuelve [].
  const empty = await client.getNextVideosPage();
  assert.deepStrictEqual(empty, []);
});

test('client: getAllVideos delega en el controller y deduplica', async () => {
  const client = new YoutubeClient('KEY');
  setResponses(
    searchResponse(['v1', 'v2'], 'TOKEN_2'),
    searchResponse(['v2'], undefined),
  );
  const all = await client.getAllVideos('CHAN');
  assert.deepStrictEqual(all, ['v1', 'v2']);
});

test('client: getPaginatedChannelVideos rechaza un channelId numerico', async () => {
  const client = new YoutubeClient('KEY');
  await assert.rejects(() => client.getPaginatedChannelVideos(123), TypeError);
});
