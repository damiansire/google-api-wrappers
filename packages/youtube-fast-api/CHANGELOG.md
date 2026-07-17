# youtube-fast-api

## 2.2.0

### Minor Changes

- 408c1db: Capa de red de nivel producción y paginación stateless:

  - **Nuevo**: paginadores async-iterator sin estado (`comments`/`commentsPages`,
    `channelVideos`/`channelVideoPages`), seguros para paginar en paralelo. Los métodos
    con cursor de instancia quedan `@deprecated` (se removerán en la próxima major).
  - **Nuevo**: el paquete envía tipos (`index.d.ts`), verificados con `tsd` y
    `arethetypeswrong`. El consumidor TS deja de recibir `any`.
  - `makeRequest`: reintento con backoff exponencial + jitter que honra `Retry-After`
    (429/5xx), keep-alive, manejo del corte de stream, y errores tipados
    (`YouTubeApiError`/`RateLimitError`/`QuotaExceededError`).
  - `getVideosMetadata` reconcilia por id en orden de entrada (antes podía devolver
    datos desalineados en silencio). `searchVideos` valida `pageSize` y falla temprano.
  - URLs con todos los valores escapados (anti-inyección). engines `>=14`.

Este changelog se genera automáticamente con [Changesets](https://github.com/changesets/changesets)
a partir de los archivos en `.changeset/`. Las entradas históricas aparecen debajo al hacer un release.
