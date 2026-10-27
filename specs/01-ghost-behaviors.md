# SPEC 01 — Cuatro fantasmas con comportamiento propio

> **Status:** Draft
> **Depends on:** Ninguno
> **Date:** 2026-10-26
> **Objective:** Dar a los cuatro fantasmas un comportamiento de decisión propio —con Blinky persiguiendo agresivamente a Pac-Man— para que se distingan claramente al jugar.

## Por qué existe este spec

Hoy el juego solo tiene 2 fantasmas (`kind: 'hunter'` y `'random'`) y el color depende del índice del array. Se busca que cada fantasma se distinga por **cómo decide**, no solo por su color, manteniendo la misma regla de elección por celda que ya funciona.

## Scope

**In:**

- 4 fantasmas en `GHOST_STARTS` con kinds `blinky`, `pinky`, `inky`, `clyde` (fila 14, columnas 12-15, dentro de la pen).
- Archivo nuevo `src/js/ghost-behaviors.js`: estrategia (target) de cada kind y elección de dirección compartida.
- Regla de salida de la pen: target `{ x: 13, y: 11 }` mientras el fantasma esté dentro (cols 11-16, filas 13-15).
- Color por kind en `src/js/render.js` (deja de ser por índice).
- `<script>` nuevo en `src/index.html`.
- Flag `DEBUG_GHOSTS` con `console.debug` de cada decisión.

**Out of scope (for future specs):**

- Power pellet y modo asustado.
- Modos scatter/chase por temporizador.
- Cruise Elroy o velocidades distintas por fantasma.
- Sonidos y HUD con nombres de fantasmas.
- Cambios en colisión, vidas o puntuación.

## Data model

```js
// maze.js — los 4 dentro de la pen
const GHOST_STARTS = [
  { x: 12, y: 14, kind: 'blinky' },
  { x: 13, y: 14, kind: 'pinky' },
  { x: 14, y: 14, kind: 'inky' },
  { x: 15, y: 14, kind: 'clyde' },
];

// ghost-behaviors.js
const DEBUG_GHOSTS = false;
const PEN_BOX = { x1: 11, y1: 13, x2: 16, y2: 15 };
const PEN_EXIT = { x: 13, y: 11 };
const CLYDE_CORNER = { x: 0, y: 0 };
const CLYDE_SHY_RANGE = 8;

// Cada estrategia devuelve la celda objetivo { x, y }.
const GHOST_BEHAVIORS = { blinky, pinky, inky, clyde };
function decideGhostBehavior( game, ghost ); // → dirección elegida

// render.js — color por kind, ya no por índice
const GHOST_COLORS = {
  blinky: '#ff0000', pinky: '#ffb8ff', inky: '#00ffff', clyde: '#ffb852',
};
```

Target de cada kind (distancia Manhattan a la celda redondeada de Pac-Man = `p`):

| kind       | Target                                                        |
| ---------- | ------------------------------------------------------------- |
| `blinky`   | Celda de Pac-Man (perseguimiento directo, el agresivo).        |
| `pinky`    | 4 celdas por delante de Pac-Man en su dirección.               |
| `inky`     | `2 × (celda 2 por delante de p − celda de blinky)`.            |
| `clyde`    | Celda de Pac-Man si distancia > 8; si no, `CLYDE_CORNER`.      |
| cualquiera | Si el fantasma está en `PEN_BOX`: `PEN_EXIT` (anula lo anterior). |

Convenciones: origen arriba-izquierda, coordenadas en celdas; `GHOST_SPEED` sigue en `0.1` celda/frame para los 4.

## Implementation plan

1. Crear `src/js/ghost-behaviors.js` con `DEBUG_GHOSTS`, `PEN_BOX`, `PEN_EXIT`, la estrategia `blinky` y `decideGhostBehavior( game, ghost )` (resuelve target, aplica la regla de la pen y elige dirección entre las opciones sin giro 180). Añadir `<script src="js/ghost-behaviors.js">` en `src/index.html` justo después de `game.js`. Prueba: abrir `src/index.html`, consola limpia, el juego sigue igual (archivo aún sin cablear).
2. Añadir a `GHOST_BEHAVIORS` las estrategias `pinky`, `inky` y `clyde`. Prueba: misma carga sin errores; sin cambios visibles todavía.
3. Cambiar `GHOST_STARTS` en `src/js/maze.js` a los 4 kinds clásicos. En `src/js/game.js`, `moveGhost` llama a `decideGhostBehavior( game, g )` y se elimina `decideGhost`. Prueba: aparecen 4 fantasmas, salen de la pen por la puerta y actúan distinto (colores aún por índice).
4. En `src/js/render.js`, `GHOST_COLORS` pasa de array a objeto y `draw()` usa `GHOST_COLORS[ g.kind ]`. Prueba: rojo, rosa, cian y naranja según kind.
5. Completar el log de `DEBUG_GHOSTS` (kind, celda, target y dirección por decisión) y probarlo con `true`. Prueba en DevTools: se ve el log de los 4 fantasmas; dejar `DEBUG_GHOSTS = false` al cerrar.

## Acceptance criteria

- [ ] `src/index.html` carga los 5 scripts sin errores en consola.
- [ ] `GHOST_STARTS` tiene exactamente 4 entradas: `blinky`, `pinky`, `inky`, `clyde` en fila 14, dentro de la pen.
- [ ] Con Pac-Man en su posición inicial y sin moverlo, los 4 fantasmas quedan fuera de la pen (`y < 13`).
- [ ] Cada fantasma se pinta con el color de su kind: rojo, rosa, cian, naranja.
- [ ] `blinky` elige en cada celda la dirección que más reduce la distancia a la celda de Pac-Man.
- [ ] `pinky` apunta a la celda 4 por delante de Pac-Man en su dirección actual.
- [ ] `inky` apunta al doble del vector desde la celda de `blinky` hasta la celda 2 por delante de Pac-Man.
- [ ] `clyde` apunta a Pac-Man si la distancia Manhattan > 8, y a `(0,0)` si es ≤ 8.
- [ ] Ningún fantasma elige la dirección contraria a la que lleva, salvo en callejón sin salida.
- [ ] Con `DEBUG_GHOSTS = false` no se imprimen logs de decisiones de fantasmas.
- [ ] Con `DEBUG_GHOSTS = true` cada decisión imprime kind, celda, target y dirección.
- [ ] Comer dots, colisiones, vidas y velocidad (`0.1` celda/frame) funcionan igual que antes.

## Decisions

- **Sí:** comportamientos clásicos Blinky/Pinky/Inky/Clyde. **No:** inventar estilos nuevos ni conservar `hunter`/`random`: los clásicos son identificables y probados.
- **Sí:** agresividad = ruta más corta por celda (Manhattan). **No:** velocidad extra ni Cruise Elroy: amplía el spec y es difícil de verificar jugando.
- **Sí:** solo dirección por celda. **No:** timers scatter/chase ni modo asustado: van en otro spec.
- **Sí:** archivo nuevo `src/js/ghost-behaviors.js`. **No:** todo en `game.js` (se desordena) ni mover `moveGhost` completo (refactor innecesario).
- **Sí:** target de salida `PEN_EXIT {13,11}` dentro de la pen. **No:** camino guionizado estilo arcade (más código) ni dejarlo al azar (los fantasmas no saldrían: la pen solo sale arriba y Pac-Man empieza abajo).
- **Sí:** los 4 dentro de la pen (cols 12-15, fila 14). **No:** repartirlos por el mapa: `resetPositions` ya itera `GHOST_STARTS` por índice y no cambia.
- **Sí:** color por kind. **No:** color por índice: rompe si cambia el orden de `GHOST_STARTS`.
- **Sí:** distancia al target aunque esté en pared o fuera del mapa. **No:** buscar celda transitable: complejidad extra sin beneficio (el greedy igual rodea el muro).
- **Sí:** esquina de Clyde `(0,0)` estilo clásico. **No:** `(1,1)`.
- **Sí:** log con flag `DEBUG_GHOSTS` en `ghost-behaviors.js`. **No:** dibujar targets en canvas: obligaría a tocar `render.js` con lógica de depuración.
- **Sí:** desempate = primer mínimo en orden `left, right, up, down` (orden actual de `Object.keys(DIRS)`). **No:** orden clásico `up, left, down, right`: cambiaría el feel sin necesidad.

## Risks

| Riesgo                                                        | Mitigación                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ghost-behaviors.js` usa `DIRS`, `OPPOSITE` y `canMove` de `game.js` | Se carga después de `game.js` en `index.html` y solo se usan en tiempo de ejecución. |
| Target de Pinky/Inky/Clyde fuera del mapa o en pared          | Decidido: se calcula la distancia Manhattan tal cual; el target nunca se navega.     |
| 4 fantasmas en la pen pueden solaparse                        | No hay colisión entre fantasmas (solo fantasma-Pac-Man), así que no bloquea nada.    |
| Greedy lleva a varios fantasmas por la misma ruta             | Desempate fijo por orden de `DIRS`, determinista; aceptado por el alcance del spec.  |

## What is **not** in this spec

- Power pellet y modo asustado (otro spec si llega).
- Modos scatter/chase por temporizador (otro spec si llega).
- Velocidades distintas o Cruise Elroy (otro spec si llega).
- Sonidos, HUD con nombres de fantasmas.
- Cambios en colisión, vidas o puntuación.
