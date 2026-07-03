# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Changed
- `getRange` devuelve una lista vacía (`[]`) cuando el rango no tiene datos, en vez
  de lanzar un error. Un rango vacío es un resultado normal de negocio, no un fallo;
  las excepciones quedan reservadas para errores reales de la API.
- El tipo `Cell` pasa a ser `string` (lo que la API devuelve con el render por defecto)
  en vez de `string | number | boolean | null`, que prometía tipos que el consumidor no
  recibe en runtime.

### Verificación de empaquetado (compatibilidad)
- CI corre `publint` + `arethetypeswrong` sobre el tarball real: los tipos y exports
  resuelven en node10, node16 (CJS y ESM) y bundlers. **Compat mantenida a propósito:**
  se ignora la regla `missing-export-equals` de attw — el paquete usa
  `module.exports = Class` para que `require(...)` devuelva la clase directo (ergonomía
  CJS) y para conservar los imports de tipos por nombre (`import { SheetsAuth }`); el
  "fix" de attw (`export =`) rompería ambos. Se prioriza la compatibilidad del consumidor
  sobre el veredicto perfecto de la herramienta.
