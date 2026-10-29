// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS, y de ghost-behaviors.js: decideGhostBehavior,
// PEN_EXIT (ambos en tiempo de ejecución, por eso se carga después).

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Modo asustado tras comer un power pellet: ~6s de duración, con parpadeo
// de aviso (blanco/azul) en los últimos ~2s.
const FRIGHT_FRAMES = 360;
const FLASH_FRAMES = 120;
// Puntos por fantasma comido en la ronda: 200, 400, 800, 1600.
const GHOST_EAT_POINTS = [ 200, 400, 800, 1600 ];

// Cadencia de liberación de la pen: un fantasma cada 90 frames (~1.5s a 60fps).
const RELEASE_EVERY = 90;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  // Dots (2) y power pellets (4) cuentan para la victoria.
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    penTimer: 0,    // frames transcurridos desde el inicio de la ronda
    frightTimer: 0, // frames restantes de modo asustado
    ghostsEaten: 0, // fantasmas comidos desde el último pellet o muerte
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      start: { x: g.x, y: g.y }, // celda de reaparición al volver de ser ojos
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      state: 'normal',           // 'normal' | 'eyes'
      releaseAt: i * RELEASE_EVERY, // blinky 0, pinky 90, inky 180, clyde 270
      released: i === 0,            // solo blinky sale al instante
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 || tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += tile === 4 ? 50 : 10;
      game.dotsRemaining--;
      // Power pellet: activa el modo asustado y reinicia el combo.
      if ( tile === 4 ) {
        game.frightTimer = FRIGHT_FRAMES;
        game.ghostsEaten = 0;
      }
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Dirección de un fantasma en espera: oscila en horizontal dentro de la pen,
// invierte al chocar con un muro. La pen solo se sale arriba, así que nunca
// cruzará la puerta mientras espere.
function waitDir( grid, ghost ) {
  if ( ghost.dir !== 'left' && ghost.dir !== 'right' ) return 'left';
  if ( canMove( grid, ghost.x, ghost.y, ghost.dir, 'ghost' ) ) return ghost.dir;
  return OPPOSITE[ ghost.dir ];
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // Ojos llegados a la salida de la pen: reaparecen en su celda inicial.
    if ( g.state === 'eyes' && g.x === PEN_EXIT.x && g.y === PEN_EXIT.y ) {
      respawnGhost( g );
      return;
    }
    g.dir = g.released ? decideGhostBehavior( game, g ) : waitDir( grid, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

// Un fantasma comido vuelve como fantasma normal a su celda de origen.
// No se re-encola: conserva released = true.
function respawnGhost( g ) {
  g.x = g.start.x;
  g.y = g.start.y;
  g.dir = 'up';
  g.state = 'normal';
}

// Tras morir se reinicia la cola: la ronda vuelve a empezar con blinky fuera
// y los demás esperando su turno. También se limpia el modo asustado.
function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.penTimer = 0;
  game.frightTimer = 0;
  game.ghostsEaten = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.state = 'normal';
    g.released = i === 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Contador de la ronda y liberación de la pen al llegar el turno de cada fantasma.
function releaseGhosts( game ) {
  game.penTimer++;
  game.ghosts.forEach( ( g ) => {
    if ( !g.released && game.penTimer >= g.releaseAt ) g.released = true;
  } );
}

function update( game ) {
  movePacman( game );
  // Al comer pellet el contador queda a FRIGHT_FRAMES y este decremento no lo
  // toca hasta el siguiente frame.
  if ( game.frightTimer > 0 ) game.frightTimer--;
  releaseGhosts( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( !collides( game.pacman, g ) ) continue;
    // Los ojos ni matan ni mueren: vuelven a la pen en silencio.
    if ( g.state === 'eyes' ) continue;
    // Fantasma asustado: se lo come y pasa a ser ojos.
    if ( game.frightTimer > 0 ) {
      game.score += GHOST_EAT_POINTS[ game.ghostsEaten ];
      game.ghostsEaten++;
      g.state = 'eyes';
    } else {
      // Fantasma normal: pierde una vida.
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
    }
    break; // una sola resolución de colisión por frame
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
