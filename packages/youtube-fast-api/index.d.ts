// Type definitions for youtube-fast-api
// El paquete es JS; estos tipos declaran su superficie pública para consumidores TS.

export = YoutubeClient;

declare namespace YoutubeClient {
    /** Un comentario de nivel superior de un video. */
    interface Comment {
        id: string;
        textDisplay: string;
        authorDisplayName: string;
    }

    /**
     * Metadata de un video (snippet + statistics). Las cuentas son `null` cuando
     * el video oculta sus estadísticas (se distingue de un 0 real).
     */
    interface VideoMetadata {
        id: string;
        channelId: string;
        title: string;
        description: string;
        tags: string[];
        viewCount: number | null;
        likeCount: number | null;
        commentCount: number | null;
        publishedAt: string;
    }

    /** Un resultado de búsqueda (search.list), ya filtrado a videos. */
    interface SearchHit {
        videoId: string;
        channelId: string;
        title: string;
        publishedAt: string;
    }

    /** Valores de `order` que acepta search.list; cualquier otro lanza TypeError. */
    type SearchOrder = 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';

    interface SearchOptions {
        /** Páginas a traer (default 1). Cada página cuesta 100 unidades de cuota. */
        maxPages?: number;
        /** Orden de resultados (default 'relevance'). */
        order?: SearchOrder;
        /** Resultados por página, 1..50 (default 50). Fuera de rango lanza TypeError. */
        pageSize?: number;
    }

    interface PageOptions {
        /** Tamaño de página. */
        pageSize?: number;
    }

    /** Error base de la API de YouTube; distingue el fallo por `status`/`reason`. */
    class YouTubeApiError extends Error {
        status?: number;
        reason?: string;
        cause?: unknown;
    }
    /** 429 / rate-limit excedido. */
    class RateLimitError extends YouTubeApiError {
        /** Espera sugerida por el header `Retry-After` (ms), acotada a un tope. */
        retryAfterMs?: number;
    }
    /** Cuota diaria agotada. */
    class QuotaExceededError extends YouTubeApiError {}
}

/**
 * Cliente de la YouTube Data API v3.
 *
 * Los métodos que llaman a la API rechazan con la jerarquía tipada
 * {@link YoutubeClient.YouTubeApiError} (→ `RateLimitError` / `QuotaExceededError`):
 * discriminá el fallo con `instanceof`, no con regex del mensaje. Los métodos que
 * validan sus argumentos lanzan `TypeError` de forma sincrónica.
 *
 * @example
 * ```js
 * const YoutubeClient = require('youtube-fast-api');
 * const { RateLimitError, QuotaExceededError } = YoutubeClient;
 *
 * const yt = new YoutubeClient(process.env.YOUTUBE_API_KEY);
 *
 * try {
 *   // Paginador stateless: iterá comentarios sin cargar todo en memoria.
 *   for await (const comment of yt.comments('dQw4w9WgXcQ')) {
 *     console.log(comment.authorDisplayName, comment.textDisplay);
 *   }
 * } catch (err) {
 *   if (err instanceof QuotaExceededError) {
 *     // Cuota diaria agotada: reintentar mañana, no ahora.
 *   } else if (err instanceof RateLimitError) {
 *     // 429: err.retryAfterMs indica cuánto esperar.
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
declare class YoutubeClient {
    constructor(apiKey: string);

    // --- Comentarios ---
    /** Trae todos los comentarios de un video (pagina internamente). */
    getAllComments(videoId: string): Promise<YoutubeClient.Comment[]>;
    /**
     * Paginador stateless: cada valor es una página (array) de comentarios.
     * @throws {TypeError} Si `videoId` no es un string no vacío (sincrónico).
     * @throws {YoutubeClient.YouTubeApiError} Si la API falla al iterar
     *   (`RateLimitError` en 429, `QuotaExceededError` con la cuota agotada).
     */
    commentsPages(videoId: string, options?: YoutubeClient.PageOptions): AsyncGenerator<YoutubeClient.Comment[], void, unknown>;
    /** Paginador stateless: comentarios uno por uno. */
    comments(videoId: string, options?: YoutubeClient.PageOptions): AsyncGenerator<YoutubeClient.Comment, void, unknown>;
    /** @deprecated Usá `comments` / `commentsPages` (sin estado de instancia). */
    getPaginatedComments(videoId: string, pageSize?: number): Promise<YoutubeClient.Comment[]>;
    /** @deprecated Usá `comments` / `commentsPages`. */
    getNextCommentsPage(pageSize?: number): Promise<YoutubeClient.Comment[]>;

    // --- Videos de un canal (ids) ---
    /** Trae los ids de todos los videos de un canal, deduplicados. */
    getAllVideos(channelId: string): Promise<string[]>;
    /** Paginador stateless: cada valor es una página (array) de videoIds. */
    channelVideoPages(channelId: string, options?: YoutubeClient.PageOptions): AsyncGenerator<string[], void, unknown>;
    /** Paginador stateless: videoIds uno por uno. */
    channelVideos(channelId: string, options?: YoutubeClient.PageOptions): AsyncGenerator<string, void, unknown>;
    /** Trae los ids de las playlists de un canal, deduplicados. */
    getPlaylist(channelId: string): Promise<string[]>;
    /** @deprecated Usá `channelVideos` / `channelVideoPages`. */
    getPaginatedChannelVideos(channelId: string, pageSize?: number): Promise<string[]>;
    /** @deprecated Usá `channelVideos` / `channelVideoPages`. */
    getNextVideosPage(pageSize?: number): Promise<string[]>;

    // --- Metadata / búsqueda ---
    /**
     * Metadata de varios videos (parte internamente en chunks de 50). El resultado
     * viene en el ORDEN DE ENTRADA reconciliado por id; los ids que la API omite
     * (privados/borrados) NO aparecen — matchear por `.id`, no por índice.
     */
    /**
     * @throws {TypeError} Si `videoIds` no es un array (sincrónico).
     * @throws {YoutubeClient.YouTubeApiError} Si la API falla.
     */
    getVideosMetadata(videoIds: string[]): Promise<YoutubeClient.VideoMetadata[]>;
    /** Metadata de un solo video; `null` si la API no lo encontró. */
    getVideoMetadata(videoId: string): Promise<YoutubeClient.VideoMetadata | null>;
    /**
     * Búsqueda por término (descubrimiento/trending).
     * @throws {TypeError} Si `query` no es string, o si `options.order`/`pageSize`
     *   están fuera de rango (sincrónico).
     * @throws {YoutubeClient.YouTubeApiError} Si la API falla.
     * @example
     * ```js
     * // 2 páginas (200 unidades de cuota), ordenado por fecha.
     * const hits = await yt.searchVideos('lofi', { maxPages: 2, order: 'date' });
     * ```
     */
    searchVideos(query: string, options?: YoutubeClient.SearchOptions): Promise<YoutubeClient.SearchHit[]>;
}

// La jerarquía de errores (YouTubeApiError/RateLimitError/QuotaExceededError) queda
// accesible como `YoutubeClient.RateLimitError` vía el namespace de arriba, que el
// runtime respalda re-exportándola en module.exports.
