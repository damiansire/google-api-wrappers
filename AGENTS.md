# AGENTS.md

Guía operativa para agentes de código (y humanos con prisa) que trabajan en este repo.
Para el proceso de contribución humano, ver [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Qué es esto

Monorepo de **npm workspaces** con dos librerías publicables e independientes:

| Paquete | Ruta | Lenguaje | Build |
|---|---|---|---|
| `youtube-fast-api` | `packages/youtube-fast-api` | JS + `.d.ts` a mano | no compila (JS puro) |
| `google-sheets-wizard` | `packages/google-sheets-wizard` | TypeScript | `tsc` → `dist/` |

Cada uno se publica a npm bajo su propio nombre y se versiona **independiente** (Changesets).

## Comandos (desde la raíz)

```bash
npm ci                     # instala deps de todos los workspaces
npm run lint               # eslint 9 flat config (raíz), JS + TS
npm run build              # tsc en los paquetes que compilan (--if-present)
npm test                   # tests de cada paquete (node:test / jest)
npm run test:types         # type-tests (tsd) del API público
npm run check:pack --workspaces --if-present   # publint + are-the-types-wrong sobre el tarball real
npm run lint:circular      # dpdm: falla si hay imports circulares
npm run size               # presupuesto de tamaño (size-limit)
npm run changeset          # registrar un cambio para el próximo release
```

**Puerta local completa** antes de dar algo por terminado: `bash verify.sh`
(corre lint → build → test → test:types → check:pack → lint:circular). CI corre lo mismo
en Node **20/22** (18 salió del matrix por EOL).

## Reglas para agentes (duras)

- **No `npm publish` ni bumpear `version`** de ningún paquete: el release es decisión del
  dueño. Registrás el cambio con `npm run changeset` y nada más.
- **Prueba real antes de "listo".** No alcanza con "el gate está verde": si tocaste código
  que llama a la API de Google, hacé una llamada real cuando haya credenciales (leídas de
  env / archivo gitignored — **nunca** pegadas en el chat). Si no hay credenciales, decilo
  explícito en vez de simular.
- **Compatibilidad hacia atrás.** `engines.node >=14`, target `es2016`, CJS. No introduzcas
  sintaxis/APIs que rompan Node viejo sin un fallback (mirá cómo lo resuelve el código
  existente, p.ej. `error.cause` seteado a mano en vez del constructor ES2022).
- Si tocás dominio/lógica, dejá el test que lo cubre.

## Invariantes de diseño (el "por qué" — no los rompas)

Estas decisiones son deliberadas; un cambio que las viole es una regresión aunque el gate
pase:

1. **Una librería no ensucia stdout/stderr.** Nada de `console.log`/`console.error`: los
   errores se enriquecen y se re-lanzan para que el consumidor decida cómo loguearlos.
2. **Vacío ≠ error.** Un rango/página sin datos devuelve `[]`, no lanza. Las excepciones se
   reservan para fallos reales de la API (no obligar al consumidor a string-matchear
   "No data found").
3. **Los tipos no mienten.** Se coerciona lo que la API realmente entrega (celdas de Sheets
   como `string` con FORMATTED_VALUE) en vez de un `as` de confianza. Si el tipo público
   dice `string`, en runtime es `string`.
4. **Errores tipados, no strings.** Jerarquía `YouTubeApiError` → `RateLimitError` /
   `QuotaExceededError`, con `status`/`reason`/`retryAfterMs`. El consumidor discrimina por
   `instanceof`, no por regex del mensaje.
5. **Reintentos con criterio.** Backoff exponencial con jitter, respetando `Retry-After`
   **acotado** a un tope. Sólo reintenta lo transitorio (5xx, 429, ECONNRESET/timeout);
   un parse-error o un 403 de cuota es permanente y no se reintenta.
6. **Paginación stateless.** Async-generators que no guardan cursor en el objeto; el estado
   vive en el stack de la iteración.
7. **`googleapis` es peerDependency** en Sheets: el consumidor trae su propia versión, no se
   duplica en el árbol.
8. **Grafo de imports unidireccional.** Sin ciclos (lo gatea `lint:circular`); un tipo se
   define donde se usa y el barrel lo re-exporta, no al revés.

## Entorno

Windows/PowerShell primario. Algunos linters de binario nativo (knip, sherif) están
bloqueados por AppLocker en dev; el gate usa herramientas JS puras (dpdm, publint, attw).
