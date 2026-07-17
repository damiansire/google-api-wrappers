# Estado de release vs npm (inventario de drift)

Chequeo `npm view <pkg> version` (registro) contra `package.json` local, misma regla
usada en el barrido de `ts-toolkit`. Corrido: 2026-07-17.

| Paquete | Local (`package.json`) | npm (registro) | Drift |
|---|---|---|---|
| `youtube-fast-api` | 2.1.0 | 2.0.2 | **Sí** — local va 1 minor adelante del registro; ese 2.1.0 nunca se publicó vía el pipeline de Changesets. |
| `google-sheets-wizard` | 0.0.2 | 0.0.2 | No, coinciden. |

## Por qué hay drift en `youtube-fast-api`

El bump a 2.1.0 se hizo a mano en el commit `aaea706` ("bump a 2.1.0"), fuera del flujo
de Changesets (`npm run version-packages` / merge del PR "Version Packages"). Por eso
el registro sigue en 2.0.2: nadie corrió `changeset publish` para esa versión.

## PR de Changesets abierto sin mergear

Existe la rama remota `origin/changeset-release/main` con un PR **#1 "Version
Packages" abierto desde 2026-07-09** (`gh pr list` lo confirma). Si se mergea, el
workflow `release.yml` (trigger: push a `main`) corre `changesets/action` y **publica a
npm** (`npm run release` → `changeset publish`), dejando:

- `youtube-fast-api` → 2.2.0 (consume el changeset `youtube-hardening.md`)
- `google-sheets-wizard` → 0.1.0 (consume `sheets-getrange.md` + `sheets-batch-read.md`)

Esto es una **decisión del dueño** (regla de AGENTS.md: "no bumpear version ni
publicar"), no algo que un agente deba resolver mergeando el PR. Este documento deja
la foto real para que la decisión de mergear (o no) se tome con el estado exacto
delante, no adivinando contra un CHANGELOG vacío.

## Nota

Los `CHANGELOG.md` de ambos paquetes están vacíos (solo el boilerplate de Changesets):
ningún release pasó todavía por el pipeline automatizado end-to-end en este repo.
