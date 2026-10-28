# SPEC 02 — Liberación por temporizador de los fantasmas en la pen

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-27
> **Objective:** Liberar los 4 fantasmas de la pen uno cada ~1.5s mediante un temporizador de frames, para que salgan ordenados sin depender de la posición de Pac-Man.

## Por qué existe este spec

Hoy `ghostTarget()` aplica `PEN_EXIT` a **todos** los fantasmas de `PEN_BOX` a la vez. Los 4 compiten por la misma salida con elección greedy sin giro 180, se estorban y algunos quedan atascados o deambulan hasta que Pac-Man se acerca arriba. Se busca liberación por cola con temporizador, estilo arcade.

## Corrección tras implementación

Al probar la SPEC 02, los fantasmas liberados llegaban a la línea de la puerta (fila 12) pero se quedaban oscilando sin cruzar. Causa: `isInsidePen()` usa `PEN_BOX` con `y1: 13`, y la puerta está en la fila 12. Al pisar la puerta el fantasma dejaba de apuntar a `PEN_EXIT` y pasaba a persecución, que lo halaga de lado en vez de subir. Corrección: incluir la fila de la puerta en la zona de salida (`PEN_BOX.y1: 13 → 12`) en `src/js/ghost-behaviors.js`.

## Scope

**In:**

- `src/js/game.js`: campo `penTimer` (frames desde el inicio de la ronda) y, por fantasma, `releaseAt` y `released`.
- Constante `RELEASE_EVERY = 90` (~1.5s a 60fps) en `game.js`.
- Orden de liberación = orden de `GHOST_STARTS`: blinky al instante (`releaseAt: 0`), pinky a los 90 frames, inky a 180, clyde a 270.
- Fantasmas no liberados: se mueven oscilando en horizontal dentro de la fila 14 de la pen, sin cruzar la puerta.
- `resetPositions()` reinicia la cola completa al perder una vida.
- Un fantasma liberado que reentre por la puerta sale sin esperar (no se re-encola).

**Out of scope (for future specs):**

- Cambios en `render.js` (feedback visual de espera/liberación) ni en `main.js`.
- Escalado de tiempos por nivel (release más rápido en niveles altos).
- Modo asustado, scatter/chase, power pellet.
- Colisión entre fantasmas.
- Ajuste fino del "bobbing" vertical estilo arcade dentro de la pen.

## Data model

```js
// game.js
const RELEASE_EVERY = 90; // frames (~1.5s a 60fps)

// ghost-behaviors.js — PEN_BOX incluye la fila de la puerta (12)
const PEN_BOX = { x1: 11, y1: 12, x2: 16, y2: 15 };

// createGame()
penTimer: 0, // frames transcurridos desde el inicio de la ronda
ghosts: GHOST_STARTS.map( ( g, i ) => ( {
  // ...campos actuales...
  releaseAt: i * RELEASE_EVERY, // blinky 0, pinky 90, inky 180, clyde 270
  released: i === 0,            // solo blinky sale al instante
} ) ),
```

Regla de espera (los no liberados):

- No llaman a `decideGhostBehavior`.
- Oscilan en horizontal en su fila de inicio (14): avanzan en su dirección actual y la invierten 180° al no poder (muros de pen en cols 10 y 17).
- La pen solo se puede dejar por arriba (puerta cols 13-14), y la oscilación nunca apunta verticalmente: un no liberado no puede salir.

Convenciones: origen arriba-izquierda, coordenadas en celdas, tiempos en frames (mismo eje que `PACMAN_SPEED`/`GHOST_SPEED`).

## Implementation plan

1. En `src/js/game.js`, añadir `RELEASE_EVERY`, `game.penTimer = 0` en `createGame()`, y `releaseAt`/`released` por fantasma. Prueba: el juego se ve igual que antes (nadie consume los campos todavía), consola limpia.
2. En `update()`, incrementar `penTimer` y marcar `released = true` cuando `penTimer >= releaseAt`. En `moveGhost()`, un fantasma no liberado no llama a `decideGhostBehavior` ni se mueve. Prueba: solo blinky sale de la pen; los otros 3 esperan quietos en fila 14.
3. En `moveGhost()`, implementar la oscilación horizontal de los no liberados (avanzar en la dirección actual; si `canMove` es falso, invertir 180°). Prueba: los 3 en espera van y vienen en la fila 14 sin cruzar la puerta.
4. En `resetPositions()`, reiniciar `penTimer = 0`, restaurar `dir` de espera y `released` según el índice (`i === 0`). Prueba: al chocar con un fantasma, los 4 vuelven a la pen y la cola se repite (blinky al instante, resto cada ~1.5s).

## Acceptance criteria

- [ ] `src/index.html` carga los 5 scripts sin errores en consola.
- [ ] Con Pac-Man quieto en la zona de abajo (su celda inicial) durante toda la partida, los 4 fantasmas terminan fuera de la pen (y ≤ 11, cruzadas la puerta y la fila de salida).
- [ ] Blinky cruza la puerta en el primer frame de la ronda; pinky, inky y clyde la cruzan hacia los frames 90, 180 y 270 respectivamente (±2 frames).
- [ ] Ningún fantasma liberado se queda oscilando en la fila de la puerta (12): al alcanzarla sigue apuntando a `PEN_EXIT` hasta quedar fuera (y ≤ 11), sin depender de la posición de Pac-Man.
- [ ] Ningún fantasma no liberado sale de `PEN_BOX` ni cruza la puerta.
- [ ] Los fantasmas no liberados oscilan en horizontal en la fila 14 sin salir de la pen.
- [ ] Un fantasma no liberado no ejecuta `decideGhostBehavior`.
- [ ] Un fantasma liberado que reentre por la puerta vuelve a salir de inmediato, sin esperar su turno otra vez.
- [ ] Al perder una vida, `penTimer` vuelve a 0, solo blinky queda `released` y la cola se repite.
- [ ] Comer dots, colisiones, vidas, puntuación y velocidades (`0.1`/`0.125` celda/frame) funcionan igual que antes.

## Decisions

- **Sí:** contador global `penTimer` en frames + `releaseAt` por fantasma. **No:** `performance.now()` ni `setTimeout`: introduce un eje temporal distinto al resto del juego (todo es por frame).
- **Sí:** orden de liberación = orden de `GHOST_STARTS`. **No:** array/constante de orden aparte: duplicaría la fuente de verdad.
- **Sí:** blinky sale al instante (`releaseAt: 0`). **No:** primer release a los 1.5s: el clásico empieza con el rojo ya fuera persiguiendo.
- **Sí:** reiniciar la cola completa al morir (decidido con el usuario). **No:** conservar quién ya salió: menos tensión y más estados que rastrear.
- **Sí:** no re-encolar tras reentrada (decidido con el usuario). **No:** cola de reentrada: añade estados sin beneficio jugable claro.
- **Sí:** los que esperan oscilan horizontalmente en fila 14 (decidido con el usuario: estilo arcade). **No:** quietos en su celda; **no:** deambular 2D por la pen (bloqueos internos y más código).
- **Sí:** gating en `moveGhost` (no liberado no navega por target). **No:** target alterno en `ghostTarget`: mezclaría la espera con la navegación por objetivo y complica `isInsidePen`.
- **Sí:** incluir la fila de la puerta (12) en `PEN_BOX` (`y1: 13 → 12`). **No:** estado `exiting` explícito por fantasma: añade un campo y código para un caso que la constante ya resuelve, y aún así tendría que cubrir la reentrada sin re-encolar.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Fantasma en espera alineado con la puerta (cols 13-14) | La oscilación es solo horizontal: no puede cruzar la puerta por sí solo. |
| Fantasmas en espera y liberado comparten celda | No hay colisión fantasma-fantasma (ya aceptado en SPEC 01): no bloquea nada. |
| `penTimer` crece sin límite | Se reinicia al perder vida; `released` evita re-liberaciones, no depende del timer pasado. |
| Un liberado ya fuera cruza la fila de la puerta (12) al perseguir | Vuelve a apuntar `PEN_EXIT` un instante (microrrebote en cols 13-14 de la fila 12). Poco frecuente e inocuo; se acepta por simplicidad. |

## What is **not** in this spec

- Feedback visual o sonoro de la espera/liberación (otro spec si llega).
- Escalado de tiempos por nivel (otro spec si llega).
- Modo asustado, scatter/chase o power pellet (otro spec si llega).
- Colisión entre fantasmas (otro spec si llega).
