// ghost-behaviors.js
// Estrategia (target) de cada fantasma y elección de dirección compartida.
// Depende de globals de game.js: DIRS, OPPOSITE, canMove (se usa en tiempo de
// ejecución, por eso se carga después de game.js).

const DEBUG_GHOSTS = false;

// Zona de la pen (cols 11-16, filas 12-15) y celda de salida. Incluye la fila
// de la puerta (12) para que un liberado siga apuntando a PEN_EXIT hasta quedar
// fuera; si empezara en 13 dejaría de apuntar al cruzar la puerta y se atasca.
const PEN_BOX = { x1: 11, y1: 12, x2: 16, y2: 15 };
const PEN_EXIT = { x: 13, y: 11 };
const CLYDE_CORNER = { x: 0, y: 0 };
const CLYDE_SHY_RANGE = 8;

function pacmanCell( game ) {
  const p = game.pacman;
  return { x: Math.round( p.x ), y: Math.round( p.y ) };
}

// Celda a n pasos por delante de Pac-Man en su dirección actual.
function cellsAheadOfPacman( game, n ) {
  const cell = pacmanCell( game );
  const d = DIRS[ game.pacman.dir ];
  return { x: cell.x + d.x * n, y: cell.y + d.y * n };
}

// Cada estrategia devuelve la celda objetivo { x, y }.
const GHOST_BEHAVIORS = {
  blinky( game ) {
    return pacmanCell( game );
  },
  pinky( game ) {
    return cellsAheadOfPacman( game, 4 );
  },
  inky( game ) {
    const ahead = cellsAheadOfPacman( game, 2 );
    const blinky = game.ghosts.find( ( g ) => g.kind === 'blinky' );
    return { x: 2 * ( ahead.x - blinky.x ), y: 2 * ( ahead.y - blinky.y ) };
  },
  clyde( game, ghost ) {
    const p = pacmanCell( game );
    const dist = Math.abs( ghost.x - p.x ) + Math.abs( ghost.y - p.y );
    return dist > CLYDE_SHY_RANGE ? p : CLYDE_CORNER;
  },
};

function isInsidePen( ghost ) {
  const x = Math.round( ghost.x );
  const y = Math.round( ghost.y );
  return x >= PEN_BOX.x1 && x <= PEN_BOX.x2 && y >= PEN_BOX.y1 && y <= PEN_BOX.y2;
}

// Target efectivo: dentro de la pen manda PEN_EXIT, si no la estrategia del kind.
function ghostTarget( game, ghost ) {
  if ( isInsidePen( ghost ) ) return PEN_EXIT;
  return GHOST_BEHAVIORS[ ghost.kind ]( game, ghost );
}

// Elige la dirección que más reduce la distancia Manhattan al target.
// Sin giro de 180 (salvo callejón sin salida); desempate por orden de DIRS.
function decideGhostBehavior( game, ghost ) {
  const grid = game.grid;
  const target = ghostTarget( game, ghost );

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ ghost.dir ] && canMove( grid, ghost.x, ghost.y, dir, 'ghost' )
  );
  // Sin salida (callejón): permitir el giro de 180.
  const choices = options.length ? options : [ OPPOSITE[ ghost.dir ] ];

  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = Math.abs( ghost.x + d.x - target.x ) + Math.abs( ghost.y + d.y - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }

  if ( DEBUG_GHOSTS ) {
    console.debug(
      '[ghost]', ghost.kind,
      '| celda', { x: ghost.x, y: ghost.y },
      '| target', { x: target.x, y: target.y },
      '| dir', best
    );
  }

  return best;
}
