# 0001. Low/zero runtime dependencies

## Contexto

Confirmado en el código: ni `youtube-fast-api` ni `google-sheets-wizard`
declaran una sección `dependencies` en su `package.json` — ambos paquetes son
runtime-zero-dependency (los `devDependencies` sí existen: TypeScript, Jest,
tsd, eslint, etc., pero no viajan al consumidor). Este ADR documenta por qué,
dado que existen SDKs oficiales de Google (`googleapis`) que resolverían la
integración con menos código propio.

## Decisión

Se implementan wrappers propios sobre `fetch` en vez de adoptar el SDK oficial
`googleapis` (o equivalentes de terceros).

## Motivos

- **Superficie de instalación**: `googleapis` es un paquete grande que trae
  clientes para docenas de APIs de Google que este repo no usa (Drive,
  Calendar, Gmail, etc.) — instalarlo para consumir solo YouTube Data API y
  Sheets API es pagar peso muerto en el árbol de dependencias del consumidor.
- **Superficie de auditoría de seguridad**: cero dependencias runtime propias
  significa cero vulnerabilidades de terceros heredadas en producción — el
  único código que corre en el consumidor es el que está en este repo.
- **API mínima y tipada a propósito**: `google-sheets-wizard` expone
  deliberadamente una API chica (`getRange` + mapeo opcional a objetos) en vez
  de replicar la superficie completa de la Sheets API — el objetivo no es
  "wrapper 1:1 del SDK", es una capa fina para los casos de uso reales del
  autor.

## Trade-offs aceptados

- **Mantenimiento propio de las llamadas HTTP**: si Google cambia un endpoint
  o un formato de respuesta, hay que actualizar el wrapper a mano — el SDK
  oficial lo haría por vos. Mitigado en parte por los tests de integración
  (gaw-2 ya cubre reintentos/backoff ante 429/5xx en `youtube-fast-api`).
  Paginación/batching de Sheets API todavía no está cubierta (gaw-3, pendiente).
- **Sin soporte OAuth2 completo del SDK oficial**: si en el futuro se necesita
  un flujo de auth más complejo que API key/token simple, esto puede quedar
  corto y ser motivo real para reconsiderar `googleapis`.

## Alternativas descartadas

- **`googleapis` (SDK oficial)**: descartado por el motivo de superficie de
  arriba — resolvería el problema pero a costo de bundle y de una API que no
  se necesita en su totalidad.
- **Otros wrappers de terceros en npm**: no evaluados en profundidad porque el
  costo de escribir el wrapper propio (fetch + tipos) fue bajo dado el alcance
  acotado (2 endpoints de YouTube, 1 de Sheets).

## Consecuencias

Mientras el repo no necesite más superficie de la API de Google de la que ya
cubre, esta decisión se mantiene. Si se agrega soporte para otro producto de
Google (Drive, Calendar) vale la pena reevaluar si seguir sumando wrappers
propios uno por uno sigue siendo más barato que adoptar el SDK oficial.
