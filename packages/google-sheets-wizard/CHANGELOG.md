# google-sheets-wizard

## 0.1.0

### Minor Changes

- b32043c: - Nuevo método `getRanges(ranges, objectKeys?)`: lee varias ranges de la misma
  spreadsheet en el menor número de llamadas HTTP posible, vía el endpoint real
  de la Sheets API `spreadsheets.values.batchGet` (en vez de un `getRange` por
  range). `result[i]` corresponde a `ranges[i]` (la API preserva el orden
  pedido); cada entrada sigue las mismas reglas que `getRange` (rango vacío
  -> `[]`, `objectKeys` mapea a objetos).
  - Sin un tope documentado por Google para el número de ranges por `batchGet`
    (ver `docs/adr/0001-low-zero-dependency.md`), listas largas se parten en
    chunks de 100 ranges por default para no arriesgar un 400 por URL demasiado
    larga (`ranges` viaja como query params repetidos en el GET).
  - **Alcance de esta iteración**: solo lectura (`batchGet`). El batching de
    escritura (`spreadsheets.values.batchUpdate`) queda para una iteración
    futura — no está cubierto acá.

### Patch Changes

- 408c1db: - `getRange` devuelve `[]` ante un rango vacío en vez de lanzar (un rango sin datos es
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

Este changelog se genera automáticamente con [Changesets](https://github.com/changesets/changesets)
a partir de los archivos en `.changeset/`. Las entradas históricas aparecen debajo al hacer un release.
