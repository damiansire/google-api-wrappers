---
"google-sheets-wizard": patch
---

- `getRange` devuelve `[]` ante un rango vacío en vez de lanzar (un rango sin datos es
  un resultado normal, no un error).
- El tipo `Cell` pasa a `string` (lo que la API devuelve con el render por defecto) en
  vez de prometer `number | boolean` que no llegan en runtime; se elimina el cast
  `as Row[]` sin validación.
- Empaquetado verificado con `publint` + `arethetypeswrong` (tipos resuelven en
  node10/node16/bundler). engines `>=14`. Publicado con provenance (npm/Sigstore).
- **`googleapis` pasa a `peerDependency`** (`>=130`) en vez de dependency: el consumidor
  provee su propia copia (la misma con la que crea el `auth`), evitando doble copia y
  skew de versión — coherente con lo que el README ya indicaba. Puede requerir que el
  consumidor agregue `googleapis` a sus deps (revisar semver al publicar).
