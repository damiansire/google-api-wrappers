# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Changed
- `getRange` devuelve una lista vacía (`[]`) cuando el rango no tiene datos, en vez
  de lanzar un error. Un rango vacío es un resultado normal de negocio, no un fallo;
  las excepciones quedan reservadas para errores reales de la API.
