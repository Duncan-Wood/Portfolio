import { Input, Scene } from 'phaser';
import { COLUMNS, FIRST_VISIBLE_ROW, PIECE_TYPE_COUNT, ROWS, VISIBLE_ROWS } from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { type TileMove } from '../engine/board';
import { type ChainLink } from '../engine/matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';
import { PIECE_COLORS } from '../palette';
import { bakeTileTextures, tileTexture } from './tile-textures';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator } from '../input/input-translator';
import { SoundBoard } from '../audio/sound-board';
import { chainVoices, hardDropVoice, landVoice, popVoice, topOutVoice } from '../audio/voices';

/*
 * The only file where Phaser and game logic meet. (`main.ts` also imports
 * Phaser, but only to build the config object.)
 *
 * Its job is deliberately narrow: read the keyboard, drive the clock, and draw
 * whatever the engine says is true. Every rule — gravity, matching, DAS, the
 * cascade — lives in a Phaser-free module elsewhere, so it can be tested
 * without a browser. If logic starts accumulating here, it is in the wrong
 * place.
 *
 * The scene is a pure function of engine state: `drawBoard` reads the board
 * every frame and paints it. There is no separate copy of the game to keep in
 * sync, which is the class of bug that would otherwise dominate.
 */

const CELL_SIZE = 64;
const GAP = 4;

/*
 * How often the FPS readout is rewritten. Phaser's `Text` rasterises glyphs to
 * an offscreen canvas and uploads them whenever the string CHANGES (`setText`
 * short-circuits on an unchanged one), and `Math.round(actualFps)` changes
 * often enough to be worth throttling — it also stops the readout flickering.
 */
const FPS_REFRESH_INTERVAL = 250;

const SPARK_TEXTURE = 'spark';
const SPARK_RADIUS = 6;
const SPARKS_PER_CELL = 7;
const SCORE_POPUP_POOL = 4;


const BOARD_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 900;

/**
 * Top-left corner of the board in canvas pixels.
 *
 * The board is left-aligned rather than centred because the preview panel needs
 * room beside it: a 404px board in the original 480px canvas left only 38px of
 * margin. The canvas was widened to 620 and the board pinned left.
 */
const ORIGIN_X = 40;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE + (VISIBLE_ROWS - 1) * GAP;
const ORIGIN_Y = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

function centerOfColumn(column: number): number {
  return ORIGIN_X + column * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

/**
 * Board row to canvas pixel. Offset by `FIRST_VISIBLE_ROW`, so the hidden row
 * maps above the top of the board and is simply never drawn.
 */
function centerOfRow(row: number): number {
  return ORIGIN_Y + (row - FIRST_VISIBLE_ROW) * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

/**
 * Draw a tile at `centerY`, showing only the part of it inside the board.
 *
 * A pair spawns with one half in the hidden row above the field, so without
 * this that half either has to be skipped — which made a new piece arrive as a
 * lone block whose partner popped in a whole row later — or drawn floating
 * above the board's top edge. Clipping gives the third answer: it emerges from
 * under the edge a sliver at a time, the way it should.
 *
 * NOT a mask: Phaser 4 folded masks into its filter pipeline and the old
 * `setMask` is inert — it compiles, runs, and leaves the tile drawn in full.
 *
 * `setCrop` rather than the resize this used to do. Both hid the right number
 * of pixels while a tile was a flat colour, but resizing squashes the texture,
 * so a half-hidden tile would show a whole squat star instead of the bottom of
 * a tall one. Cropping cuts the texture and leaves the rest where it was, which
 * is what an edge does.
 */
function drawClippedToBoard(
  tile: Phaser.GameObjects.Image,
  centerX: number,
  centerY: number,
  textureKey: string,
): void {
  const hidden = Math.max(ORIGIN_Y - (centerY - CELL_SIZE / 2), 0);

  if (hidden >= CELL_SIZE) {
    tile.setVisible(false);
    return;
  }

  tile.setVisible(true);
  tile.setTexture(textureKey);
  tile.setPosition(centerX, centerY);
  tile.setCrop(0, hidden, CELL_SIZE, CELL_SIZE - hidden);
}

/** Whether a cell is in the part of the board the player can see. */
function isVisibleRow(row: number): boolean {
  return row >= FIRST_VISIBLE_ROW && row < ROWS;
}

/**
 * Where a board cell sits in `cellRectangles`, which is indexed from
 * `FIRST_VISIBLE_ROW` because the hidden row gets no rectangle.
 */
function visibleCellIndex(column: number, row: number): number {
  return (row - FIRST_VISIBLE_ROW) * COLUMNS + column;
}

/**
 * Randomness lives here, in the scene, NOT in the engine. The engine takes a
 * supplier function instead, which is what keeps it deterministic and its tests
 * seedless.
 *
 * A module-level function rather than an arrow defined inside the scene: an
 * arrow would capture `this`, and handing that to the long-lived `Simulation`
 * would keep the entire scene — and every object it owns — alive for as long as
 * the simulation existed.
 */
function randomPieceType(): number {
  return Math.floor(Math.random() * PIECE_TYPE_COUNT);
}

function randomPieceTypes(): [number, number] {
  return [randomPieceType(), randomPieceType()];
}

export class BoardScene extends Scene {
  private simulation: Simulation;
  private cellTiles: Phaser.GameObjects.Image[];
  private pairTiles: Phaser.GameObjects.Image[];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private fpsText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private chainText: Phaser.GameObjects.Text;
  private gameOverText: Phaser.GameObjects.Text;
  private previewTiles: Phaser.GameObjects.Image[];
  private shownPivotType = -1;
  private shownSatelliteType = -1;
  private shownScore = -1;
  private shownChain = -1;
  private nextFpsRefresh = 0;
  private timestep: FixedTimestep;
  /**
   * Named `inputTranslator`, NOT `input` — `input` is Phaser's own
   * `Scene.input` plugin, and shadowing it breaks `this.input.keyboard`.
   */
  private inputTranslator: InputTranslator;
  private lastPiecesSpawned = 0;
  private restartKey: Phaser.Input.Keyboard.Key;
  private hardDropKey: Phaser.Input.Keyboard.Key;

  /**
   * Tiles borrowed for the duration of one cascade beat: `popTiles` shrink
   * where a tile just cleared, `fallTiles` travel from a tile's old row to its
   * new one.
   *
   * Pooled at full board size and reused, so a cascade allocates nothing. A
   * beat can touch at most every visible cell, which is the pool size.
   */
  private popTiles: Phaser.GameObjects.Image[];
  private fallTiles: Phaser.GameObjects.Image[];

  /**
   * Visible-cell indices that `drawBoard` must leave empty because a
   * `fallTile` is currently animating into them. Without this the board
   * would paint the tile at its destination the instant the engine settled,
   * and the travelling copy would be a duplicate rather than the fall itself.
   */
  private cellsBeingFilled = new Set<number>();

  /** The engine's beat counter as of the beat this scene last animated. */
  private shownBeats = 0;

  private readonly soundBoard = new SoundBoard();
  private shownToppedOut = false;

  /**
   * `playSounds`' own copy of the lock count. Deliberately NOT shared with
   * `lastPiecesSpawned`, which `readInput` owns and refreshes at a point in the
   * frame chosen for the input translator.
   */
  private soundedPiecesLocked = 0;

  /**
   * The depth a cascade has reached, held until it ends: the flourish should
   * land on the final length rather than fire again at every link on the way up.
   */
  private chainAwaitingFlourish = 0;

  /**
   * How far the pair the player just slammed fell, or null when the landing
   * about to be sounded was not a hard drop. Chooses which voice it gets.
   */
  private slamDistance: number | null = null;

  /**
   * Milliseconds of hit-stop still owed. While positive the simulation does not
   * advance, but the scene keeps drawing — the impact gets held on screen.
   */
  private hitStopRemaining = 0;

  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private scorePopups: Phaser.GameObjects.Text[];
  private nextScorePopup = 0;

  /**
   * This scene's own copy of the tuning values, handed to both the simulation
   * and the input translator so all three read the same live object.
   */
  private tuning: Tuning;

  constructor() {
    super('Board');
  }

  /**
   * Phaser calls this once when the scene starts. Everything drawn is allocated
   * here — 72 board cells, 2 pair cells, 2 preview cells and the text — and
   * never again — the frame loop only changes colour and position. Not strictly
   * allocation-free: `drawPair` builds a fresh cells array each frame. It is
   * tiny and short-lived.
   */
  create(): void {
    // A COPY of the defaults, so mutating this scene's tuning at runtime cannot
    // corrupt the shared defaults that the engine tests rely on.
    this.tuning = { ...DEFAULT_TUNING };
    this.simulation = new Simulation(randomPieceTypes, this.tuning);
    this.timestep = new FixedTimestep();
    this.inputTranslator = new InputTranslator(this.tuning);
    this.lastPiecesSpawned = this.simulation.piecesSpawned;
    this.nextFpsRefresh = 0;

    // Live tuning hook. `import.meta.env.DEV` is replaced with `false` at build
    // time, so this branch is removed entirely from the production bundle —
    // verified: `window.tuning` appears zero times in the built output.
    if (import.meta.env.DEV) {
      window.tuning = this.tuning;
      // The board too, so a chain can be built from the console instead of
      // played for. Feel is judged from deliberate chains, and stacking one by
      // hand is slower than the thing being judged.
      window.simulation = this.simulation;
      // And the scene, so the juice can be inspected and stretched out from the
      // console — most of it lasts a few hundred milliseconds, which is shorter
      // than it takes to look at.
      window.boardScene = this;
    }

    // Darkness at the edges, so the board sits in a pool of light rather than
    // on a flat background.
    //
    // Tuned by eye against the real board, not guessed: the first values that
    // looked right in isolation dimmed the tiles so far that colours stopped
    // being tellable apart at speed. ART-DIRECTION is explicit that readability
    // beats beauty in a game built on fast pattern recognition, so this is
    // deliberately weak — it shades the corners and nothing more.
    //
    // The lit circular platform ART-DIRECTION calls for is NOT here on purpose.
    // It was built and cut: a circle large enough to sit under a 812-tall board
    // does not fit a 620-wide canvas, so it clipped on all four sides and read
    // as stray arcs rather than as a stage. It also broke that document's own
    // first rule — art waits until the core loop is proven fun. Revisit it as a
    // flattened ellipse in perspective, after the playtest.
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);

    // Every texture the board draws with, before the first thing that asks for
    // one. Baking after the fact is how the sparks first shipped as Phaser's
    // missing-texture placeholder.
    bakeTileTextures(this, CELL_SIZE);

    // One image per VISIBLE cell. The hidden row is deliberately not drawn, so
    // it gets no image and the array is indexed from FIRST_VISIBLE_ROW.
    this.cellTiles = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.cellTiles.push(
          this.add.image(centerOfColumn(column), centerOfRow(row), tileTexture(null)),
        );
      }
    }

    this.pairTiles = [
      this.add.image(0, 0, tileTexture(null)),
      this.add.image(0, 0, tileTexture(null)),
    ];

    // Created after the board so they draw on top of it, and before the text so
    // the text still draws on top of them.
    this.popTiles = [];
    this.fallTiles = [];
    for (let index = 0; index < COLUMNS * VISIBLE_ROWS; index += 1) {
      this.popTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
      this.fallTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
    }
    // One round white dot, drawn once and thrown away. Tinted per group at emit
    // time, so four colours of debris cost one texture and no art.
    const sparkTexture = this.add.graphics();
    sparkTexture.fillStyle(0xffffff, 1).fillCircle(SPARK_RADIUS, SPARK_RADIUS, SPARK_RADIUS);
    sparkTexture.generateTexture(SPARK_TEXTURE, SPARK_RADIUS * 2, SPARK_RADIUS * 2);
    sparkTexture.destroy();

    this.sparks = this.add.particles(0, 0, SPARK_TEXTURE, {
      lifespan: 420,
      speed: { min: 60, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 380,
      emitting: false,
    });

    this.scorePopups = [];
    for (let index = 0; index < SCORE_POPUP_POOL; index += 1) {
      this.scorePopups.push(
        this.add.text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '30px',
          color: '#ffc914',
        }).setOrigin(0.5, 0.5).setVisible(false),
      );
    }

    this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y - 46, 'NEXT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8ea3b0',
    }).setOrigin(0.5, 0.5);

    // Scaled rather than baked a second time at preview size: one set of
    // textures, and the preview cannot drift out of step with the board.
    this.previewTiles = [
      this.add.image(PREVIEW_CENTER_X, PREVIEW_TOP_Y + PREVIEW_CELL + GAP, tileTexture(null)),
      this.add.image(PREVIEW_CENTER_X, PREVIEW_TOP_Y, tileTexture(null)),
    ];
    for (const tile of this.previewTiles) {
      tile.setScale(PREVIEW_CELL / CELL_SIZE);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.restartKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.R);
    this.hardDropKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);

    // Browsers will not start audio until the player has interacted with the
    // page, so the context is built on the first key rather than here.
    this.input.keyboard!.on(Input.Keyboard.Events.ANY_KEY_DOWN, () => this.soundBoard.unlock());

    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    });

    this.scoreText = this.add.text(CANVAS_WIDTH - 8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e8eef2',
    }).setOrigin(1, 0);

    this.chainText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.gameOverText = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      'TOPPED OUT',
      {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8eef2',
        backgroundColor: '#12161a',
        padding: { x: 16, y: 10 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.resetShownState();
  }

  /**
   * Phaser calls this once per rendered frame. `delta` is milliseconds since
   * the last one.
   *
   * Order matters: input is read FIRST so a keypress affects the very next
   * simulation step rather than waiting a frame, which is the cheapest latency
   * there is to win.
   */
  update(time: number, delta: number): void {
    if (Input.Keyboard.JustDown(this.restartKey)) {
      this.restart();
    }

    // Nothing to read once the game is over: the simulation refuses input
    // anyway, and polling on would keep writing `softDropping` to a pair that
    // is already part of the board.
    if (!this.simulation.toppedOut) {
      this.readInput(delta);
    }

    if (this.hitStopRemaining > 0) {
      // Deliberately does NOT call `stepsFor`. Asking the accumulator for steps
      // and throwing them away would bank the frozen milliseconds and pay them
      // out in a burst the moment the freeze ended.
      this.hitStopRemaining -= delta;
    } else {
      for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
        this.simulation.update(FIXED_STEP);
      }
    }

    this.playCascadeBeat();
    this.playSounds();
    this.drawBoard();
    this.drawPair();
    this.drawPreview();
    this.refreshChain();
    this.refreshScore();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  /**
   * Start a new game without tearing the scene down. `scene.restart()` would
   * also work, but it destroys and rebuilds every game object — including the
   * pools above — to change state the simulation can reset on its own.
   */
  private restart(): void {
    this.simulation.restart();

    // Force `newPiece` on the next frame so the input translator re-latches a
    // held key exactly as it does after a lock — no held direction or soft drop
    // carries into the new game.
    this.lastPiecesSpawned = -1;

    this.tweens.killTweensOf(this.popTiles);
    this.tweens.killTweensOf(this.fallTiles);
    for (const tile of [...this.popTiles, ...this.fallTiles]) {
      tile.setVisible(false);
    }
    this.tweens.killTweensOf(this.scorePopups);
    for (const popup of this.scorePopups) {
      popup.setVisible(false);
    }

    this.resetShownState();
  }

  /**
   * Forget everything the scene believes it has already drawn and sounded.
   *
   * Shared by `create` and `restart` because both leave the simulation at the
   * start of a game with nothing on screen belonging to it yet. The counters
   * are seeded from the engine rather than zeroed, so a restart cannot sound a
   * landing or replay a beat that belonged to the run before it.
   */
  private resetShownState(): void {
    this.cellsBeingFilled.clear();
    this.shownBeats = this.simulation.beatsPlayed;
    this.soundedPiecesLocked = this.simulation.piecesLocked;
    this.slamDistance = null;
    this.shownScore = -1;
    this.shownChain = -1;
    this.shownPivotType = -1;
    this.shownSatelliteType = -1;
    this.shownToppedOut = false;
    this.chainAwaitingFlourish = 0;
    this.hitStopRemaining = 0;
    this.nextScorePopup = 0;
  }

  private readInput(delta: number): void {
    // Rotation is edge-triggered — `JustDown` fires once per physical press, so
    // holding Up does not spin the piece continuously.
    if (Input.Keyboard.JustDown(this.cursors.up)) {
      this.simulation.rotate();
    }

    // Hard drop is edge-triggered for the same reason, and more urgently: held
    // down it would slam every pair the instant it spawned.
    if (Input.Keyboard.JustDown(this.hardDropKey)) {
      const locksBefore = this.simulation.piecesLocked;
      const distance = this.simulation.hardDrop();
      // Only if it actually committed. Mashing Space through a cascade is
      // refused, and must not sound like a landing that never happened.
      if (this.simulation.piecesLocked !== locksBefore) {
        this.slamDistance = distance;
      }
    }

    const newPiece = this.simulation.piecesSpawned !== this.lastPiecesSpawned;
    this.lastPiecesSpawned = this.simulation.piecesSpawned;

    this.simulation.softDropping = this.inputTranslator.update(
      {
        direction: this.pressedDirection(),
        softDropHeld: this.cursors.down.isDown,
        newPiece,
        delta,
      },
      (direction) => this.shift(direction),
    );
  }

  /**
   * Which way the player is pressing. The only genuinely Phaser-specific piece
   * of input logic, which is why it stayed in the scene: resolving both keys
   * being held needs `timeDown`, a Phaser Key property.
   */
  private pressedDirection(): HorizontalDirection | null {
    const { left, right } = this.cursors;
    // Both held: the most recently pressed wins, which is what a player means
    // when they roll from one direction into the other.
    if (left.isDown && right.isDown) {
      return left.timeDown > right.timeDown ? -1 : 1;
    }
    if (left.isDown) {
      return -1;
    }
    if (right.isDown) {
      return 1;
    }
    return null;
  }

  private shift(direction: HorizontalDirection): boolean {
    return direction === -1 ? this.simulation.moveLeft() : this.simulation.moveRight();
  }

  /**
   * Repaint all 72 cells from board state.
   *
   * Unconditionally, every frame, even though the board only changes when a
   * pair locks. That is knowingly wasteful and knowingly negligible: measured
   * at roughly 126 nanoseconds — 0.0008% of a 60fps frame. A dirty flag would
   * save nothing and add a piece of cache-invalidation state for the cascade to
   * keep correct.
   */
  private drawBoard(): void {
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const index = visibleCellIndex(column, row);
        const pieceType = this.simulation.board.pieceAt(column, row);
        this.cellTiles[index].setTexture(
          tileTexture(this.cellsBeingFilled.has(index) ? null : pieceType),
        );
      }
    }
  }

  /**
   * Sound the transitions the engine has just been through.
   *
   * A landing is counted off `piecesLocked` rather than off the spawn counter:
   * a lock that starts a cascade, and a lock that tops the board out, both
   * commit a pair without spawning another, and those are the two landings the
   * player most wants to hear.
   */
  private playSounds(): void {
    const { piecesLocked, toppedOut, chainLength, resolving } = this.simulation;

    if (piecesLocked !== this.soundedPiecesLocked) {
      this.soundedPiecesLocked = piecesLocked;
      // One voice per landing. A slam already speaks for its own impact, and a
      // soft thud underneath it would only muddy the hit.
      this.soundBoard.play(
        this.slamDistance === null ? landVoice() : hardDropVoice(this.slamDistance),
      );
      this.slamDistance = null;
      this.bounceLanding();
    }

    if (toppedOut !== this.shownToppedOut) {
      this.shownToppedOut = toppedOut;
      if (toppedOut) {
        this.soundBoard.play(topOutVoice());
      }
    }

    if (resolving) {
      this.chainAwaitingFlourish = chainLength;
    } else if (this.chainAwaitingFlourish > 0) {
      this.soundBoard.playAll(chainVoices(this.chainAwaitingFlourish));
      this.chainAwaitingFlourish = 0;
    }
  }

  /**
   * Turn the beat the engine just played into motion.
   *
   * The engine has already mutated the board by the time this runs, so both
   * halves animate what the board no longer shows: a pop draws a tile that is
   * gone, and a fall draws one that has already arrived. Which beat it was
   * comes off a counter, not off comparing objects — the engine promises the
   * count ticks, it does not promise a fresh allocation per beat.
   */
  private playCascadeBeat(): void {
    const { beatsPlayed, lastBeat } = this.simulation;
    if (beatsPlayed === this.shownBeats || lastBeat === null) {
      return;
    }

    this.shownBeats = beatsPlayed;

    if (lastBeat.kind === 'settle') {
      this.dropTiles(lastBeat.moves);
      return;
    }

    this.popCells(lastBeat.link, lastBeat.points);
    // `chainLength` has already been incremented past this link, so the first
    // link of a cascade pops at index 0.
    this.soundBoard.play(popVoice(this.simulation.chainLength - 1));
  }

  /**
   * Shrink and fade a tile where one just cleared. Shorter than the beat that
   * carries it, so the hole is empty and legible before the next beat starts.
   */
  private popCells(link: ChainLink, points: number): void {
    this.tweens.killTweensOf(this.popTiles);
    this.hitStopRemaining = this.tuning.hitStopDuration;
    this.kickCamera();

    let borrowed = 0;
    let sumX = 0;
    let sumY = 0;

    for (const group of link.groups) {
      for (const cell of group.cells) {
        const x = centerOfColumn(cell.column);
        const y = centerOfRow(cell.row);

        const tile = this.popTiles[borrowed];
        borrowed += 1;

        tile
          .setPosition(x, y)
          .setTexture(tileTexture(group.pieceType))
          .setScale(1)
          .setAlpha(1)
          .setVisible(true);

        this.tweens.add({
          targets: tile,
          scale: 0.15,
          alpha: 0,
          duration: this.tuning.popDuration,
          ease: 'Quad.easeIn',
          onComplete: () => tile.setVisible(false),
        });

        sumX += x;
        sumY += y;

        this.sparks.setParticleTint(PIECE_COLORS[group.pieceType]);
        this.sparks.emitParticleAt(x, y, SPARKS_PER_CELL);
      }
    }

    if (borrowed > 0) {
      this.showScorePopup(sumX / borrowed, sumY / borrowed, points);
    }
  }

  /**
   * Squash the tiles a pair just came to rest on. Puyo holds this bounce for 16
   * frames and it is a large part of why landing there feels like contact
   * rather than like a value changing.
   *
   * The pair itself is gone by now — its halves are board cells, and `settle`
   * may have moved either of them — so the engine reports where each half came
   * to rest and the scene bounces exactly those two cells. A half that settled
   * into the hidden row has no rectangle and simply does not bounce.
   */
  private bounceLanding(): void {
    for (const cell of this.simulation.lastLanded) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const tile = this.cellTiles[visibleCellIndex(cell.column, cell.row)];
      this.tweens.killTweensOf(tile);
      tile.setScale(1.16, 0.8);
      this.tweens.add({
        targets: tile,
        scaleX: 1,
        scaleY: 1,
        duration: this.tuning.landingBounceDuration,
        ease: 'Back.easeOut',
      });
    }
  }

  /**
   * Translation AND roll, both scaled by how deep the chain is.
   *
   * A camera that only slides reads as a glitch; a couple of tenths of a degree
   * of roll is what reads as force. The roll is tweened back to zero rather
   * than snapped, or the board would end the shake visibly crooked.
   */
  private kickCamera(): void {
    const camera = this.cameras.main;
    const depth = Math.min(this.simulation.chainLength, 6);
    const weight = 1 + depth;

    camera.shake(90 + 20 * depth, this.tuning.shakeIntensity * weight);

    // Alternating direction, so consecutive links of one cascade rock the board
    // rather than pushing it further the same way each time.
    const roll = this.tuning.shakeRollDegrees * weight * (depth % 2 === 0 ? 1 : -1);
    camera.setAngle(roll);
    // `rotateTo` takes radians, unlike `setAngle`.
    camera.rotateTo(0, false, 180, 'Sine.easeOut');
  }

  /**
   * The points this link scored, floating up from the middle of what popped.
   *
   * The engine hands the link's own points over, so this is what the player
   * just earned rather than the running total the corner already displays.
   */
  private showScorePopup(x: number, y: number, points: number): void {
    const popup = this.scorePopups[this.nextScorePopup];
    this.nextScorePopup = (this.nextScorePopup + 1) % this.scorePopups.length;

    this.tweens.killTweensOf(popup);
    popup.setText(`+${points}`).setPosition(x, y).setAlpha(1).setVisible(true);

    this.tweens.add({
      targets: popup,
      y: y - 54,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => popup.setVisible(false),
    });
  }

  /**
   * Carry each settled tile from the row it left to the row it landed in, with
   * the destination held empty until it arrives. Eased in, because a falling
   * thing accelerates — linear motion is what makes a drop read as a slide.
   */
  private dropTiles(moves: readonly TileMove[]): void {
    // A previous drop still in flight owns pooled rectangles and suppressed
    // cells that this one is about to reuse. Ending it first is what keeps a
    // slow `fallDuration` from stranding a cell as permanently empty.
    this.tweens.killTweensOf(this.fallTiles);
    for (const tile of this.fallTiles) {
      tile.setVisible(false);
    }
    this.cellsBeingFilled.clear();

    for (let index = 0; index < moves.length; index += 1) {
      const move = moves[index];
      const pieceType = this.simulation.board.pieceAt(move.column, move.toRow);
      if (pieceType === null || !isVisibleRow(move.toRow)) {
        continue;
      }

      const cellIndex = visibleCellIndex(move.column, move.toRow);
      this.cellsBeingFilled.add(cellIndex);

      const tile = this.fallTiles[index];
      tile
        .setPosition(centerOfColumn(move.column), centerOfRow(move.fromRow))
        .setTexture(tileTexture(pieceType))
        .setScale(1)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: tile,
        y: centerOfRow(move.toRow),
        // Square root of the distance, not the distance: real falls accelerate,
        // so a six-row drop takes about two and a half times as long as a
        // one-row drop rather than six times, and reads as heavier for it.
        duration: this.tuning.fallDuration * Math.sqrt(move.toRow - move.fromRow),
        ease: 'Quad.easeIn',
        onComplete: () => {
          tile.setVisible(false);
          this.cellsBeingFilled.delete(cellIndex);
        },
      });
    }
  }

  /**
   * Draw the two halves of the falling pair on top of the board.
   *
   * These are separate rectangles from the board grid because the pair moves
   * independently of the cell layout — and later will need to move smoothly
   * between cells, which fixed-position grid cells cannot do.
   */
  private drawPair(): void {
    // In both of these states `pair` still points at the pair whose tiles are
    // already part of the board, so drawing it paints a ghost duplicate — and
    // after a top-out it would hang there at its pre-settle position forever.
    if (this.simulation.resolving || this.simulation.toppedOut) {
      for (const tile of this.pairTiles) {
        tile.setVisible(false);
      }
      return;
    }

    // Draw the pair between rows rather than on them. `fallProgress` is only
    // meaningful while the pair can actually fall — a landed pair keeps its
    // last value through the lock delay, and offsetting by it would sink the
    // piece into the tile it is resting on.
    const descent = this.simulation.pair.canFall(this.simulation.board)
      ? this.simulation.fallProgress
      : 0;

    const cells = this.simulation.pair.cells();
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      drawClippedToBoard(
        this.pairTiles[index],
        centerOfColumn(cell.column),
        centerOfRow(cell.row + descent),
        tileTexture(cell.pieceType),
      );
    }
  }

  /**
   * Paint the "NEXT" panel. Repainted only when the upcoming pair actually
   * changes, which keeps the per-frame path free of pointless writes — and
   * compared as two numbers, so the check itself allocates nothing.
   */
  private drawPreview(): void {
    const [pivotType, satelliteType] = this.simulation.upcoming;
    if (pivotType === this.shownPivotType && satelliteType === this.shownSatelliteType) {
      return;
    }

    this.shownPivotType = pivotType;
    this.shownSatelliteType = satelliteType;
    // Index 0 is the lower rectangle (the pivot) and index 1 the upper (the
    // satellite), matching orientation 0 — how the pair will actually appear.
    this.previewTiles[0].setTexture(tileTexture(pivotType));
    this.previewTiles[1].setTexture(tileTexture(satelliteType));
  }

  /**
   * The "N CHAIN" callout. Shown only from the second link onward, because
   * every single clear is technically a one-link chain and announcing those
   * would make the label meaningless.
   */
  private refreshChain(): void {
    const { resolving, chainLength } = this.simulation;
    const showing = resolving && chainLength >= 2;

    this.chainText.setVisible(showing);
    if (showing && chainLength !== this.shownChain) {
      this.shownChain = chainLength;
      this.chainText.setText(`${chainLength} CHAIN`);
    }
  }

  private refreshScore(): void {
    if (this.simulation.score === this.shownScore) {
      return;
    }

    this.shownScore = this.simulation.score;
    this.scoreText.setText(`${this.shownScore}`);
  }

  /**
   * The board is left exactly as it stood, with the readout over it — losing is
   * information, and clearing the screen would throw away the shape that
   * explains why. Restarting means reloading the page for now.
   */
  private refreshGameOver(): void {
    this.gameOverText.setVisible(this.simulation.toppedOut);
  }

  private refreshFps(time: number): void {
    if (time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
