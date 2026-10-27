// ghost-behaviors.js
// Estrategia (target) de cada fantasma y elección de dirección compartida.
// Depende de globals de game.js: DIRS, OPPOSITE, canMove (se usa en tiempo de
// ejecución, por eso se carga después de game.js).

const DEBUG_GHOSTS = false;

// Interior de la pen (cols 11-16, filas 13-15) y celda de salida.
const PEN_BOX = { x1: 11, y1: 13, x2: 16, y2: 15 };
const PEN_EXIT = { x: 13, y: 11 };

// Cada estrategia devuelve la celda objetivo { x, y }.
const GHOST_BEHAVIORS = {
  blinky( game ) {
    const p = game.pacman;
    return { x: Math.round( p.x ), y: Math.round( p.y ) };
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

  return best;
}
