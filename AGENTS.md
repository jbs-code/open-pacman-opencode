# AGENTS.md

Proyecto de curso: clone de Pac-Man en JS vanilla (sin build, dependencias ni tests). Sirve para practicar Spec Driven Development.

## Cómo ejecutar

No hay servidor ni build. Abre `src/index.html` en un navegador (los scripts son clásicos, sin módulos, así que `file://` funciona).

## Arquitectura

`src/index.html` carga los scripts en este orden; comparten globals (no hay ES modules ni bundler — cambiar el orden o migrar a `import` rompe todo):

1. `src/js/maze.js` → laberinto: `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
2. `src/js/game.js` → estado y reglas: `createGame`, `update`
3. `src/js/render.js` → dibujo canvas: `draw`, `TILE`
4. `src/js/main.js` → bucle, teclado y overlay

`createGame()` copia `MAZE` a `game.grid` para comer dots sin destruir el original; `render.js` dibuja `game.grid`, nunca `MAZE`.

## Workflow spec-driven

Skills en `.agents/skills/` (fuente: `klerith/fernando-skills`, versionada en `skills-lock.json`):

- `/spec <descripción>` → crea el spec en `specs/NN-slug.md` con estado `Draft`. No escribe código.
- `/spec-impl NN-slug` → solo implementa specs en estado `Approved`/`Aprobado`; crea y cambia a la rama `spec-NN-slug`, avanza paso a paso con pausas para revisar diffs y **nunca commitea** sin petición explícita.

`specs/` aún no existe; el skill `/spec` la crea junto con `specs/.spec-config.yml` (`AutoCreateBranch: true` por defecto).

## Convenciones

- Comentarios y textos de UI en español; identificadores en inglés.
- Espacios dentro de paréntesis: `( row )`, `gameName( arg )`.
- Antes de tocar código, revisa si el cambio corresponde a un spec aprobado; si no lo está, proponerlo vía `/spec` en vez de implementarlo a sorpresa.
