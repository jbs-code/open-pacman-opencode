# SPEC 03 — Power pellets y modo asustado

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-28
> **Objective:** Añadir 4 power pellets al laberinto; al comelas, los fantasmas entran en modo asustado ~6s y Pac-Man puede comérselos, devolviéndolos a la pen como ojos.

## Por qué existe este spec

Hoy la única interacción con los fantasmas es perder vida. Sin power pellets el juego no tiene momento de venganza ni tensión táctica: se busca el bucle clásico comer→huir→castigar que da identidad al Pac-Man.

## Scope

**In:**

- `src/js/maze.js`: tile `4` (power pellet), nuevo char `'o'`, en las 4 esquinas clásicas: `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)` (hoy son dots).
- `src/js/game.js`:
  - Constantes `FRIGHT_FRAMES = 360` (~6s), `FLASH_FRAMES = 120` (últimos ~2s) y `GHOST_EAT_POINTS = [200, 400, 800, 1600]`.
  - `game.frightTimer` y `game.ghostsEaten` (combo de la ronda actual).
  - Comer pellet (tile 4): +50 pts, `dotsRemaining--`, `frightTimer = FRIGHT_FRAMES`, `ghostsEaten = 0`.
  - Fantasma asustado: decide en cada celda la dirección que **más aumenta** la distancia a Pac-Man (mismo greedy/no-180 que ya existe, target invertido).
  - Fantasma comido → `ghost.state = 'eyes'`: navega a `PEN_EXIT {13,11}`; al llegar, reaparece en su celda de `GHOST_STARTS`, `dir: 'up'`, `state: 'normal'`. No se re-encola (sigue `released: true`).
  - Colisión: ojos no matan ni mueren; asustado = comer fantasma (`GHOST_EAT_POINTS[ghostsEaten]`, luego `ghostsEaten++`); normal = perder vida como hoy.
  - `resetPositions()` limpia `frightTimer`, `ghostsEaten` y estados de fantasma.
- `src/js/render.js`: dibujar pellets (tile 4 → círculo amarillo radio 6, estático); fantasmas asustados en azul `#2121ff`, parpadeando blanco/azul (cada ~8 frames) en `frightTimer <= FLASH_FRAMES`; ojos = solo los ojos (sin cuerpo).
- Victoria: pellets cuentan en `dotsRemaining` (contados en `createGame` junto a los dots).

**Out of scope (for future specs):**

- Puntos flotantes (`200`/`400`/…) sobre el canvas.
- Sonidos (comer pellet, fantasma comido).
- Velocidad reducida de los asustados o revertir su dirección al activar el modo.
- Modo asustado progresivo por nivel (más corto en niveles altos).
- Scatter/chase, Cruise Elroy, HUD de combo.

## Data model

```js
// maze.js — 'o' = 4 (power pellet), en las 4 esquinas
if ( ch === 'o' ) return 4;

// game.js
const FRIGHT_FRAMES = 360;                 // ~6s a 60fps
const FLASH_FRAMES = 120;                  // parpadeo de aviso (últimos 2s)
const GHOST_EAT_POINTS = [ 200, 400, 800, 1600 ];

// createGame()
frightTimer: 0,   // frames restantes de modo asustado
ghostsEaten: 0,   // fantasmas comidos desde el último pellet o muerte
// dotsRemaining cuenta tiles 2 (dots) y 4 (pellets)

// por fantasma
state: 'normal',  // 'normal' | 'eyes'

// ghost-behaviors.js — decideGhostBehavior( game, g )
// g.state === 'eyes'            → target PEN_EXIT (anula todo)
// game.frightTimer > 0          → target = celda que más distancia tiene a Pac-Man
// si no                         → comportamiento clásico por kind
```

Convenciones: mismas unidades de frames que `RELEASE_EVERY`/`PACMAN_SPEED`; origen arriba-izquierda.

## Implementation plan

1. En `src/js/maze.js`, cambiar los 4 dots de esquina por `'o'` y añadir `parseTile` para `4`. Prueba: 4 círculos grandes en las esquinas, el resto igual, consola limpia.
2. En `src/js/game.js`: constantes, `frightTimer`/`ghostsEaten` en `createGame()` (contando pellets en `dotsRemaining`) y consumo del tile 4 en `movePacman` (+50, activar asustado). Prueba: comer un pellet suma 50 y el contador baja; fantasmas aún sin cambios de comportamiento.
3. En `ghost-behaviors.js`: fantasma asustado huye (maximiza distancia) y ojos apuntan a `PEN_EXIT`. Prueba: con `frightTimer > 0` los fantasmas se alejan; un fantasma forzado a `state: 'eyes'` va a la pen.
4. En `update()`: decrementar `frightTimer`; resolver colisión con la matriz de estados (comer asustado / perder vida / ignorar ojos). En `moveGhost`, ojos llegados a `PEN_EXIT` reaparecen en su `GHOST_STARTS`. Prueba: comer un fantasma asustado da 200 y vuelve como ojos a la pen; chocar con uno normal mata como antes.
5. En `src/js/render.js`: `drawPowerPellets`, color asustado/parpadeo y dibujo de solo-ojos en `drawGhost`. Prueba: fantasmas azules ~6s con parpadeo final y cuerpo sin forma al ser comidos.

## Acceptance criteria

- [ ] `src/index.html` carga los 5 scripts sin errores en consola (sin scripts nuevos).
- [ ] Hay exactamente 4 power pellets en `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`, dibujados más grandes que los dots.
- [ ] Comer un pellet suma 50 puntos y reduce `dotsRemaining` en 1.
- [ ] Tras comer un pellet, los 4 fantasmas huyen (eligen la dirección que más aumenta la distancia a Pac-Man) durante ~360 frames (±2).
- [ ] En los últimos ~120 frames del asustado, los fantasmas parpadean blanco/azul.
- [ ] Chocar con un fantasma asustado lo convierte en ojos y otorga 200/400/800/1600 pts según el orden en la ronda; no pierde vida.
- [ ] Los ojos no matan a Pac-Man ni vuelven a ser comidos, y vuelven a su celda de la pen (estado `normal`) sin re-encolarse.
- [ ] Comer un segundo pellet reinicia el timer y el combo (`ghostsEaten = 0`).
- [ ] Chocar con un fantasma normal sigue restando vida; al morir se limpian asustado, combo y estados.
- [ ] La partida solo se gana al comer dots **y** los 4 pellets.
- [ ] Dots, velocidad, liberación de la pen y colisiones sin pellet funcionan igual que antes.

## Decisions

- **Sí:** pellets como tile `4` en `MAZE_STR` (`'o'`). **No:** array aparte `POWER_PELLETS` duplicado: la grid ya es la fuente de verdad de dots y se copia en `createGame`.
- **Sí:** huir = maximizar distancia Manhattan (determinista). **No:** azar puro: rompe el enfoque greedy del juego y es difícil de verificar.
- **Sí:** 360 frames con parpadeo de aviso (decidido con el usuario). **No:** otros tiempos ni escalado por nivel (otro spec).
- **Sí:** ojos navegan por el mismo greedy a `PEN_EXIT` y reaparecen al llegar (decidido con el usuario). **No:** respawn instantáneo en la pen ni vuelo en línea recta estilo arcade (más estados/rectas de colisión).
- **Sí:** puntos 200→1600 por combo con reinicio en pellet y muerte (decidido con el usuario). **No:** 200 fijo.
- **Sí:** pellets cuentan para la victoria (decidido con el usuario). **No:** bonificación opcional.
- **Sí:** feedback visual solo (azul + parpadeo + ojos). **No:** texto flotante ni sonidos (otro spec).
- **Sí:** toda la lógica en archivos existentes (`game.js`, `ghost-behaviors.js`, `render.js`, `maze.js`). **No:** archivo `power-pellets.js` nuevo: no hay masa suficiente para justificar otro `<script>`.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Ojos atascados en bucle greedy alrededor de muros camino a `PEN_EXIT` | El maze es simétrico y la pen solo tiene una entrada; se prueba manualmente comiendo un fantasma lejos de la pen. |
| Fantasma asustado dentro de la pen (no liberado) | La espera por `released` tiene prioridad en `moveGhost`: la oscilación no cambia; el modo solo afecta a liberados. |
| Parpadeo dependiente de `frame` de `main.js` | `draw()` ya recibe `frame`; sin estado nuevo en render. |
| Comer pellet justo al chocar con un fantasma el mismo frame | `update()` mueve a Pac-Man (come pellet) antes de comprobar colisiones: el fantasma ya es comible. Consistente y documentado. |
| Cambio en `dotsRemaining` rompe el final de partida | `createGame` cuenta tiles 2 y 4 con el mismo bucle; criterio de victoria cubierto en acceptance. |

## What is **not** in this spec

- Puntos flotantes, sonidos, música.
- Velocidad extra de fantasmas asustados ni reversión al activar.
- Modo asustado escalado por nivel.
- Scatter/chase, Cruise Elroy, colisión entre fantasmas.
