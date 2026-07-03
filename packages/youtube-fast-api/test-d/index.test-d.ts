import { expectType, expectAssignable, expectError } from 'tsd';
import YoutubeClient = require('..');

const client = new YoutubeClient('KEY');

// --- Comentarios ---
expectType<Promise<YoutubeClient.Comment[]>>(client.getAllComments('v'));
expectType<AsyncGenerator<YoutubeClient.Comment, void, unknown>>(client.comments('v'));
expectType<AsyncGenerator<YoutubeClient.Comment[], void, unknown>>(client.commentsPages('v', { pageSize: 100 }));

// --- Videos de un canal ---
expectType<Promise<string[]>>(client.getAllVideos('c'));
expectType<AsyncGenerator<string, void, unknown>>(client.channelVideos('c'));
expectType<Promise<string[]>>(client.getPlaylist('c'));

// --- Metadata / búsqueda ---
expectType<Promise<YoutubeClient.VideoMetadata[]>>(client.getVideosMetadata(['a', 'b']));
expectType<Promise<YoutubeClient.VideoMetadata | null>>(client.getVideoMetadata('a'));
expectType<Promise<YoutubeClient.SearchHit[]>>(client.searchVideos('q', { order: 'viewCount', maxPages: 2 }));

// Un `order` fuera del set permitido es error de tipo (además del TypeError en runtime).
expectError(client.searchVideos('q', { order: 'popularidad' }));

// La jerarquía de errores compone y es accesible desde el export.
const e = new YoutubeClient.RateLimitError('rate limited');
expectAssignable<YoutubeClient.YouTubeApiError>(e);
expectAssignable<Error>(e);
expectType<number | undefined>(e.status);
