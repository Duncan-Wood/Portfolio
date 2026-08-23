import { BlendModes, Input, Scene } from 'phaser';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  PIECE_TYPE_COUNT,
  ROWS,
  SHADOW,
  VISIBLE_ROWS,
  isColour,
} from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { type TileMove } from '../engine/board';
import { type ChainLink } from '../engine/matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';
import {
  GROUND_COLOR,
  TRACE_COLORS,
  TRACK_COLOR,
  TRACK_LIT_COLOR,
  PIECE_COLORS,
  SHADOW_EDGE_COLOR,
  SHADOW_EYE_GLOW,
} from '../palette';
import {
  SHADOW_EYES_TEXTURE,
  TRACE_TEXTURE,
  bakeTileTextures,
  tileTexture,
} from './tile-textures';
import { TrackPath, mitredRectangle } from '../track-geometry';
import { MEMORIES, nodeLayout } from '../memories';
import { CONNECTION_LOST, SHADOW_CLOSING_LINE, shadowLine } from '../shadow-voice';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator } from '../input/input-translator';
import { SoundBoard } from '../audio/sound-board';
import {
  chainVoices,
  hardDropVoice,
  landVoice,
  answerVoice,
  connectionLostVoice,
  nodeVoice,
  popVoice,
  shadowArrivalVoice,
  shadowRecedeVoice,
  topOutVoice,
} from '../audio/voices';

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

/*
 * The progress track: a circuit that rings the board, divided into pads that
 * light one at a time.
 *
 * Discrete pads and not a smooth bar, because progress you cannot see happen is
 * progress that may as well not exist. The first attempt raised the brightness
 * of the board's traces continuously with cells cleared — arithmetically
 * correct, and invisible: one clear moved the alpha by a hundredth, over a ramp
 * lasting minutes. Eyes register events, not ramps. A pad lighting is an event:
 * it has a moment, a place, a spark and a note.
 *
 * How many pads, and what each costs, are feel dials and live in `tuning.ts`.
 */
const TRACK_MARGIN = 15;

/** Corner cut. Square corners read as a border; mitred ones read as routing. */
const TRACK_CHAMFER = 20;

/** How far the little tap stubs branch off the bus at each pad. */
const TRACK_STUB = 7;

/** Milliseconds for a pulse of current to travel the whole energised run. */
const PULSE_PERIOD = 2400;

const TRACK_PULSES = 3;

/*
 * The shadow's idle: how far it bobs and leans, how long a breath takes, and
 * how long one takes to climb out of the board when it arrives.
 *
 * All of it is computed per frame from one clock rather than tweened. A tween
 * per shadow cell would fight `drawBoard`, which writes every cell's texture
 * every frame and would have to learn which cells it is not allowed to touch;
 * and the shadow moves on the board — it settles, it falls — so the tween would
 * have to be caught and rebuilt every time a cell changed hands.
 *
 * Nothing here is a `tuning.ts` dial. Those are the numbers that change how the
 * game PLAYS; these only change how it looks, and adding them would make the
 * live-tuning object something you have to read past.
 */
const SHADOW_BOB_PIXELS = 2.4;
const SHADOW_LEAN_DEGREES = 3.2;
const SHADOW_BREATH = 0.045;
const SHADOW_ARRIVAL_DURATION = 340;

/**
 * How long a fragment is on screen before Space will skip it.
 *
 * Not zero, for two reasons. The text is still fading in for the first 500ms,
 * so before that there is nothing to have read yet. And a fragment surfaces
 * moments after a clear — which is moments after the player was very possibly
 * hitting Space to hard-drop — so an instant skip would let the reward for a
 * whole minute of play be thrown away by a reflex.
 */
const REVEAL_SKIP_GRACE = 420;

/**
 * The most an answer may be, and how fast its caret blinks.
 *
 * Capped because the answer lives on the memory panel for the rest of the run
 * and the panel is 128 pixels wide. It is not a diary — it is the length of a
 * thing you would say out loud.
 */
const ANSWER_LIMIT = 48;

/**
 * The two prompts a held board can show. Named because they share one text
 * object: `askQuestion` used to set its own and nothing set it back, so every
 * fragment after the first question told the player to type an answer at a
 * screen that was not listening.
 */
const SKIP_PROMPT = 'space';
const ANSWER_PROMPT = 'type an answer   ·   enter';
const CARET_PERIOD = 1060;

/** Milliseconds an eye stays shut, and the shortest gap between two blinks. */
const BLINK_DURATION = 90;
const BLINK_INTERVAL = 2300;

const SPARK_TEXTURE = 'spark';

/**
 * The noise the board dissolves into when the run is lost.
 *
 * Baked once like everything else here — a square of random grey pixels, tiled
 * over the board and jittered per frame. Grain alone reads as film; grain that
 * MOVES reads as a signal failing, which is the thing being described.
 */
const STATIC_TEXTURE = 'static';
const STATIC_SIZE = 96;
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

/*
 * The box beside the board where the memory being earned takes shape.
 *
 * This space has been empty since Stage 1 — ART-DIRECTION earmarked it for the
 * watching brain and nothing ever filled it. What goes there is the SHAPE of
 * the coming memory, dark, with a node lighting each time the run earns one, so
 * a player can see what they are working toward filling in rather than being
 * handed a surprise at the end. The nodes are silhouettes and carry no words:
 * the point is to know how much is left, not what it says.
 */
const MEMORY_PANEL_TOP = 300;
const MEMORY_PANEL_HEIGHT = 450;
const MEMORY_PAD = 6;

/** Clear of the progress track's stubs on the left, and the canvas on the right. */
const MEMORY_PANEL_LEFT = 476;

/**
 * Where the kept answer starts. Further left than the memory panel on purpose:
 * it is the only prose in the right-hand column, and it gets the whole width of
 * it rather than the narrow strip the nodes are drawn in.
 */
const ANSWER_ECHO_LEFT = 432;
const MEMORY_PANEL_WIDTH = 128;

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

/** The bus the progress pads sit on, as a mitred rectangle around the board. */
const trackPath = new TrackPath(
  mitredRectangle(
    ORIGIN_X - TRACK_MARGIN,
    ORIGIN_Y - TRACK_MARGIN,
    BOARD_WIDTH + TRACK_MARGIN * 2,
    BOARD_HEIGHT + TRACK_MARGIN * 2,
    TRACK_CHAMFER,
  ),
);

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

/**
 * Overshoot and settle back. `1.7` is the usual constant for a back ease; it is
 * what makes something arrive as though it had weight instead of sliding into
 * position.
 *
 * Written out rather than taken from Phaser's easing table because the shadow's
 * arrival is computed per frame from a clock rather than run as a tween — see
 * `animateShadow` for why it cannot be one.
 */
function easeOutBack(progress: number): number {
  const overshoot = 1.7;
  const back = progress - 1;

  return 1 + (overshoot + 1) * back ** 3 + overshoot * back ** 2;
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
 * One drawable link between two neighbouring cells.
 *
 * Every slot the board could ever light is built once, at a fixed position,
 * and then only ever shown or hidden. A connection has nowhere else to be, so
 * there is nothing to move and nothing to allocate mid-cascade.
 */
interface ConnectionSlot {
  trace: Phaser.GameObjects.Image;
  column: number;
  row: number;
  toColumn: number;
  toRow: number;
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
  /**
   * The interference laid over the board once the run is lost, and how far it
   * has come up.
   *
   * A TileSprite rather than a stretched image so the grain stays the size it
   * was baked at whatever the board's dimensions are — a scaled noise texture
   * is blurry, and blurry noise reads as fog rather than as static.
   */
  private staticOverlay: Phaser.GameObjects.TileSprite;

  private staticStrength = 0;

  private gameOverText: Phaser.GameObjects.Text;

  private gameOverLine: Phaser.GameObjects.Text;

  private gameOverHint: Phaser.GameObjects.Text;
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
  private pauseKey: Phaser.Input.Keyboard.Key;

  /**
   * Held by the player rather than by the game.
   *
   * Deliberately a flag of our own instead of Phaser's `scene.pause()`: that
   * stops the scene's `update` altogether, which is also what reads the
   * keyboard — so the key that paused it would have no way to start it again.
   */
  private paused = false;

  private pauseScrim: Phaser.GameObjects.Rectangle;
  private pauseText: Phaser.GameObjects.Text;
  private pauseHint: Phaser.GameObjects.Text;

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
   * The lit eyes laid over every shadow on the board, one slot per visible cell
   * and indexed exactly like `cellTiles`.
   *
   * Separate objects rather than part of the tile texture because they are the
   * half that has to move independently: they blink, they flare as a shadow
   * arrives, and they are drawn additively so they read as light rather than as
   * paint. A slot per cell rather than a pool sized to some guess at how many
   * shadows there can be — the board is 72 cells and every one of them can end
   * up holding one.
   */
  private shadowEyes: Phaser.GameObjects.Image[];

  /**
   * Which cells are currently being drawn as a live shadow, and the one that is
   * still climbing out of the board.
   *
   * The set exists to put a cell BACK when it stops holding a shadow: the idle
   * writes position, angle, scale and alpha every frame, and a cell that is
   * cleared while leaning would otherwise stay leaning for the rest of the run.
   * Resetting every cell unconditionally instead is not an option — it would
   * flatten the landing bounce, which is a tween on those same tiles.
   */
  private animatedShadowCells = new Set<number>();

  private shadowArrival: { cellIndex: number; age: number } | null = null;

  /**
   * The shadow talking, and what it has already said.
   *
   * Deliberately NOT the reveal overlay the memories use. A fragment stops the
   * game and dims it; this does neither. The shadow gets to needle you while
   * you are still playing, which is the whole difference between something the
   * game is showing you and something that is in the room with you.
   */
  private shadowSpeech: Phaser.GameObjects.Text;

  private spokenShadowLines: string[] = [];

  private arrivalsSinceShadowSpoke = 0;

  /**
   * The clock the idle is computed from. Its own, rather than `time` from the
   * frame, because it must stop when the game does: a paused board whose
   * shadows keep breathing does not read as paused, and a hit-stop that
   * everything on screen ignores does not read as impact.
   */
  private shadowClock = 0;

  /** The engine's arrival count as of the one this scene last announced. */
  private shownShadowTaken = 0;

  /**
   * The traces between matching neighbours — the board wiring itself up as it
   * fills. ART-DIRECTION has called this the highest-value idea in the document
   * since Stage 2: the leading between panes IS the pathway, so a group is
   * visibly a connected circuit before it ever pops, and a cascade is a signal
   * crossing it.
   */
  private connections: ConnectionSlot[];

  /**
   * The progress circuit around the board, and how many of its pads are lit.
   *
   * Redrawn only when the count changes — which is a handful of times per run —
   * so this is a `Graphics` rather than another pool of images.
   */
  private progressTrack: Phaser.GameObjects.Graphics;

  /** The coming memory's shape, filling in beside the board as it is earned. */
  private memoryPanel: Phaser.GameObjects.Graphics;

  private litPads = 0;

  /**
   * Fragments of memory surfaced this run, counted across every memory rather
   * than per memory. Progress is measured from it rather than by resetting the
   * engine's counter, so connections earned past a threshold carry into the
   * next fragment instead of being thrown away at the door.
   */
  private nodesRevealed = 0;

  /**
   * Milliseconds left on a surfaced fragment. While it is positive the
   * simulation is frozen and input is ignored — the board is held, not torn
   * down, because a memory here is an interruption to a run rather than a
   * departure from it.
   */
  private revealRemaining = 0;

  /**
   * A question waiting for the fragment in front of it to finish.
   *
   * Completing a memory used to swap the last node's words FOR the question,
   * which quietly ate a fragment the player had earned. It follows it instead.
   */
  private pendingReveal: { title: string; body: string; memoryIndex: number } | null = null;

  private revealScrim: Phaser.GameObjects.Rectangle;
  private revealTitle: Phaser.GameObjects.Text;

  /** The "space" prompt, and how long until it means anything. */
  private revealHint: Phaser.GameObjects.Text;

  private revealSkippableIn = 0;

  /**
   * The question waiting on an answer, what has been typed into it, and where
   * the answers already given are kept.
   *
   * `awaitingAnswer` holds the game exactly as a fragment does, but it has no
   * clock: it ends when the player presses Enter and not before. This is the
   * only screen in the game that waits on a person rather than on a timer, and
   * it should — everything else here is a thing the game does TO you.
   *
   * What was typed is kept only so the panel can show it back. It is never
   * scored, never branched on and never handed to the engine; `answerQuestion`
   * is told THAT an answer happened, never what it said.
   */
  private awaitingAnswer = false;

  private answerText = '';

  /**
   * Which memory the question on screen belongs to, carried from the fragment
   * that earned it rather than re-derived. `nodesRevealed` has already moved
   * past that memory by the time the answer arrives, so deriving it here would
   * be asking a counter about a moment it has left behind.
   */
  private answeringMemory = 0;

  private memoryAnswers: string[] = [];

  private answerLine: Phaser.GameObjects.Text;

  private answerEcho: Phaser.GameObjects.Text;
  private revealBody: Phaser.GameObjects.Text;

  /**
   * Sparks of current running the energised part of the track, and how far
   * round the leading one is.
   *
   * A lit circuit that does not move reads as a drawn border. Something
   * travelling it is what says the thing is switched on.
   */
  private trackPulses: Phaser.GameObjects.Image[];

  private pulsePhase = 0;

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

    this.progressTrack = this.add.graphics();
    this.memoryPanel = this.add.graphics();

    // `filters` is null until filters are enabled. Asserting past it with `!` is
    // exactly what hid a black screen during the juice pass, so enable first and
    // then read it as a value.
    //
    // Kept as a shader rather than drawn, after trying the other way: stacking
    // four wide translucent strokes costs no fill rate, but a hard-edged stroke
    // is a poor gaussian and the halo barely read. Cost is linear in
    // quality x distance, so those are as low as they go while still blooming.
    this.progressTrack.enableFilters();
    this.progressTrack.filters?.internal.addGlow(TRACK_LIT_COLOR, 2.5, 0, 1, false, 4, 8);

    // Every texture the board draws with, before the first thing that asks for
    // one. Baking after the fact is how the sparks first shipped as Phaser's
    // missing-texture placeholder.
    bakeTileTextures(this, CELL_SIZE, GAP);

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

    // Straight after the cells, so a pair falling past a shadow still passes in
    // front of its eyes.
    this.shadowEyes = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.shadowEyes.push(
          this.add
            .image(centerOfColumn(column), centerOfRow(row), SHADOW_EYES_TEXTURE)
            .setBlendMode(BlendModes.ADD)
            .setVisible(false),
        );
      }
    }

    // After the cells so traces sit on top of them, before the pair so a
    // falling piece still passes over the wiring.
    this.connections = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (column + 1 < COLUMNS) {
          this.connections.push(this.addConnection(column, row, column + 1, row));
        }
        if (row + 1 < ROWS) {
          this.connections.push(this.addConnection(column, row, column, row + 1));
        }
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

    // Coarse rather than per-pixel: a 3px grain reads as interference at this
    // size, where single pixels read as a dirty screen.
    sparkTexture.clear();
    for (let y = 0; y < STATIC_SIZE; y += 3) {
      for (let x = 0; x < STATIC_SIZE; x += 3) {
        const shade = Math.random();
        sparkTexture.fillStyle(0xffffff, shade * shade * 0.9);
        sparkTexture.fillRect(x, y, 3, 3);
      }
    }
    sparkTexture.generateTexture(STATIC_TEXTURE, STATIC_SIZE, STATIC_SIZE);
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

    this.trackPulses = [];
    for (let index = 0; index < TRACK_PULSES; index += 1) {
      this.trackPulses.push(
        this.add
          .image(0, 0, SPARK_TEXTURE)
          .setTint(0xffffff)
          .setBlendMode(BlendModes.ADD)
          .setVisible(false),
      );
    }

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

    this.add.text(PREVIEW_CENTER_X, MEMORY_PANEL_TOP - 40, 'MEMORY', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#6b5a80',
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
    this.pauseKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.ESC);

    // Typing is the one input that cannot be polled. Every other key in this
    // game is a state the frame asks about; text is a stream of events, and a
    // frame that samples it drops characters typed fast enough to fall between
    // two frames — which is most of them.
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => this.typeIntoAnswer(event));

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

    // Over the board, under nothing. A fragment dims the game it interrupts
    // rather than replacing it, so the run stays visible the whole time.
    this.revealScrim = this.add.rectangle(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + TRACK_MARGIN * 2,
      BOARD_HEIGHT + TRACK_MARGIN * 2,
      GROUND_COLOR,
    ).setVisible(false);

    this.revealTitle = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 - 70, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 40 },
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.revealBody = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 10, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#e8eef2',
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 56 },
      lineSpacing: 7,
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Only shown once the fragment can actually be skipped, so it teaches the
    // grace period as well as the key. Dim, because a prompt that competes with
    // the line it is offering to dismiss has its priorities backwards.
    this.revealHint = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 96, SKIP_PROMPT, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6b5a80',
    }).setOrigin(0.5, 0.5).setVisible(false);

    // What they are typing, under the question. Its own object rather than more
    // lines on `revealBody`, so the question stays still while the answer grows
    // underneath it.
    this.answerLine = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 74, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 80 },
      // Stroked because it outlives the scrim: the answer is held over the
      // board while the wave clears it, by which point the dimming has gone
      // and it is sitting on bare tiles.
      stroke: '#150a24',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setVisible(false);

    // The answer, kept beside the memory it belongs to for the rest of the run.
    // Left of the panel and wider than it, because the panel's 128px is a
    // column for nodes, not for prose. At 11px inside it this read as fine
    // print — which is the wrong thing for the one line in the game the player
    // wrote themselves.
    this.answerEcho = this.add.text(
      ANSWER_ECHO_LEFT,
      MEMORY_PANEL_TOP + MEMORY_PANEL_HEIGHT + 20,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c9b3e8',
        wordWrap: { width: CANVAS_WIDTH - ANSWER_ECHO_LEFT - 14 },
        lineSpacing: 5,
      },
    ).setOrigin(0, 0).setVisible(false);

    // The way out, at the moment it is needed. The pause screen has always said
    // `esc to resume`; losing said nothing at all, so R was a secret.
    this.gameOverHint = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 78,
      'r — again',
      {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#8ea3b0',
        backgroundColor: '#221038',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    // Over the board and the traces, under the words — the ending should be
    // read through the interference, not behind it.
    this.staticOverlay = this.add.tileSprite(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + TRACK_MARGIN * 2,
      BOARD_HEIGHT + TRACK_MARGIN * 2,
      STATIC_TEXTURE,
    ).setVisible(false).setBlendMode(BlendModes.ADD);

    this.gameOverText = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2 - 18,
      CONNECTION_LOST,
      {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#e8eef2',
        backgroundColor: '#221038',
        padding: { x: 16, y: 10 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    // The shadow's last word, under the game's. It speaks here through its own
    // object rather than the needling one, because this line is said when
    // nothing can be answered.
    this.gameOverLine = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 34,
      SHADOW_CLOSING_LINE,
      {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#b07dff',
        backgroundColor: '#221038',
        padding: { x: 12, y: 6 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    // Last, so it covers the board, the readouts and anything mid-reveal.
    // Over the board's upper third, which is empty for most of a run — and when
    // it is not, the stack is high, which is exactly when it has most to say.
    // Stroked rather than backed with a panel so it stays legible over tiles
    // without another object to fade in step.
    this.shadowSpeech = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, ORIGIN_Y + BOARD_HEIGHT * 0.28, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f4eeff',
      align: 'center',
      stroke: '#0d0714',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.pauseScrim = this.add.rectangle(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      GROUND_COLOR,
      0.82,
    ).setVisible(false);

    this.pauseText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#c98cff',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.pauseHint = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 46, 'esc to resume', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#6b5a80',
    }).setOrigin(0.5, 0.5).setVisible(false);

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
    // Escape is not a pause while a question is waiting: the game is already
    // held, and the only key that ends it is the one that answers it.
    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }

    // R is a LETTER while a question is waiting for one. Ungated, typing any
    // answer containing an "r" — remember, work, start — restarted the run
    // mid-sentence, which looked like the game refusing to let you finish.
    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.restartKey)) {
      this.restart();
    }

    // Nothing to read once the game is over: the simulation refuses input
    // anyway, and polling on would keep writing `softDropping` to a pair that
    // is already part of the board. Nothing to read while paused either — but
    // the two keys above are still polled, or there would be no way out.
    if (!this.paused && !this.simulation.toppedOut && !this.storyHolding) {
      this.readInput(delta);
    }

    if (this.paused) {
      // Everything below this advances something. Drawing continues, because
      // Phaser clears the canvas every frame and a held game still has to be
      // looked at; nothing here consumes `delta`, so no time is banked.
      this.drawBoard();
      this.drawConnections();
      this.drawPair();
      this.drawPreview();
      this.refreshChain();
      this.refreshScore();
      this.refreshAnswerLine(time);
      this.refreshGameOver();
      this.refreshFps(time);
      return;
    }

    if (this.awaitingAnswer) {
      // Held, with no clock running it down. The caret is the only thing
      // moving, which is what says the game is waiting on a person.
    } else if (this.revealRemaining > 0) {
      // The same trick as hit-stop: the simulation does not advance and the
      // frozen time is never banked, so nothing lurches when play resumes.
      this.revealRemaining -= delta;

      if (this.revealSkippableIn > 0) {
        this.revealSkippableIn -= delta;
        if (this.revealSkippableIn <= 0) {
          this.revealHint.setVisible(true).setAlpha(0);
          this.tweens.add({ targets: this.revealHint, alpha: 1, duration: 260 });
        }
      } else if (Input.Keyboard.JustDown(this.hardDropKey)) {
        // Space skips. The hold is generous on purpose — long enough for a slow
        // reader — and somebody who has already finished the line should not be
        // made to sit out the rest of it. Safe to read the key here: `readInput`
        // is refused while a fragment is up, so this is the only claim on the
        // press, and hard drop is edge-triggered, so holding Space through the
        // skip cannot slam the next pair.
        this.revealRemaining = 0;
      }

      if (this.revealRemaining <= 0) {
        this.advanceReveal();
      }
    } else if (this.hitStopRemaining > 0) {
      // Deliberately does NOT call `stepsFor`. Asking the accumulator for steps
      // and throwing them away would bank the frozen milliseconds and pay them
      // out in a burst the moment the freeze ended.
      this.hitStopRemaining -= delta;
    } else {
      for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
        this.simulation.update(FIXED_STEP);
      }
    }

    // The shadows are frozen by hit-stop and by a reveal along with everything
    // else: a board that holds still except for the creatures on it breathing
    // does not read as held.
    if (this.hitStopRemaining <= 0 && !this.storyHolding) {
      this.shadowClock += delta;

      if (this.shadowArrival !== null) {
        this.shadowArrival.age += delta;
        if (this.shadowArrival.age >= SHADOW_ARRIVAL_DURATION) {
          this.shadowArrival = null;
        }
      }
    }

    this.playShadowArrival();
    this.playCascadeBeat();
    this.playSounds();
    this.drawBoard();
    this.drawConnections();
    this.drawProgress();
    this.advanceTrackPulses(delta);
    this.drawPair();
    this.drawPreview();
    this.refreshChain();
    this.refreshScore();
    this.refreshAnswerLine(time);
    this.refreshStatic();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  /**
   * Jitter the interference, once the run is lost.
   *
   * Scrolled and re-alpha'd every frame rather than tweened, because static is
   * not an animation with a shape — it is noise that has to be different each
   * frame or the eye reads it as a texture sitting still on the glass.
   */
  private refreshStatic(): void {
    if (this.staticStrength <= 0) {
      return;
    }

    this.staticOverlay.tilePositionX = Math.random() * STATIC_SIZE;
    this.staticOverlay.tilePositionY = Math.random() * STATIC_SIZE;
    // Flickers around its level rather than holding it, so the signal reads as
    // failing rather than as faded.
    this.staticOverlay.setAlpha(this.staticStrength * (0.1 + Math.random() * 0.14));
  }

  /**
   * The answer as it is typed, with a caret.
   *
   * Blinks off wall-clock time rather than off anything the simulation owns,
   * because the simulation is stopped — a still caret on a still board would
   * read as a hung game rather than as one waiting for you.
   */
  private refreshAnswerLine(time: number): void {
    if (!this.awaitingAnswer) {
      return;
    }

    const caret = time % CARET_PERIOD < CARET_PERIOD / 2 ? '_' : ' ';
    this.answerLine.setText(this.answerText + caret);
  }

  /**
   * Hold or release the game.
   *
   * Tweens are paused wholesale alongside the flag: a pop shrinking or a tile
   * falling would otherwise carry on behind the overlay, and a pause that only
   * stops some of the motion reads as a bug rather than as a pause.
   */
  private setPaused(paused: boolean): void {
    if (paused === this.paused) {
      return;
    }

    this.paused = paused;
    this.pauseScrim.setVisible(paused);
    this.pauseText.setVisible(paused);
    this.pauseHint.setVisible(paused);

    if (paused) {
      this.tweens.pauseAll();
    } else {
      this.tweens.resumeAll();
    }
  }

  /**
   * Start a new game without tearing the scene down. `scene.restart()` would
   * also work, but it destroys and rebuilds every game object — including the
   * pools above — to change state the simulation can reset on its own.
   */
  private restart(): void {
    // A held game that restarts is a running game: leaving the flag set would
    // start the new run frozen behind an overlay the player just dismissed.
    this.setPaused(false);
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

    // Undo the losing sequence. It dims the panel, fades two texts in and
    // tweens every lit trace to nothing, and R can land in the middle of all
    // three — a new run must not open holding the last one's ending.
    this.tweens.killTweensOf([
      this.gameOverText, this.gameOverLine, this.gameOverHint, this.memoryPanel,
    ]);
    this.gameOverText.setVisible(false);
    this.gameOverLine.setVisible(false);
    this.gameOverHint.setVisible(false);
    this.memoryPanel.setAlpha(1);
    // The interference and the colour drain are the ending, not the game: a
    // new run must start on a clean signal.
    this.tweens.killAll();
    this.staticStrength = 0;
    this.staticOverlay.setVisible(false);
    this.cameras.main.filters.external.clear();
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);
    for (const slot of this.connections) {
      this.tweens.killTweensOf(slot.trace);
      slot.trace.setAlpha(1);
    }

    // Cut, not faded. `hideReveal` runs the countdown's 280ms dissolve, and it
    // is only ever reached BY that countdown — a restart sets `revealRemaining`
    // to 0 directly, so nothing was left to reach it and a fragment the player
    // restarted out of stayed on screen over the new run for the rest of the
    // session.
    this.tweens.killTweensOf([this.revealScrim, this.revealTitle, this.revealBody, this.revealHint]);
    for (const part of [this.revealScrim, this.revealTitle, this.revealBody, this.revealHint]) {
      part.setVisible(false).setAlpha(1);
    }
    this.revealSkippableIn = 0;
    this.awaitingAnswer = false;
    this.answerText = '';
    this.memoryAnswers = [];
    this.tweens.killTweensOf([this.answerLine, this.answerEcho]);
    this.answerLine.setVisible(false);
    this.answerEcho.setVisible(false);

    for (const index of this.animatedShadowCells) {
      this.restoreCell(index);
    }
    this.animatedShadowCells.clear();
    this.shadowArrival = null;
    this.spokenShadowLines = [];
    this.arrivalsSinceShadowSpoke = 0;
    this.tweens.killTweensOf(this.shadowSpeech);
    this.shadowSpeech.setVisible(false);
    this.shadowClock = 0;
    this.shownShadowTaken = this.simulation.shadowTaken;

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

    this.litPads = 0;
    this.nodesRevealed = 0;
    this.revealRemaining = 0;
    this.pendingReveal = null;
    this.redrawTrack();
    // Drawn here as well as on every change: the panel is otherwise blank until
    // the first pad lights, which is exactly when it has the most to say.
    this.redrawMemoryPanel(0);
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
        const pieceType = this.settledPieceAt(column, row);
        const index = visibleCellIndex(column, row);

        this.cellTiles[index].setTexture(tileTexture(pieceType));

        if (pieceType === SHADOW) {
          this.animateShadow(index, column, row);
        } else if (this.animatedShadowCells.delete(index)) {
          this.restoreCell(index);
        }
      }
    }
  }

  /**
   * One shadow, alive: bobbing, leaning, breathing, blinking — and still
   * climbing out of the board if it has only just arrived.
   *
   * Every part of it is a function of the clock and the cell's own coordinates,
   * so no shadow holds any state of its own and no two of them move in step.
   * Two creatures breathing in unison read as one animation played twice, which
   * is the thing that makes a screen full of them look like wallpaper.
   *
   * Written per frame rather than as tweens because the tiles it moves are the
   * board's own cells: `drawBoard` rewrites every one of them every frame, a
   * shadow changes which cell it lives in whenever the stack settles, and a
   * landing bounce is already tweening those same objects. A tween here would
   * have to be found, killed and rebuilt on every one of those events.
   */
  private animateShadow(index: number, column: number, row: number): void {
    this.animatedShadowCells.add(index);

    const phase = column * 2.1 + row * 1.7;
    const clock = this.shadowClock;
    const bob = Math.sin(clock / 520 + phase) * SHADOW_BOB_PIXELS;
    const lean = Math.sin(clock / 830 + phase) * SHADOW_LEAN_DEGREES;
    const breath = 1 + Math.sin(clock / 470 + phase) * SHADOW_BREATH;

    const arriving = this.shadowArrival?.cellIndex === index
      ? Math.min(this.shadowArrival.age / SHADOW_ARRIVAL_DURATION, 1)
      : 1;
    const risen = arriving >= 1 ? 1 : easeOutBack(arriving);

    const x = centerOfColumn(column);
    const y = centerOfRow(row) + bob + (1 - risen) * CELL_SIZE * 0.55;
    const opening = Math.min(arriving * 2.5, 1);

    this.cellTiles[index]
      .setPosition(x, y)
      .setAngle(lean)
      .setScale(breath * (0.5 + 0.5 * risen))
      .setAlpha(opening);

    // Eyes wide as it lands, settling to their idle glow: the flare is what
    // makes an arrival read as something noticing you, and it is the part that
    // catches the eye of a player looking somewhere else on the board.
    const flare = 1 - arriving;
    const glow = 0.8 + 0.2 * Math.sin(clock / 610 + phase);

    this.shadowEyes[index]
      .setVisible(true)
      .setPosition(x, y)
      .setAngle(lean)
      .setScale(
        breath * (1 + flare * 0.6),
        breath * (1 + flare * 0.6) * this.blinkAt(clock, phase),
      )
      .setAlpha(Math.min(glow + flare, 1) * opening);
  }

  /**
   * How open a shadow's eyes are, 0 to 1.
   *
   * Read off the clock rather than scheduled, so a blink costs no timer, no
   * stored state and no allocation — and a shadow that ends up in a different
   * cell simply picks up that cell's rhythm.
   */
  private blinkAt(clock: number, phase: number): number {
    const into = (clock + phase * 700) % (BLINK_INTERVAL + phase * 210);
    if (into > BLINK_DURATION) {
      return 1;
    }

    // Shut and open again across the window, so the lid travels rather than the
    // eye disappearing for a frame.
    return Math.abs(into / (BLINK_DURATION / 2) - 1);
  }

  /**
   * Let the shadow say something, if it has earned the right to.
   *
   * The decision is not here — `shadow-voice.ts` owns when it may speak and
   * what it picks, so the writing and its rules are unit-tested rather than
   * judged by playing for ten minutes. This only counts arrivals and draws.
   */
  private speakForShadow(): void {
    const line = shadowLine(
      this.simulation.shadowOnBoard,
      this.arrivalsSinceShadowSpoke,
      this.spokenShadowLines,
    );

    this.arrivalsSinceShadowSpoke += 1;
    if (line === null) {
      return;
    }

    this.arrivalsSinceShadowSpoke = 0;
    this.spokenShadowLines.push(line);

    this.tweens.killTweensOf(this.shadowSpeech);
    this.shadowSpeech.setText(line).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.shadowSpeech, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: this.shadowSpeech,
      alpha: 0,
      duration: 500,
      delay: this.holdFor(line, 1400),
      onComplete: () => this.shadowSpeech.setVisible(false),
    });
  }

  /**
   * Put a cell back the way an ordinary tile expects to find it.
   *
   * The idle writes position, angle, scale and alpha every frame, so a cell
   * that stops holding a shadow — cleared, or settled into from above — would
   * otherwise keep the lean and the half-second of breath it was in the middle
   * of for the rest of the run. Resetting every cell unconditionally instead
   * would flatten the landing bounce, which is a tween on these same objects.
   */
  private restoreCell(index: number): void {
    const column = index % COLUMNS;
    const row = FIRST_VISIBLE_ROW + Math.floor(index / COLUMNS);

    this.cellTiles[index]
      .setPosition(centerOfColumn(column), centerOfRow(row))
      .setAngle(0)
      .setScale(1)
      .setAlpha(1);
    this.shadowEyes[index].setVisible(false);
  }

  /**
   * Announce a cell the shadow has just taken.
   *
   * Counted off the engine's own counter rather than noticed by watching the
   * board, for the same reason a landing is: by the time the scene looks, the
   * shadow is simply there, and being there is not an event.
   *
   * Every arrival is in a visible row, so there is no hidden-row case to
   * handle: `encroach` ends the run rather than taking a cell the player cannot
   * see.
   */
  private playShadowArrival(): void {
    const { shadowTaken, lastShadowCell } = this.simulation;
    if (shadowTaken === this.shownShadowTaken || lastShadowCell === null) {
      return;
    }

    this.shownShadowTaken = shadowTaken;
    this.soundBoard.play(shadowArrivalVoice());
    this.speakForShadow();

    this.shadowArrival = {
      cellIndex: visibleCellIndex(lastShadowCell.column, lastShadowCell.row),
      age: 0,
    };

    this.sparks.setParticleTint(SHADOW_EDGE_COLOR);
    this.sparks.emitParticleAt(
      centerOfColumn(lastShadowCell.column),
      centerOfRow(lastShadowCell.row),
      SPARKS_PER_CELL,
    );
  }

  /**
   * Build one connection slot, positioned in the gap between its two cells and
   * turned to face along it. Hidden until the board gives it something to link.
   */
  private addConnection(
    column: number,
    row: number,
    toColumn: number,
    toRow: number,
  ): ConnectionSlot {
    const x = (centerOfColumn(column) + centerOfColumn(toColumn)) / 2;
    const y = (centerOfRow(row) + centerOfRow(toRow)) / 2;

    const trace = this.add.image(x, y, TRACE_TEXTURE).setVisible(false);
    if (toRow !== row) {
      trace.setAngle(90);
    }

    return { trace, column, row, toColumn, toRow };
  }

  /**
   * Light every trace whose two cells hold the same colour, and dim the rest.
   *
   * A cell still being animated into counts as empty here, exactly as it does
   * in `drawBoard`, or a trace would connect to a tile that has not landed.
   */
  private drawConnections(): void {
    // Once the run is lost the traces are no longer a picture of the board —
    // they are being put out one at a time by `loseTheBoard`. Recomputing them
    // from board state here would re-light each one the frame after it died.
    if (this.simulation.toppedOut) {
      return;
    }

    for (const slot of this.connections) {
      // Colourless occupants are excluded rather than falling out naturally:
      // two shadow cells side by side hold the same value, so without this they
      // would "connect" — lighting a trace between the two things in the game
      // that are least connected, tinted from a palette entry that does not
      // exist. `isColour` is the same question `findGroups` asks, so the two
      // layers cannot come to different conclusions about what connects.
      const pieceType = this.settledPieceAt(slot.column, slot.row);
      const linked = isColour(pieceType)
        && pieceType === this.settledPieceAt(slot.toColumn, slot.toRow);

      slot.trace.setVisible(linked);
      if (linked) {
        slot.trace.setTint(TRACE_COLORS[pieceType]);
      }
    }
  }

  /**
   * Light the next pad on the progress track when the run has earned it.
   *
   * Deliberately a whole number of pads, not a fraction: a pad either is or is
   * not lit, so every unit of progress arrives as something the player watches
   * happen rather than as a value drifting upward.
   */
  private drawProgress(): void {
    // Nothing accrues while a fragment is on screen: the track has just been
    // spent, and a second fragment landing on top of the first would replace it
    // mid-sentence.
    if (this.storyHolding) {
      return;
    }

    const pads = this.tuning.progressPads;
    const earned = this.simulation.connectionsMade - this.connectionsSpent();
    const progress = Math.min(earned / this.nodeCost(this.nodesRevealed), 1);
    const lit = Math.floor(progress * pads);

    if (lit === this.litPads) {
      return;
    }

    const gainedFrom = this.litPads;
    this.litPads = lit;
    this.redrawTrack();
    this.redrawMemoryPanel(progress);

    // One announcement per pad, not one per frame. A big chain can clear enough
    // cells to cross two or three boundaries at once, and collapsing those into
    // a single blip would under-sell exactly the moment that earned the most.
    // Staggered rather than simultaneous, so a chain that jumps several pads
    // walks up the track audibly instead of landing as one chord.
    this.sparks.setParticleTint(TRACK_LIT_COLOR);
    for (let pad = gainedFrom; pad < lit; pad += 1) {
      const point = trackPath.pointAt(pad / pads);
      this.sparks.emitParticleAt(point.x, point.y, SPARKS_PER_CELL);
      this.soundBoard.play({
        ...nodeVoice(pad, pads),
        delay: (pad - gainedFrom) * 70,
      });
    }

    if (lit === pads) {
      this.revealNextNode();
    }
  }

  /**
   * What the next fragment costs, and what every fragment so far has cost.
   *
   * Costs escalate, so progress cannot be a single division. Spending is summed
   * rather than subtracted from a running balance because the engine's counter
   * only ever goes up.
   */
  private nodeCost(index: number): number {
    const schedule = this.tuning.connectionsPerNode;
    return schedule[Math.min(index, schedule.length - 1)];
  }

  private connectionsSpent(): number {
    let spent = 0;
    for (let index = 0; index < this.nodesRevealed; index += 1) {
      spent += this.nodeCost(index);
    }
    return spent;
  }

  /**
   * Which memory a fragment index falls in, and where inside it.
   *
   * Derived rather than tracked as two counters, so there is one number to
   * reset and no way for the pair to disagree.
   */
  private locate(total: number): { memoryIndex: number; nodeIndex: number } | null {
    let remaining = total;

    for (let index = 0; index < MEMORIES.length; index += 1) {
      const nodes = MEMORIES[index].nodes.length;
      if (remaining < nodes) {
        return { memoryIndex: index, nodeIndex: remaining };
      }
      remaining -= nodes;
    }

    // Every fragment the game has has been surfaced. This used to hand back an
    // index one past the end instead, which `revealNextNode` then read straight
    // off the array — and a frame that throws stops the render loop for the
    // rest of the session, so the only thing between that and a dead game was a
    // caller remembering to check a constant first. `null` makes both callers
    // say what they do when there is nothing left.
    return null;
  }

  /**
   * Surface the fragment the closed circuit just paid for.
   *
   * Deliberately NOT a scene change. Cutting away to read and cutting back is
   * the shape of every narrative game that feels like homework, and it made a
   * memory something the player was shown rather than something that happened
   * to the run they were in. So the board is held for a beat, one fragment
   * surfaces over it, and play resumes — while the node lights permanently in
   * the panel, which is the part that lasts.
   *
   * Filling the last node of a memory earns its question instead, which is the
   * only moment anything here speaks to the person at the keyboard.
   */
  private revealNextNode(): void {
    const at = this.locate(this.nodesRevealed);
    if (at === null) {
      // Nothing left to surface. The track stays full, which is the honest
      // picture: the run has seen everything this game has.
      return;
    }

    const { memoryIndex, nodeIndex } = at;
    const memory = MEMORIES[memoryIndex];
    const node = memory.nodes[nodeIndex];
    this.nodesRevealed += 1;

    // The question follows the last fragment rather than replacing it, and it
    // arrives with NO title over it. It used to carry the memory's name, and
    // "HIGH SCHOOL" standing over "What have you been putting off?" read as a
    // question about high school — it is not. It is the one line in the game
    // addressed to the person holding the keyboard, and a category label above
    // it makes it part of the exhibit instead.
    this.pendingReveal = nodeIndex === memory.nodes.length - 1
      ? { title: '', body: memory.question, memoryIndex }
      : null;

    // Spent. Emptying the track is the feedback that the circuit paid for
    // something, and it re-arms `drawProgress`, which short-circuits whenever
    // the lit count is unchanged — leaving it full meant a player who banked
    // more than one fragment's worth never saw the second.
    this.litPads = 0;
    this.redrawTrack();
    // With the count already incremented, so the node just earned draws as
    // earned. Without it the panel keeps the half-lit "arriving" styling from
    // the draw before the increment until the next pad crosses — which, on the
    // escalating schedule, can be a minute later.
    this.redrawMemoryPanel(0);

    this.showReveal(node.title, node.body, this.holdFor(node.body, this.tuning.fragmentDuration));
  }

  /**
   * How long to hold a line on screen: a floor, plus reading time for its
   * length.
   *
   * Here rather than inside `showReveal` because the floor differs by what is
   * being shown — a question lingers after it has been read and a fragment does
   * not — and passing the number in keeps `showReveal` about drawing.
   */
  private holdFor(text: string, floor: number): number {
    return floor + text.length * this.tuning.readingPerCharacter;
  }

  /**
   * Whether the story has the game held — a fragment on screen, or a question
   * waiting on an answer. Both freeze the simulation and refuse input; only one
   * of them ends on its own.
   */
  private get storyHolding(): boolean {
    return this.revealRemaining > 0 || this.awaitingAnswer;
  }

  /**
   * Move past the fragment on screen: to its question if it has one, or off.
   *
   * Shared by the countdown running out and by Space, so a skip advances the
   * same way a wait does — pressing Space through a memory walks its last
   * fragment to the question rather than throwing the question away with it.
   */
  private advanceReveal(): void {
    const pending = this.pendingReveal;
    this.pendingReveal = null;

    if (pending === null) {
      this.hideReveal();
      return;
    }

    this.askQuestion(pending.body, pending.memoryIndex);
  }

  /**
   * Put the question up and wait for an answer. No countdown: this is the only
   * screen in the game that ends when the player decides it does.
   */
  private askQuestion(question: string, memoryIndex: number): void {
    this.awaitingAnswer = true;
    this.answerText = '';
    this.answeringMemory = memoryIndex;

    this.revealTitle.setVisible(false);
    this.revealBody.setText(question);
    this.revealHint.setText(ANSWER_PROMPT);

    this.tweens.killTweensOf([this.revealScrim, this.revealBody, this.revealHint, this.answerLine]);
    this.revealScrim.setVisible(true).setAlpha(0.9);
    this.answerLine.setText('').setVisible(true).setAlpha(1);

    for (const part of [this.revealBody, this.revealHint]) {
      part.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: part, alpha: 1, duration: 340, delay: 120 });
    }
  }

  /**
   * One keystroke into the answer.
   *
   * Enter submits, and an empty answer is how you decline — no second key to
   * learn, and refusing is a real choice rather than a missing one. Printable
   * characters only: everything else on a keyboard is a control this screen
   * does not have.
   */
  private typeIntoAnswer(event: KeyboardEvent): void {
    if (!this.awaitingAnswer) {
      return;
    }

    if (event.key === 'Enter') {
      this.submitAnswer();
      return;
    }

    if (event.key === 'Backspace') {
      this.answerText = this.answerText.slice(0, -1);
      return;
    }

    if (event.key.length === 1 && this.answerText.length < ANSWER_LIMIT) {
      this.answerText += event.key;
    }
  }

  /**
   * Take the answer, and pay it out.
   *
   * The engine is handed the FACT of an answer and nothing else — see
   * `Simulation.answerQuestion`. What was typed only ever comes back to the
   * panel, where the person who wrote it can see it; nothing reads it.
   *
   * Declining is silent on purpose. There is no penalty sting, no "are you
   * sure": you simply keep every cell the shadow took, which is penalty enough
   * and does not scold.
   */
  private submitAnswer(): void {
    const answer = this.answerText.trim();
    this.awaitingAnswer = false;
    this.hideReveal();

    if (answer === '') {
      this.answerLine.setVisible(false);
      return;
    }

    // Held over the board while the wave clears it, rather than vanishing the
    // instant it is submitted. What the player typed is the thing that paid
    // for the payout, so it should still be on screen while the payout happens
    // — and at the size they typed it, not shrunk into the margin.
    this.answerLine.setText(answer);
    this.tweens.killTweensOf(this.answerLine);
    this.tweens.add({
      targets: this.answerLine,
      alpha: 0,
      duration: 700,
      delay: this.holdFor(answer, 900),
      onComplete: () => this.answerLine.setVisible(false).setAlpha(1),
    });

    this.memoryAnswers[this.answeringMemory] = answer;
    this.showAnswerEcho();
    this.driveOffShadow();
  }

  /** The answer, beside the memory it belongs to, for the rest of the run. */
  private showAnswerEcho(): void {
    const answer = this.memoryAnswers[this.answeringMemory];

    if (answer === undefined) {
      this.answerEcho.setVisible(false);
      return;
    }

    this.answerEcho.setText(`"${answer}"`).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.answerEcho, alpha: 1, duration: 600, delay: 400 });
  }

  /**
   * The wave: every shadow on the board driven off, deepest first.
   *
   * Staggered rather than simultaneous, and the stagger is the whole effect —
   * a board that empties in one frame is a state change, and one that empties
   * over a second and a half is something happening. The camera kick scales
   * with how much was taken back, so answering on a board you were losing hits
   * hardest, which is when it should.
   */
  private driveOffShadow(): void {
    const driven = this.simulation.answerQuestion();
    if (driven.length === 0) {
      return;
    }

    this.tweens.killTweensOf(this.popTiles);
    this.cameras.main.shake(220 + 18 * Math.min(driven.length, 12), this.tuning.shakeIntensity * 3);

    for (let index = 0; index < driven.length; index += 1) {
      const cell = driven[index];
      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);
      const delay = index * 55;

      const tile = this.popTiles[index];
      tile
        .setPosition(x, y)
        .setTexture(tileTexture(SHADOW))
        .setScale(1)
        .setAngle(0)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: tile,
        scale: 1.7,
        alpha: 0,
        duration: 340,
        delay,
        ease: 'Quad.easeOut',
        onComplete: () => tile.setVisible(false),
      });

      this.soundBoard.play(answerVoice(index));
      this.time.delayedCall(delay, () => {
        this.sparks.setParticleTint(TRACK_LIT_COLOR);
        this.sparks.emitParticleAt(x, y, SPARKS_PER_CELL * 2);
      });
    }
  }

  /** Hold the board and put a line over it. */
  private showReveal(title: string, body: string, duration: number): void {
    this.revealRemaining = duration;
    this.revealSkippableIn = REVEAL_SKIP_GRACE;
    this.revealHint.setText(SKIP_PROMPT).setVisible(false);
    this.revealTitle.setText(title);
    // An empty title is hidden rather than drawn blank, so the body keeps its
    // own spacing instead of sitting under a gap where a heading would be.
    this.revealTitle.setVisible(title !== '');
    this.revealBody.setText(body);

    this.tweens.killTweensOf([this.revealScrim, this.revealTitle, this.revealBody]);
    this.revealScrim.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.revealScrim, alpha: 0.9, duration: 240 });

    for (const text of [this.revealTitle, this.revealBody]) {
      if (text === this.revealTitle && text.text === '') {
        continue;
      }
      text.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, duration: 340, delay: 160 });
    }
  }

  private hideReveal(): void {
    const parts = [this.revealScrim, this.revealTitle, this.revealBody, this.revealHint];
    this.tweens.killTweensOf(parts);
    this.tweens.add({
      targets: parts,
      alpha: 0,
      duration: 280,
      onComplete: () => {
        for (const part of parts) {
          part.setVisible(false);
        }
      },
    });
  }

  /**
   * Paint the whole track: the dormant bus, the energised run up to the last lit
   * pad, then every pad and its tap stub on top.
   *
   * Every fifth pad is a square rather than a round one, which divides the loop
   * into quarters you can count at a glance instead of a uniform ring of dots.
   */
  private redrawTrack(): void {
    const track = this.progressTrack;
    const pads = this.tuning.progressPads;
    track.clear();

    this.strokeTrackRun(TRACK_COLOR, 2, 1, 1);
    if (this.litPads > 0) {
      this.strokeTrackRun(TRACK_LIT_COLOR, 3, this.litPads / pads, 1);
    }

    for (let pad = 0; pad < pads; pad += 1) {
      const point = trackPath.pointAt(pad / pads);
      const lit = pad < this.litPads;
      const color = lit ? TRACK_LIT_COLOR : TRACK_COLOR;
      // Every fifth pad is bigger, dividing the loop into quarters you can
      // count at a glance rather than a uniform ring of dots.
      const size = (lit ? 5 : 3.5) * (pad % 5 === 0 ? 1.5 : 1);

      track.lineStyle(lit ? 3 : 2, color, 1);
      track.lineBetween(
        point.x,
        point.y,
        point.x + point.outX * TRACK_STUB,
        point.y + point.outY * TRACK_STUB,
      );

      // Square pads, not round. Phaser's Graphics keeps no retained geometry —
      // it re-walks its command buffer every frame — and it steps arcs at a
      // fixed 1/100 turn, so each round pad cost a hundred vertices per frame
      // however small it was. A rect submits directly.
      track.fillStyle(color, 1);
      track.fillRect(point.x - size, point.y - size, size * 2, size * 2);
    }
  }

  /**
   * Draw the coming memory as an unlit constellation, lighting one node for
   * each fraction of it the run has earned.
   *
   * The same layout the memory itself uses, so what fills in here is what the
   * player will walk through — an outline completing is only a payoff if the
   * thing that arrives is the thing they watched.
   */
  private redrawMemoryPanel(progress: number): void {
    // Past the last fragment there is no next memory to draw, so the panel
    // holds the one just finished, every node of it lit.
    const at = this.locate(this.nodesRevealed);
    const memoryIndex = at === null ? MEMORIES.length - 1 : at.memoryIndex;
    const memory = MEMORIES[memoryIndex];
    const count = memory.nodes.length;
    const panel = this.memoryPanel;

    // Nodes already surfaced stay lit for the rest of the run; the one being
    // worked toward is the only thing `progress` moves.
    const lit = at === null ? count : at.nodeIndex;

    panel.clear();

    for (let index = 0; index < count; index += 1) {
      const point = this.memoryNodePosition(index, count);
      const earned = index < lit;
      const arriving = index === lit && progress > 0;
      const color = earned ? TRACK_LIT_COLOR : TRACK_COLOR;

      if (index > 0) {
        const previous = this.memoryNodePosition(index - 1, count);
        const turn = (previous.y + point.y) / 2;
        panel.lineStyle(2, earned ? TRACK_LIT_COLOR : TRACK_COLOR, earned ? 0.9 : 0.45);
        panel.beginPath();
        panel.moveTo(previous.x, previous.y);
        panel.lineTo(previous.x, turn);
        panel.lineTo(point.x, turn);
        panel.lineTo(point.x, point.y);
        panel.strokePath();
      }

      // Rects, not circles, for the reason the track's pads are: Phaser walks a
      // Graphics command buffer every frame and steps an arc at a fixed 1/100
      // turn, so a round pad costs a hundred vertices a frame however small.
      panel.fillStyle(arriving ? TRACK_LIT_COLOR : color, earned ? 1 : 0.35 + (arriving ? progress * 0.5 : 0));
      panel.fillRect(point.x - MEMORY_PAD, point.y - MEMORY_PAD, MEMORY_PAD * 2, MEMORY_PAD * 2);
    }
  }

  private memoryNodePosition(index: number, count: number): { x: number; y: number } {
    const layout = nodeLayout(index, count);
    return {
      x: MEMORY_PANEL_LEFT + layout.x * MEMORY_PANEL_WIDTH,
      y: MEMORY_PANEL_TOP + layout.y * MEMORY_PANEL_HEIGHT,
    };
  }

  /**
   * Trace the bus from its start to `reached` of the way round.
   *
   * Walks the polyline's own corners and stops at the exact point, rather than
   * sampling it at a fixed resolution — which the first version did 240 times
   * per stroke, spending about thirty vertices a corner to draw each corner
   * slightly wrong.
   */
  private strokeTrackRun(color: number, width: number, reached: number, alpha: number): void {
    const track = this.progressTrack;
    const path = trackPath.pathUpTo(reached);

    track.lineStyle(width, color, alpha);
    track.beginPath();
    track.moveTo(path[0].x, path[0].y);
    for (let index = 1; index < path.length; index += 1) {
      track.lineTo(path[index].x, path[index].y);
    }
    track.strokePath();
  }

  /**
   * Run the pulses along the part of the track that has been energised.
   *
   * They travel only as far as the circuit reaches, so early in a run they
   * shuttle round a short arc and late in one they sweep the whole board.
   */
  private advanceTrackPulses(delta: number): void {
    const reached = this.litPads / this.tuning.progressPads;

    if (reached === 0) {
      for (const pulse of this.trackPulses) {
        pulse.setVisible(false);
      }
      return;
    }

    this.pulsePhase = (this.pulsePhase + delta / PULSE_PERIOD) % 1;

    for (let index = 0; index < this.trackPulses.length; index += 1) {
      const along = (this.pulsePhase + index / this.trackPulses.length) % 1;
      const point = trackPath.pointAt(along * reached);
      // Brightest in the middle of its run and faint at either end, so a pulse
      // arrives and leaves rather than blinking into existence at the corner.
      const fade = Math.sin(along * Math.PI);
      this.trackPulses[index]
        .setVisible(true)
        .setPosition(point.x, point.y)
        .setAlpha(0.35 + 0.65 * fade)
        .setScale(0.5 + 0.7 * fade);
    }
  }

  /** The piece in a cell, treating one mid-animation as not yet arrived. */
  private settledPieceAt(column: number, row: number): number | null {
    if (this.cellsBeingFilled.has(visibleCellIndex(column, row))) {
      return null;
    }
    return this.simulation.board.pieceAt(column, row);
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
        this.loseTheBoard();
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

    this.popCells(lastBeat.link, lastBeat.connections);
    // `chainLength` has already been incremented past this link, so the first
    // link of a cascade pops at index 0.
    this.soundBoard.play(popVoice(this.simulation.chainLength - 1));
  }

  /**
   * Shrink and fade a tile where one just cleared. Shorter than the beat that
   * carries it, so the hole is empty and legible before the next beat starts.
   */
  private popCells(link: ChainLink, connections: number): void {
    const shadowPushed = link.shadowCleared;
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

    // Fixed before the shadow borrows from the same pool, because the popup
    // belongs over what the player cleared — averaging the shadow cells in
    // would drag it off toward whatever happened to be standing beside it.
    const poppedCells = borrowed;

    for (const cell of shadowPushed) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);

      const tile = this.popTiles[borrowed];
      borrowed += 1;

      tile
        .setPosition(x, y)
        .setTexture(tileTexture(SHADOW))
        .setScale(1)
        .setAngle(0)
        .setAlpha(1)
        .setVisible(true);

      // Blown outward, where a cleared tile collapses inward. A piece falls
      // into the hole it leaves; this is the one thing on the board that is
      // being driven off it, and the two should not read as the same event.
      this.tweens.add({
        targets: tile,
        scale: 1.45,
        alpha: 0,
        duration: this.tuning.popDuration * 1.6,
        ease: 'Quad.easeOut',
        onComplete: () => tile.setVisible(false),
      });

      this.restoreCell(visibleCellIndex(cell.column, cell.row));
      this.sparks.setParticleTint(SHADOW_EYE_GLOW);
      this.sparks.emitParticleAt(x, y, SPARKS_PER_CELL);
    }

    if (shadowPushed.length > 0) {
      this.soundBoard.play(shadowRecedeVoice(shadowPushed.length));
    }

    if (poppedCells > 0) {
      this.showConnectionPopup(sumX / poppedCells, sumY / poppedCells, connections);
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
   * What this link earned, floating up from the middle of what popped.
   *
   * Connections, not points, because connections are what buy a memory — and
   * the multiplier is spelled out beside them whenever it is above one. The
   * chain weighting existed for a while with nothing on screen reporting it,
   * which made deliberately building a chain a strictly invisible reward: the
   * player got three times the progress and no way to learn that they had.
   */
  private showConnectionPopup(x: number, y: number, connections: number): void {
    const multiplier = this.simulation.chainLength;
    const label = multiplier > 1 ? `+${connections}  x${multiplier}` : `+${connections}`;
    const popup = this.scorePopups[this.nextScorePopup];
    this.nextScorePopup = (this.nextScorePopup + 1) % this.scorePopups.length;

    this.tweens.killTweensOf(popup);
    popup.setText(label).setPosition(x, y).setAlpha(1).setVisible(true);

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
    // Not while a fragment is up. Both can be true in one frame — the clear
    // that fills the meter can be the same clear that ends the run — and the
    // reveal was drawn first, so GAME OVER printed straight across the memory
    // it had just paid for. The run is over either way; the memory goes first.
    // Shown by `loseTheBoard` once the connections have finished dying, rather
    // than the instant the run ends — otherwise the words arrive over an ending
    // that has not happened yet. This only ever hides them.
    if (!this.simulation.toppedOut || this.storyHolding) {
      this.gameOverText.setVisible(false);
      this.gameOverLine.setVisible(false);
      this.gameOverHint.setVisible(false);
    }
  }

  /**
   * The shadow winning, which until now was the words TOPPED OUT.
   *
   * This board is about connections, so losing it is watching them go: every
   * lit trace dies in turn, falling a semitone a cell — `answerVoice` run
   * backwards, because answering the question is the moment this is the
   * opposite of. The memory panel dims with them, since what a run built is
   * what it loses.
   *
   * Nothing here touches the simulation. The run is already over; this is the
   * scene taking a beat to say so.
   */
  private loseTheBoard(): void {
    const lit = this.connections.filter((slot) => slot.trace.visible);

    // The signal degrading, which is the half of this the notes asked for and
    // the connections dying is the other half. Colour drains and the image
    // coarsens as the interference comes up, so the board is visibly being
    // lost rather than merely covered over.
    this.staticOverlay.setVisible(true).setAlpha(0);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(lit.length * 45, 600),
      onUpdate: (tween) => {
        this.staticStrength = tween.getValue() ?? 0;
      },
    });

    const drained = this.cameras.main.filters.external.addColorMatrix();
    this.tweens.addCounter({
      from: 0,
      to: 0.75,
      duration: Math.max(lit.length * 45, 600),
      onUpdate: (tween) => drained.colorMatrix.grayscale(tween.getValue() ?? 0),
    });

    lit.forEach((slot, index) => {
      this.soundBoard.play(connectionLostVoice(index));
      this.tweens.add({
        targets: slot.trace,
        alpha: 0,
        duration: 220,
        delay: index * 45,
        onComplete: () => slot.trace.setAlpha(1).setVisible(false),
      });
    });

    // Long enough for the last trace to have gone, plus a beat of silence.
    const settled = lit.length * 45 + 320;

    this.tweens.add({
      targets: this.memoryPanel,
      alpha: 0.15,
      duration: 700,
      delay: settled * 0.4,
    });

    this.time.delayedCall(settled, () => {
      // A restart during the sequence cancels it; the next run must not open
      // with the last one's ending printed over it.
      if (!this.simulation.toppedOut) {
        return;
      }
      for (const text of [this.gameOverText, this.gameOverLine, this.gameOverHint]) {
        text.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 420 });
      }
    });
  }

  private refreshFps(time: number): void {
    if (time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
