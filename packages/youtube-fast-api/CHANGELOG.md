# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- **Tipos**: el paquete ahora envía `index.d.ts` (campo `types`), con type-tests
  `tsd`. Los consumidores TypeScript dejan de recibir `any`.
- **Paginadores stateless** (`comments`/`commentsPages`, `channelVideos`/`channelVideoPages`):
  async-iterators sin cursor en la instancia, seguros para paginar en paralelo.
- **Capa de red robusta** en `makeRequest`: reintento acotado con backoff exponencial
  + jitter que honra `Retry-After` (429/5xx), keep-alive, `res.on('error')` para cortes
  a mitad de body, y jerarquía de errores tipada (`YouTubeApiError`, `RateLimitError`,
  `QuotaExceededError`) accesible por `instanceof`.

### Changed
- `searchVideos` valida `pageSize`: un valor `< 1` o no numérico lanza `TypeError`
  (antes se clampeaba a `0`, produciendo un `maxResults=0` que la API rechaza).
- URLs construidas escapando todos los valores interpolados (`encodeURIComponent`).
- Loops de paginación usan `push(...)` en vez de `concat` (evita O(n²)).

### Deprecated
- `getPaginatedComments`/`getNextCommentsPage` y `getPaginatedChannelVideos`/`getNextVideosPage`:
  guardan el cursor en la instancia. Usá los paginadores stateless. Se removerán en la
  próxima major.

### Removed
- Código muerto interno de paginación por canal (reemplazado por el async-generator canónico).
