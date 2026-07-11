---
"google-sheets-wizard": minor
---

- Nuevo método `getRanges(ranges, objectKeys?)`: lee varias ranges de la misma
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
