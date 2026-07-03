# Contribuir

Gracias por tu interés. Este repo es un monorepo de npm-workspaces con dos paquetes
publicables (`packages/youtube-fast-api`, `packages/google-sheets-wizard`).

## Setup

```bash
npm ci        # instala deps de todos los workspaces
```

## Gates (lo que corre CI, y lo que se espera en verde antes de mergear)

CI corre en Node 18/20/22:

```bash
npm run lint          # eslint en cada paquete
npm run build         # compila lo que aplique (TS)
npm test              # suites de tests de cada paquete
npm run test:types    # type-tests (tsd) de los paquetes tipados
```

Además hay un job de presupuesto de tamaño de bundle (`size-limit`, ver `.size-limit.json`).

Un cambio no se mergea sin todos los gates en verde. Si tocás dominio/lógica, dejá un
test que lo cubra; si cambiás un contrato público, documentá el cambio en el `CHANGELOG.md`
del paquete.

## Estilo de commits

Conventional Commits en español (`feat(scope): …`, `fix(…)`, `chore(…)`), mensaje neutro
que describa el cambio.

## Reportar problemas

Abrí un issue en https://github.com/damiansire/google-api-wrappers/issues con un caso
reproducible mínimo.
