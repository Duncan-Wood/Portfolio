import { BlendModes, Input, Scene } from 'phaser';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  PIECE_TYPE_COUNT,
  ROWS,
  VISIBLE_ROWS,
  isColour,
  isNeuronLit,
  isShadow,
  neuronCell,
  shadowHolding,
  shadowStrength,
} from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { type TileMove } from '../engine/board';
import { type ChainLink, type ShadowHit } from '../engine/matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';
import {
  GROUND_COLOR,
  TRACE_COLORS,
  TRACK_LIT_COLOR,
  PIECE_COLORS,
  mix,
  SHADOW_EDGE_COLOR,
  SHADOW_EYE_GLOW,
  TRACK_COLOR,
} from '../palette';
import {
  SHADOW_EYES_TEXTURE,
  TRACE_TEXTURE,
  bakeTileTextures,
  memoryArtTexture,
  shadowBodyTexture,
  tileTexture,
} from './tile-textures';
import { brainNodeAt, drawBrain } from './brain';
import { isSolved, lockFor, seedLock } from '../engine/locks';
import { neuronsOn, unlitCount, type NeuronSite } from '../engine/neurons';
import { MEMORIES } from '../memories';
import {
  CONNECTION_LOST,
  REACH_OUT_LINE,
  SHADOW_CLOSING_LINE,
  SHADOW_OPENING_LINE,
  STILL_CONNECTED,
  closingLine,
  recoveredLine,
  shadowLine,
  type UnfinishedBusiness,
} from '../shadow-voice';
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
  shadowStruckVoice,
  topOutVoice,
} from '../audio/voices';

/*
 * The only file where Phaser and game logic meet: read the keyboard, drive the
 * clock, draw whatever the engine says is true. Every rule lives in a
 * Phaser-free module elsewhere, so logic accumulating here is in the wrong place.
 *
 * A pure function of engine state — `drawBoard` repaints from the board every
 * frame — so there is no second copy of the game to keep in sync.
 */

const CELL_SIZE = 64;
const GAP = 4;

/**
 * How often the FPS readout is rewritten. Phaser rasterises glyphs whenever the
 * string changes, and a rounded frame rate changes often enough to be worth
 * throttling — it also stops the readout flickering.
 */
const FPS_REFRESH_INTERVAL = 250;






/*
 * The shadow's idle. Computed per frame from one clock rather than tweened: a
 * tween would fight `drawBoard`, which rewrites every cell every frame, and
 * would have to be rebuilt each time a shadow changed cell.
 */
const SHADOW_BOB_PIXELS = 2.4;
const SHADOW_LEAN_DEGREES = 3.2;
const SHADOW_BREATH = 0.045;
const SHADOW_ARRIVAL_DURATION = 340;

/**
 * The box a memory's photograph is fitted into. Narrower than the board so the
 * tiles either side stay visible: a fragment DIMS the run it interrupts rather
 * than replacing it, which only holds if the board is still behind the picture.
 */
const PHOTO_MAX_WIDTH = 330;
const PHOTO_MAX_HEIGHT = 250;

/**
 * Not zero: a fragment surfaces moments after a clear, so moments after the
 * player may have been hitting Space to hard-drop, and an instant skip would let
 * a reflex throw away the reward for a whole minute.
 */
const REVEAL_SKIP_GRACE = 420;

/**
 * How long a solved board waits before handing over, so the player never watches
 * a board they solved being taken apart.
 *
 * BEHIND_REVEAL must stay longer than the scrim's fade-in, so the swap is under
 * a cover already fully up, and shorter than `REVEAL_SKIP_GRACE`, so it cannot
 * race a player who skips the fragment. IN_THE_OPEN is for a board with nothing
 * to hide behind; DIM matches the scrim's fade-in.
 */
const HANDOVER_BEHIND_REVEAL = 300;
const HANDOVER_IN_THE_OPEN = 900;
const HANDOVER_DIM = 240;

/**
 * The most an answer may be, and how fast its caret blinks. Capped because the
 * answer lives on the memory panel for the rest of the run, and because it is
 * the length of a thing you would say out loud rather than a diary.
 */
const ANSWER_LIMIT = 48;

/**
 * The two prompts a held board can show. Named because they share one text
 * object, and whichever is set last stays set — a fragment shown after a
 * question must put the skip prompt back or it invites an answer nothing reads.
 */
const SKIP_PROMPT = 'space';
const ANSWER_PROMPT = 'type an answer   ·   enter';
const CARET_PERIOD = 1060;

/** Milliseconds an eye stays shut, and the shortest gap between two blinks. */
const BLINK_DURATION = 90;
const BLINK_INTERVAL = 2300;

const SPARK_TEXTURE = 'spark';

/**
 * The noise the board dissolves into when the run is lost: a square of random
 * grey pixels, tiled over the board and jittered per frame. Still grain reads as
 * film, where grain that MOVES reads as a signal failing.
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
 * Top-left corner of the board in canvas pixels. Left-aligned rather than
 * centred because the preview and brain need the column beside it.
 */
const ORIGIN_X = 40;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE + (VISIBLE_ROWS - 1) * GAP;
const ORIGIN_Y = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;

/*
 * Where the coming memory takes shape, a node lighting per fragment earned. The
 * nodes carry no words: the point is how much is left, not what it says.
 */
const MEMORY_PANEL_TOP = 300;
const MEMORY_PANEL_HEIGHT = 450;

/** Clear of the progress track's stubs on the left, and the canvas on the right. */
const MEMORY_PANEL_LEFT = 476;

/**
 * The only prose in the right-hand column, so it gets the whole width. Must stay
 * clear of the board's right edge, or a long answer renders across the game.
 */
const ANSWER_ECHO_LEFT = MEMORY_PANEL_LEFT;

/**
 * The brain's box, filling the right-hand column under the preview. It takes
 * every pixel between the preview and the answer echo: it is the progress meter
 * for the whole game, and a brain squeezed narrower reads as a blob.
 */
const BRAIN_BOX = {
  left: ORIGIN_X + BOARD_WIDTH + 14,
  top: MEMORY_PANEL_TOP - 46,
  width: CANVAS_WIDTH - (ORIGIN_X + BOARD_WIDTH) - 26,
  height: 300,
};

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

/*
 * Drawn once, measuring nothing — without it the tiles float with nothing saying
 * where the playfield stops. Mitred rather than square: a square corner reads as
 * a border around a game, a cut one as routing that had to get somewhere.
 */
const BOARD_FRAME_MARGIN = 15;

/** What a memory's own words are set in, so the opening can borrow the object. */
const REVEAL_BODY_COLOR = '#e8eef2';
const BOARD_FRAME_CHAMFER = 20;

/** The frame's corners, clockwise from the top-left cut. */
function boardFrameCorners(): { x: number; y: number }[] {
  const left = ORIGIN_X - BOARD_FRAME_MARGIN;
  const top = ORIGIN_Y - BOARD_FRAME_MARGIN;
  const right = left + BOARD_WIDTH + BOARD_FRAME_MARGIN * 2;
  const bottom = top + BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2;
  const cut = BOARD_FRAME_CHAMFER;

  return [
    { x: left + cut, y: top },
    { x: right - cut, y: top },
    { x: right, y: top + cut },
    { x: right, y: bottom - cut },
    { x: right - cut, y: bottom },
    { x: left + cut, y: bottom },
    { x: left, y: bottom - cut },
    { x: left, y: top + cut },
  ];
}

/**
 * A canvas x turned into a stereo position, -1 to 1. Narrower than the full
 * field: the point is to say WHERE, not to throw the sound across the room, and
 * hard-panning a puzzle board is disorienting on headphones.
 */
function panForX(x: number): number {
  const across = (x - ORIGIN_X) / BOARD_WIDTH;
  return Math.max(-1, Math.min(1, (across - 0.5) * 1.4));
}

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
 * Show only the part of a tile inside the board, so a pair spawning half in the
 * hidden row emerges a sliver at a time.
 *
 * NOT a mask: Phaser 4's `setMask` compiles, runs, and leaves the tile drawn in
 * full. `setCrop` rather than a resize, which squashes the texture.
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
 * Overshoot and settle back, so something arrives as though it had weight rather
 * than sliding into position. Written out rather than taken from Phaser's easing
 * table because the shadow's arrival is computed per frame, not tweened.
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
 * How far into the wait before the shadow's next target starts to show. Not from
 * zero: a warning that is always on is wallpaper. Late enough to be a warning,
 * early enough that a clear can still answer it.
 */
const THREAT_VISIBLE_FROM = 0.45;

/** How long a trace takes to light, and the longer tail it dims over. */
const TRACE_FADE_IN = 90;
const TRACE_FADE_OUT = 220;

/** How long a signal takes to cross one trace and die away behind it. */
const TRACE_CHARGE_DECAY = 260;

/**
 * The delay on a trace with one foot outside the group that just cleared. The
 * traces inside the group fire together and the ones leading out of it fire a
 * beat later, so the charge visibly leaves where it started.
 */
const TRACE_SIGNAL_STEP = 70;

/**
 * Every slot the board could light is built once at a fixed position and then
 * only shown or hidden, so nothing is allocated mid-cascade.
 */
interface ConnectionSlot {
  trace: Phaser.GameObjects.Image;
  column: number;
  row: number;
  toColumn: number;
  toRow: number;
  /**
   * 0..1, eased toward whether its two cells match. A number rather than
   * visibility: traces that snap on and off read as tiles sprouting connectors,
   * where a network that fades up and lingers reads as wiring.
   */
  lit: number;
  /** Signal brightness, 0..1, set by a clear and decaying to nothing. */
  charge: number;
  /** Milliseconds before this trace's charge fires, so a signal travels. */
  chargeDelay: number;
  /** The colour to carry while charged, kept because the tiles are gone by then. */
  chargeColor: number;
}

/**
 * Randomness lives in the scene, NOT the engine. Module-level rather than an
 * arrow inside the class: an arrow captures `this`, and handing that to the
 * long-lived `Simulation` would keep the entire scene alive with it.
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
  private showFps = false;
  private objectiveText: Phaser.GameObjects.Text;

  /** Which lock this board is posing, and whether it has been solved yet. */
  private lockSolved = false;

  /**
   * Counts down while a spent board is shown before it is re-seeded. Zero when
   * nothing is failing. A board that vanished the frame the last piece landed
   * would never tell the player what happened.
   */
  private lockEndingIn = 0;

  /** What the piece counter last showed, so the text is only rewritten on a change. */
  private shownPiecesRemaining = -1;

  /**
   * In the order they went. The board knows WHICH are lit, but the thread is
   * drawn in the sequence the player reached them, which is a fact about the run
   * rather than the position.
   */
  private litNeurons: NeuronSite[] = [];

  private neuronThread: Phaser.GameObjects.Graphics;

  /**
   * The visible cell the shadow is currently reaching for, so the warning on
   * it can be taken off again when it moves or the timer resets.
   */
  private threatenedIndex: number | null = null;
  private chainText: Phaser.GameObjects.Text;
  /**
   * The interference laid over the board once the run is lost, and how far it has
   * come up. A TileSprite rather than a stretched image so the grain stays the
   * size it was baked at — scaled noise is blurry, and blurry noise reads as fog.
   */
  private staticOverlay: Phaser.GameObjects.TileSprite;

  private staticStrength = 0;

  private gameOverText: Phaser.GameObjects.Text;

  private gameOverLine: Phaser.GameObjects.Text;

  private gameOverHint: Phaser.GameObjects.Text;

  /**
   * The way to reach a person, offered only when a memory has been finished. A
   * real link rather than a line of text: this is the one moment somebody has
   * spent a few minutes inside somebody else's life.
   */
  private contactOffer: Phaser.GameObjects.Text;
  private previewTiles: Phaser.GameObjects.Image[];

  private piecesText: Phaser.GameObjects.Text;
  private shownPivotType = -1;
  private shownSatelliteType = -1;
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
   * Held by the player rather than by the game. A flag of our own rather than
   * Phaser's `scene.pause()`, which stops `update` altogether — and `update` is
   * what reads the keyboard, so the key that paused it could never unpause it.
   */
  private paused = false;

  private pauseScrim: Phaser.GameObjects.Rectangle;
  private pauseText: Phaser.GameObjects.Text;
  private pauseHint: Phaser.GameObjects.Text;

  /**
   * Tiles borrowed for one cascade beat: `popTiles` shrink where a tile cleared,
   * `fallTiles` travel from a tile's old row to its new one. Pooled at full board
   * size and reused, so a cascade allocates nothing.
   */
  private popTiles: Phaser.GameObjects.Image[];
  private fallTiles: Phaser.GameObjects.Image[];

  /**
   * One slot per visible cell, indexed exactly like `cellTiles`. A layer rather
   * than a swapped texture, because a shadow POSSESSES a tile: the cell goes on
   * drawing its real colour underneath, so freeing it is this coming off.
   */
  private shadowBodies: Phaser.GameObjects.Image[];

  /**
   * The lit eyes, indexed the same way. Separate from the body because they move
   * independently — they blink, they flare on arrival — and are drawn additively
   * so they read as light rather than paint.
   */
  private shadowEyes: Phaser.GameObjects.Image[];

  /**
   * Exists to put a cell BACK when it stops holding a shadow: the idle writes
   * position, angle, scale and alpha every frame, so a cell cleared while leaning
   * would stay leaning for the run. Resetting every cell instead would flatten
   * the landing bounce, a tween on those same tiles.
   */
  private animatedShadowCells = new Set<number>();

  /**
   * Visible cells currently breathing because they hold an unlit neuron, so
   * the pulse can be taken off again when one is lit or falls out of view.
   */
  private pulsingCells = new Set<number>();

  private revealPhoto: Phaser.GameObjects.Image;

  private shadowArrival: { cellIndex: number; age: number } | null = null;

  /**
   * The shadow talking, and what it has already said. Deliberately NOT the reveal
   * overlay the memories use: a fragment stops the game and dims it, and this does
   * neither, so the shadow needles you while you are still playing.
   */
  private shadowSpeech: Phaser.GameObjects.Text;

  private spokenShadowLines: string[] = [];

  private arrivalsSinceShadowSpoke = 0;

  /**
   * The clock the idle is computed from. Its own rather than the frame's `time`,
   * because it must stop when the game does — a paused board whose shadows keep
   * breathing does not read as paused.
   */
  private shadowClock = 0;

  /** The engine's arrival count as of the one this scene last announced. */
  private shownShadowTaken = 0;

  /**
   * The traces between matching neighbours — the board wiring itself up as it
   * fills. The leading between panes IS the pathway, so a group is visibly a
   * connected circuit before it pops and a cascade is a signal crossing it.
   */
  private connections: ConnectionSlot[];

  /**
   * How this run ended, or `null` while it is still going. One field rather than
   * a boolean per ending, because a consumer that knows about one of them
   * silently ignores the others.
   */
  private runOver: 'topped-out' | 'out-of-pieces' | 'won' | null = null;

  /**
   * The readouts that only mean something while a run is going: NEXT and PIECES
   * answer "what do I have left to work with". The memory panel is deliberately
   * NOT in here — it was just filled in, and should stay up to be looked at.
   */
  private runReadouts: Phaser.GameObjects.Text[] = [];

  /**
   * Held dark until whatever covers the board lifts. The opening holds them so
   * the objective arrives as its ANSWER; a handover holds them so the next lock's
   * numbers do not appear over the fragment the last one earned.
   */
  private objectiveHeld = false;

  /** The board's edge. Drawn once in `create`; it never changes. */
  private boardFrame: Phaser.GameObjects.Graphics;

  /** The coming memory's shape, filling in beside the board as it is earned. */
  private memoryPanel: Phaser.GameObjects.Graphics;

  /** How many neurons the meter has already announced, so it only fires on a change. */
  private shownLitNeurons = 0;

  /**
   * Fragments surfaced this run, counted across every memory. Progress is measured
   * from it rather than by resetting the engine's counter, so connections earned
   * past a threshold carry into the next fragment instead of being thrown away.
   */
  private nodesRevealed = 0;

  /**
   * Milliseconds left on a surfaced fragment. While positive the simulation is
   * frozen and input ignored — the board is held, not torn down, because a memory
   * is an interruption to a run rather than a departure from it.
   */
  private revealRemaining = 0;

  /**
   * A closed circuit waiting for the board to stop moving. `drawProgress` runs
   * during a cascade deliberately, but surfacing from in there would freeze the
   * simulation mid-cascade and land the game's two best moments on each other.
   */
  private revealPending = false;

  /**
   * At most one fragment per placement. A deep chain can pay for a whole memory
   * at once, which without this arrives as a stack of modals over a board nobody
   * has touched; spread out, the same chain pays FORWARD. -1 so the first
   * fragment of a run is never held back.
   */
  private lastRevealPiece = -1;

  /**
   * A question waiting for the fragment in front of it to finish, rather than
   * replacing it — swapping the last node's words for the question would eat a
   * fragment the player earned.
   */
  private pendingReveal: { title: string; body: string; memoryIndex: number } | null = null;

  private revealScrim: Phaser.GameObjects.Rectangle;
  private revealTitle: Phaser.GameObjects.Text;

  /** The "space" prompt, and how long until it means anything. */
  private revealHint: Phaser.GameObjects.Text;

  private revealSkippableIn = 0;

  /**
   * `awaitingAnswer` holds the game as a fragment does but has no clock: it ends
   * on Enter and not before, the only screen here that waits on a person.
   *
   * What was typed is kept only so the panel can show it back. Never scored,
   * branched on, or handed to the engine.
   */
  private awaitingAnswer = false;

  private answerText = '';

  /**
   * Which memory the question on screen belongs to, carried from the fragment that
   * earned it rather than re-derived: `nodesRevealed` has already moved past that
   * memory by the time the answer arrives.
   */
  private answeringMemory = 0;

  private memoryAnswers: string[] = [];

  private answerLine: Phaser.GameObjects.Text;

  private answerEcho: Phaser.GameObjects.Text;
  private revealBody: Phaser.GameObjects.Text;


  /**
   * Visible-cell indices `drawBoard` must leave empty because a `fallTile` is
   * animating into them. Without this the board paints the tile at its
   * destination the instant the engine settles, and the travelling copy reads as
   * a duplicate rather than as the fall.
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
   * Everything drawn is allocated here and never again: the frame loop only
   * changes texture and position.
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
    // time, so this branch drops out of the production bundle entirely.
    if (import.meta.env.DEV) {
      window.tuning = this.tuning;
      // The board too, so a chain can be built from the console rather than
      // played for.
      window.simulation = this.simulation;
      // And the scene, so the juice can be stretched out from the console: most
      // of it is shorter than it takes to look at.
      window.boardScene = this;
    }

    // Darkness at the edges, so the board sits in a pool of light rather than on
    // a flat background. Deliberately weak: it shades the corners and nothing
    // more, because anything stronger stops the colours being tellable apart at
    // speed.
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);

    // Under everything on the board, so a tile in the outermost column sits on
    // the frame rather than behind it.
    this.boardFrame = this.add.graphics();
    const frame = boardFrameCorners();
    this.boardFrame.lineStyle(2, TRACK_COLOR, 0.9);
    this.boardFrame.beginPath();
    this.boardFrame.moveTo(frame[0].x, frame[0].y);
    for (const corner of frame.slice(1)) {
      this.boardFrame.lineTo(corner.x, corner.y);
    }
    this.boardFrame.closePath();
    this.boardFrame.strokePath();

    // Before the cells, so the brain sits behind the board's own column.
    this.memoryPanel = this.add.graphics();

    // Every texture the board draws with, before the first thing that asks for
    // one — anything built against a missing texture never recovers.
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

    // Between the cells and the eyes: over the tile it has taken, under the
    // eyes that belong to it.
    this.shadowBodies = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.shadowBodies.push(
          this.add
            .image(centerOfColumn(column), centerOfRow(row), shadowBodyTexture(1))
            .setVisible(false),
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

    // Over the tiles and under the falling pair, so a thread runs across the
    // board it was drawn on without ever hiding the piece being placed.
    this.neuronThread = this.add.graphics();
    this.neuronThread.enableFilters();
    this.neuronThread.filters?.internal.addGlow(TRACK_LIT_COLOR, 2.5, 0, 1, false, 4, 8);

    this.pairTiles = [
      this.add.image(0, 0, tileTexture(null)),
      this.add.image(0, 0, tileTexture(null)),
    ];

    // Created after the board so they draw on top of it, and before the text so
    // the text still draws on top of them.
    this.popTiles = [];
    this.fallTiles = [];
    for (let index = 0; index < COLUMNS * VISIBLE_ROWS; index += 1) {
      this.fallTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
    }
    // Twice the board for the pop pool: a purified cell borrows TWO — the
    // creature breaking open and the tile blooming under it — on top of one per
    // cleared cell. `borrowPopTile` refuses past the end rather than indexing off
    // it, because an exception escaping `update` kills the game until a reload.
    for (let index = 0; index < COLUMNS * VISIBLE_ROWS * 2; index += 1) {
      this.popTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
    }
    // One round white dot, tinted per group at emit time, so four colours of
    // debris cost one texture.
    const sparkTexture = this.add.graphics();
    sparkTexture.fillStyle(0xffffff, 1).fillCircle(SPARK_RADIUS, SPARK_RADIUS, SPARK_RADIUS);
    sparkTexture.generateTexture(SPARK_TEXTURE, SPARK_RADIUS * 2, SPARK_RADIUS * 2);

    // Coarse rather than per-pixel: single pixels read as a dirty screen.
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

    this.runReadouts.push(this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y - 46, 'NEXT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8ea3b0',
    }).setOrigin(0.5, 0.5));

    // What the board has left to spend, in the gap between the preview and the
    // memory panel. It has to clear the preview: above it the label runs off the
    // top of the canvas.
    this.runReadouts.push(this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y + 88, 'PIECES', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7a5f96',
    }).setOrigin(0.5, 0.5));

    this.piecesText = this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y + 112, '', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#e9dcff',
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

    // Typing is the one input that cannot be polled. Every other key is a state
    // the frame asks about; text is a stream of events, and sampling it drops
    // characters typed fast enough to fall between two frames.
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => this.typeIntoAnswer(event));

    // Browsers will not start audio until the player has interacted with the
    // page, so the context is built on the first key rather than here.
    this.input.keyboard!.on(Input.Keyboard.Events.ANY_KEY_DOWN, () => this.soundBoard.unlock());

    // Dev only: the whole readout drops out of the production bundle, the same
    // way the live tuning hook does.
    this.showFps = import.meta.env.DEV;
    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    }).setVisible(this.showFps);


    // What this board is asking for, stated in words. A lock the player cannot
    // read is just a board that ends for reasons of its own.
    this.objectiveText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, 12, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#c98cff',
    }).setOrigin(0.5, 0);

    this.chainText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, ORIGIN_Y + 30, '', {
      fontFamily: 'monospace',
      // Near the top edge rather than dead centre, or it covers the tiles it is
      // congratulating you for.
      fontSize: '28px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Over the board, under nothing. A fragment dims the game it interrupts
    // rather than replacing it, so the run stays visible the whole time.
    this.revealScrim = this.add.rectangle(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
      GROUND_COLOR,
    ).setVisible(false);

    // The photograph, above its own words. Created before them so the title
    // and body always draw over it rather than under.
    this.revealPhoto = this.add.image(ORIGIN_X + BOARD_WIDTH / 2, 0, TRACE_TEXTURE)
      .setVisible(false);

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
      color: REVEAL_BODY_COLOR,
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 56 },
      lineSpacing: 7,
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Only shown once the fragment can actually be skipped, so it teaches the
    // grace period as well as the key. Dim, because it must not compete with the
    // line it is offering to dismiss.
    this.revealHint = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 96, SKIP_PROMPT, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6b5a80',
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Its own object rather than more lines on `revealBody`, so the question
    // stays still while the answer grows underneath it.
    this.answerLine = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 74, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 80 },
      // Stroked because it outlives the scrim: the answer is still up while the
      // wave clears the board, by which point it sits on bare tiles.
      stroke: '#150a24',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Kept beside the memory it belongs to for the rest of the run. Wider than
    // the panel, whose column is for nodes rather than prose — this is the one
    // line in the game the player wrote themselves, and it should not be fine
    // print.
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

    // The way out, at the moment it is needed. Without it R is a secret.
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

    // Under the restart prompt and only ever up on a win. Interactive, so it is a
    // way out rather than an instruction to go and find one — `/#contact` is the
    // portfolio's own contact section.
    this.contactOffer = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 112,
      REACH_OUT_LINE,
      {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#c98cff',
        backgroundColor: '#2b1644',
        padding: { x: 12, y: 6 },
      },
    )
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        window.location.href = '/#contact';
      });

    // Over the board and the traces, under the words — the ending should be
    // read through the interference, not behind it.
    this.staticOverlay = this.add.tileSprite(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
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

    // The shadow's last word, through its own object rather than the needling
    // one, because this is said when nothing can be answered.
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
        align: 'center',
        // Wrapped: this line is composed from the fragment the run was reaching
        // for, and a long title runs off both edges of the canvas.
        wordWrap: { width: BOARD_WIDTH - 24 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    // Last, so it covers the board, the readouts and anything mid-reveal. Over
    // the board's upper third, which is empty for most of a run. Stroked rather
    // than backed with a panel, so it stays legible over tiles without a second
    // object to fade in step.
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

    this.pauseHint = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 46, 'esc or space to resume', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#6b5a80',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.resetShownState();
  }

  /**
   * Input is read FIRST, so a keypress affects the very next simulation step
   * rather than waiting a frame. That is the cheapest latency there is to win.
   */
  update(time: number, delta: number): void {
    // Escape is not a pause while a question is waiting: the game is already
    // held, and the only key that ends it is the one that answers it.
    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }

    // Space resumes as well, because that is the reflex. Safe because `JustDown`
    // returns true once per press, so reading it here CONSUMES it and the same
    // press cannot also reach `readInput` and slam the piece. The `paused` test
    // must come first for that to hold — short-circuiting is what leaves the key
    // unread, and so still available, during normal play.
    if (this.paused && Input.Keyboard.JustDown(this.hardDropKey)) {
      this.setPaused(false);
    }

    // R is a LETTER while a question is waiting for one. Ungated, any answer
    // containing an "r" restarts the run mid-sentence.
    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.restartKey)) {
      this.restart();
    }

    // Nothing to read once the game is over: the simulation refuses input anyway,
    // and polling on would keep writing `softDropping` to a pair already part of
    // the board. Nothing while paused either — but the two keys above are still
    // polled, or there would be no way out.
    if (!this.paused && !this.simulation.toppedOut && !this.storyHolding
      && this.runOver !== 'won') {
      this.readInput(delta);
    }

    if (this.paused) {
      // Everything below advances something. Drawing continues, because Phaser
      // clears the canvas every frame; nothing here consumes `delta`, so no time
      // is banked.
      this.drawBoard();
      this.drawConnections(0);
      this.drawPair();
      this.drawPreview();
      this.refreshChain();
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
        // Space skips: the hold is generous for a slow reader, and somebody who
        // has finished the line should not sit out the rest of it. Safe here
        // because `readInput` is refused while a fragment is up, and hard drop is
        // edge-triggered, so holding Space through the skip cannot slam the next
        // pair.
        this.revealRemaining = 0;
      }

      if (this.revealRemaining <= 0) {
        this.advanceReveal();
      }
    } else if (this.hitStopRemaining > 0) {
      // Deliberately does NOT call `stepsFor`: asking the accumulator for steps
      // and discarding them banks the frozen time and pays it out in a burst the
      // moment the freeze ends.
      this.hitStopRemaining -= delta;
    } else if (this.runOver === 'won') {
      // Held for good. A won run keeps its board on screen exactly as a lost
      // one does, and R is the only way on.
    } else {
      for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
        this.simulation.update(FIXED_STEP);
      }
    }

    // Frozen by hit-stop and by a reveal along with everything else: a board that
    // holds still except for the creatures breathing does not read as held.
    if (this.hitStopRemaining <= 0 && !this.storyHolding) {
      this.shadowClock += delta;

      if (this.shadowArrival !== null) {
        this.shadowArrival.age += delta;
        if (this.shadowArrival.age >= SHADOW_ARRIVAL_DURATION) {
          this.shadowArrival = null;
        }
      }
    }

    this.releaseObjective();
    this.playShadowArrival();
    this.playCascadeBeat();
    this.playSounds();
    this.drawBoard();
    this.checkLock();
    this.refreshPieces(delta);
    this.drawNeuronThread();
    this.drawThreat();
    this.drawConnections(delta);
    this.surfaceBankedFragment();
    this.drawProgress();
    this.drawPair();
    this.drawPreview();
    this.refreshChain();
    this.refreshAnswerLine(time);
    this.refreshStatic();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  /**
   * Jitter the interference, once the run is lost. Scrolled and re-alpha'd every
   * frame rather than tweened: static has to be different each frame or the eye
   * reads it as a texture sitting still on the glass.
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
   * The answer as it is typed, with a caret. Blinks off wall-clock time rather
   * than anything the simulation owns, because the simulation is stopped and a
   * still caret on a still board reads as a hung game.
   */
  private refreshAnswerLine(time: number): void {
    // The prompt has done its job the moment anything is typed, and a two-line
    // answer draws straight through where it sits.
    if (this.awaitingAnswer) {
      this.revealHint.setVisible(this.answerText.length === 0);
    }

    if (!this.awaitingAnswer) {
      return;
    }

    const caret = time % CARET_PERIOD < CARET_PERIOD / 2 ? '_' : ' ';
    this.answerLine.setText(this.answerText + caret);
  }

  /**
   * Hold or release the game. Tweens are paused wholesale alongside the flag, or
   * a pop shrinking behind the overlay makes it read as a bug rather than a pause.
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
   * Without tearing the scene down: `scene.restart()` would rebuild every game
   * object, pools included, to change state the simulation can reset itself.
   *
   * `keepMemory` re-seeds the BOARD only, which is what running out of pieces
   * does. R does not pass it and loses everything.
   */
  private restart(keepMemory = false, keepStory = false): void {
    // A held game that restarts is a running game: leaving the flag set would
    // start the new run frozen behind an overlay the player just dismissed.
    this.setPaused(false);
    this.simulation.restart();

    // Force `newPiece` next frame so the input translator re-latches a held key
    // as it does after a lock, and nothing carries into the new game.
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

    this.resetShownState(keepMemory, keepStory);
  }

  /**
   * Forget everything the scene believes it has already drawn and sounded. The
   * counters are seeded from the engine rather than zeroed, so a restart cannot
   * sound a landing or replay a beat belonging to the run before it.
   */
  private resetShownState(keepMemory = false, keepStory = false): void {
    this.cellsBeingFilled.clear();
    this.threatenedIndex = null;

    // BEFORE `startLock`, and load-bearing: the lock a board seeds is derived
    // from fragments earned, so seeding while this still holds the finished run's
    // count opens a new run on the LAST lock of the memory.
    if (!keepMemory) {
      this.shownLitNeurons = 0;
      this.nodesRevealed = 0;
    }

    this.startLock();

    // A restart opens on a dark network. Without this the traces keep whatever
    // charge and lit level the last run left them holding, and the new board
    // lights up before anything has been placed on it.
    for (const slot of this.connections) {
      slot.lit = 0;
      slot.charge = 0;
      slot.chargeDelay = 0;
      slot.trace.setVisible(false);
    }

    // Undo the losing sequence: R can land in the middle of its three tweens, and
    // a new run must not open holding the last one's ending.
    //
    // `runOver` first, because it is what lets the ending's delayed callbacks know
    // they have been overtaken.
    this.runOver = null;
    this.tweens.killTweensOf([
      this.gameOverText, this.gameOverLine, this.gameOverHint, this.contactOffer,
      this.memoryPanel,
    ]);
    this.contactOffer.setVisible(false);
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

    // Cut, not faded: `hideReveal` is only reached by the countdown, and a
    // restart zeroes `revealRemaining` directly.
    //
    // Skipped when the story holds the board — that is the case where the
    // re-seed is deliberately happening behind a fragment that must survive it.
    if (!keepStory) {
      this.tweens.killTweensOf([
        this.revealScrim, this.revealTitle, this.revealBody, this.revealHint,
      ]);
      for (const part of [this.revealScrim, this.revealTitle, this.revealBody, this.revealHint]) {
        part.setVisible(false).setAlpha(1);
      }
      this.revealSkippableIn = 0;
    }
    // Put back whatever the winning sequence faded out. The objective is in that
    // list rather than lit by `startLock`, because a handover re-seeds from in
    // here and a lock lighting its own line would write the next board's count
    // over the fragment this one earned. Skipped under `keepStory`, where the
    // hold is already on and `releaseObjective` will lift it.
    if (!keepStory) {
      this.objectiveHeld = false;
      this.tweens.killTweensOf([
        this.objectiveText, this.piecesText, ...this.runReadouts, ...this.previewTiles,
      ]);
      for (const part of [
        this.objectiveText, this.piecesText, ...this.runReadouts, ...this.previewTiles,
      ]) {
        part.setAlpha(1);
      }
    }
    if (!keepStory) {
      this.awaitingAnswer = false;
      this.answerText = '';
      this.tweens.killTweensOf([this.answerLine, this.answerEcho]);
      this.answerLine.setVisible(false);
      this.answerEcho.setVisible(false);
    }
    if (!keepMemory) {
      this.memoryAnswers = [];
    }

    // EVERY cell, not only the ones a shadow stood on. `killAll` stops tweens
    // mid-flight, and a cell left part-way through a neuron's flare keeps that
    // scale forever — `drawBoard` only swaps textures, so nothing puts it back.
    this.tweens.killTweensOf(this.cellTiles);
    for (let index = 0; index < this.cellTiles.length; index += 1) {
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
    this.shownChain = -1;
    this.shownPivotType = -1;
    this.shownSatelliteType = -1;
    this.shownToppedOut = false;
    this.chainAwaitingFlourish = 0;
    this.hitStopRemaining = 0;
    this.nextScorePopup = 0;

    if (!keepStory) {
      this.revealRemaining = 0;
      this.pendingReveal = null;
      this.revealPending = false;
    }
    // Back to -1, not the engine's count: seeding from `piecesLocked` would make
    // the first fragment wait for a placement already paid for.
    this.lastRevealPiece = -1;
    // Drawn here as well as on every change, or the panel is blank until the
    // first node lights.
    this.redrawMemoryPanel(0);

    // Last, so the cleanup above cannot hide what it just put up. A board re-seed
    // does NOT re-open the run: the opening frames the run, and a player who has
    // read it is already four boards in.
    if (!keepMemory) {
      this.openTheRun();
    }
  }

  /**
   * The cold open: the shadow speaks over a board that is not moving yet.
   *
   * Built out of `showReveal` rather than its own screen, which is why it is four
   * lines — a fragment already freezes the simulation, dims the board and offers
   * Space, which is exactly what an opening needs.
   */
  private openTheRun(): void {
    this.showReveal('', SHADOW_OPENING_LINE, this.holdFor(SHADOW_OPENING_LINE, 1100));
    // The shadow's colour, not the memory's. It is the only voice that speaks
    // before a memory exists to be spoken about.
    this.revealBody.setColor('#b07dff');

    // The objective arrives AFTER the line because it is the answer to it. It
    // sits above the board and therefore outside the scrim, so it is dimmed by
    // hand rather than covered — cut to dark rather than faded, since nothing has
    // been on screen yet to fade from.
    this.holdObjective(0);
  }

  /**
   * `fade` is 0 for the opening, which holds them before either has been drawn,
   * and a duration for a handover, which dims them under the player's eye: two
   * lit readouts cut to nothing on one frame read as a flicker.
   */
  private holdObjective(fade: number): void {
    const held = [this.objectiveText, this.piecesText];
    this.objectiveHeld = true;
    this.tweens.killTweensOf(held);

    if (fade === 0) {
      for (const part of held) {
        part.setAlpha(0);
      }
      return;
    }

    this.tweens.add({ targets: held, alpha: 0, duration: fade });
  }

  /**
   * Driven from `update` rather than scheduled: both the opening and a handover
   * can be cut short by Space, and a `delayedCall` would leave the objective dark
   * until a timer that no longer matched fired.
   *
   * Tests `storyHolding` rather than the countdown, so a fragment handing over to
   * a QUESTION does not uncover the next lock's numbers in the gap.
   */
  private releaseObjective(): void {
    if (!this.objectiveHeld || this.storyHolding) {
      return;
    }

    this.objectiveHeld = false;
    this.tweens.add({
      targets: [this.objectiveText, this.piecesText],
      alpha: 1,
      duration: 520,
    });
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
      // Only if it actually committed: mashing Space through a cascade is refused
      // and must not sound like a landing.
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
   * Which way the player is pressing. The only genuinely Phaser-specific input
   * logic, and why it stayed in the scene: resolving both keys held needs
   * `timeDown`, a Phaser Key property.
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
   * Every visible cell, unconditionally, every frame. Knowingly wasteful and
   * negligible: a dirty flag would save nothing and add cache-invalidation state
   * for the cascade to keep correct.
   */
  private drawBoard(): void {
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const pieceType = this.settledPieceAt(column, row);
        const index = visibleCellIndex(column, row);
        const possessed = isShadow(pieceType);

        // A possessed cell still draws its own tile: the shadow took a specific
        // thing, and the player has to see which.
        this.cellTiles[index].setTexture(
          tileTexture(possessed ? shadowHolding(pieceType as number) : pieceType),
        );

        if (possessed) {
          this.animateShadow(index, column, row, shadowStrength(pieceType as number));
        } else if (this.animatedShadowCells.delete(index)) {
          this.restoreCell(index);
        }

        // An unlit neuron breathes. It is the objective, and a muted socket on a
        // violet ground otherwise reads as background while the tiles shout.
        // Motion is what the eye catches.
        const waiting = pieceType === neuronCell(false);
        if (waiting) {
          this.pulsingCells.add(index);
          const beat = Math.sin(this.shadowClock / 430 + column * 1.3 + row * 0.7);
          this.cellTiles[index]
            .setScale(1 + beat * 0.045)
            .setAlpha(0.88 + beat * 0.12);
        } else if (this.pulsingCells.delete(index) && !possessed) {
          this.cellTiles[index].setScale(1).setAlpha(1);
        }
      }
    }
  }

  /**
   * Lay out the lock this board is posing, and say what it asks for. A board
   * opens as a puzzle with a stated goal rather than empty: something to solve
   * rather than something to survive.
   */
  private startLock(): void {
    const lock = lockFor(this.nodesRevealed);
    this.lockSolved = false;
    this.lockEndingIn = 0;
    this.simulation.pieceBudget = lock.pieces;
    seedLock(this.simulation.board, lock, Math.random);
    this.shownPiecesRemaining = -1;
    this.litNeurons = [];
    this.refreshObjective();
  }

  /**
   * Say what the board is asking for, and how much is left. The count matters as
   * much as the words: "light every neuron" is a title, and "light every neuron —
   * 1 of 3" is a position the player can tell they moved.
   */
  private refreshObjective(): void {
    const lock = lockFor(this.nodesRevealed);
    const total = neuronsOn(this.simulation.board).length;
    const lit = total - unlitCount(this.simulation.board);

    this.objectiveText.setText(`${lock.objective}  \u2014  ${lit} of ${total}`);
  }

  /**
   * Only while nothing is resolving: calling a lock solved on a board still in
   * motion lands the payoff under the tail of the clear that earned it.
   */
  private checkLock(): void {
    if (this.lockSolved || this.simulation.resolving || this.storyHolding) {
      return;
    }

    const lock = lockFor(this.nodesRevealed);
    if (!isSolved(lock, this.simulation.board)) {
      return;
    }

    this.lockSolved = true;
    this.objectiveText.setText(`${lock.objective}  \u2014  open`);
    this.tweens.add({ targets: this.objectiveText, alpha: 0.45, duration: 400 });

    // Solving is what surfaces a fragment. A threshold crossing has no
    // relationship to what the words say, where opening a lock is the memory
    // being recovered.
    this.revealPending = true;
  }

  /**
   * The route between the neurons the run has lit — a figure drawn BY the play,
   * which is why the second neuron feels different from the first: one is a dot,
   * two is a shape. The dashed run past the end reaches toward the next.
   *
   * Redrawn every frame rather than appended to, for the reason `drawBoard`
   * repaints unconditionally: no invalidation to keep correct across a cascade.
   */
  private drawNeuronThread(): void {
    this.neuronThread.clear();

    const centre = (site: NeuronSite) => ({
      x: centerOfColumn(site.column),
      y: centerOfRow(site.row),
    });

    if (this.litNeurons.length > 1) {
      this.neuronThread.lineStyle(3, TRACK_LIT_COLOR, 0.85);
      this.neuronThread.beginPath();
      const first = centre(this.litNeurons[0]);
      this.neuronThread.moveTo(first.x, first.y);
      for (const site of this.litNeurons.slice(1)) {
        const at = centre(site);
        this.neuronThread.lineTo(at.x, at.y);
      }
      this.neuronThread.strokePath();
    }

    if (this.litNeurons.length === 0) {
      return;
    }

    const dark = neuronsOn(this.simulation.board)
      .find(({ column, row }) => !isNeuronLit(this.simulation.board.pieceAt(column, row) as number));
    if (dark === undefined) {
      return;
    }

    const from = centre(this.litNeurons[this.litNeurons.length - 1]);
    const to = centre(dark);
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(Math.floor(span / 14), 1);

    this.neuronThread.lineStyle(2, TRACK_LIT_COLOR, 0.22);
    for (let step = 0; step < steps; step += 2) {
      const a = step / steps;
      const b = Math.min((step + 1) / steps, 1);
      this.neuronThread.lineBetween(
        from.x + (to.x - from.x) * a,
        from.y + (to.y - from.y) * a,
        from.x + (to.x - from.x) * b,
        from.y + (to.y - from.y) * b,
      );
    }
  }

  /**
   * A board is lost exactly one way: the pieces are gone and a neuron is still
   * dark. The lock is re-seeded rather than the run ended — what you lose is the
   * board, never the memory you have already earned.
   */
  private refreshPieces(delta: number): void {
    // A won run does not hand over to another board. Losing re-seeds because
    // the memory is still out there to be earned; winning has nothing left to
    // seed a board for.
    if (this.runOver === 'won') {
      return;
    }

    const remaining = this.simulation.piecesRemaining;
    if (remaining !== this.shownPiecesRemaining) {
      this.shownPiecesRemaining = remaining;
      this.piecesText.setText(Number.isFinite(remaining) ? `${remaining}` : '');
      // Two left is the point at which the plan has to change, so it says so.
      this.piecesText.setColor(remaining <= 2 ? '#e4572e' : '#e9dcff');
    }

    if (this.lockEndingIn > 0) {
      this.lockEndingIn -= delta;
      if (this.lockEndingIn <= 0) {
        this.lockEndingIn = 0;
        // Read now rather than remembered from when the countdown was set: a
        // fragment can be skipped inside it.
        this.restart(true, this.storyHolding);
      }
      return;
    }

    // A SOLVED board hands over. Without this it sits there until the pieces run
    // out, at which point the failure branch below is skipped BECAUSE it is
    // solved — so nothing schedules the re-seed while the simulation has already
    // stopped accepting input, and only R gets out.
    if (this.lockSolved) {
      // Not yet: the cascade is still running, or the fragment it earned has not
      // surfaced. Handing over before that re-seeds the board out from under the
      // thing it just earned.
      if (this.simulation.resolving || this.revealPending) {
        return;
      }

      // Nor while a question is coming or on screen: the answer drives every
      // shadow off THIS board, the one that earned the question, and re-seeding
      // behind it would pay that out on a board nobody has played.
      if (this.pendingReveal !== null || this.awaitingAnswer) {
        return;
      }

      // Behind the fragment when there is one to hide behind. The solved board
      // stands until the words cover it, swaps underneath them, and the fragment
      // lifts onto a fresh one, so it is never taken apart in front of the person
      // who solved it. The objective and count dim as the scrim comes up, and
      // `releaseObjective` brings them back with the new numbers.
      if (this.revealRemaining > 0) {
        this.holdObjective(HANDOVER_DIM);
        this.lockEndingIn = HANDOVER_BEHIND_REVEAL;
        return;
      }

      this.lockEndingIn = HANDOVER_IN_THE_OPEN;
      return;
    }

    // Not while a cascade is still running: the last piece's chain can light the
    // neuron that solves the board, and calling it failed first takes a win away
    // on the frame it was won.
    if (!this.simulation.outOfPieces || this.simulation.resolving || this.storyHolding) {
      return;
    }

    // Running out of pieces IS the loss now, so the ending plays here.
    // Longer than a plain re-seed, because there is something to watch.
    this.lockEndingIn = 2600;
    this.runOver = 'out-of-pieces';
    this.objectiveText.setText('out of pieces').setAlpha(1);
    this.soundBoard.play(connectionLostVoice(0));
    this.loseTheBoard();
  }

  /**
   * Show where the shadow is about to reach. A creature appearing with no warning
   * is an interruption rather than tension, so the eyes arrive before the body.
   *
   * Reusing `shadowEyes[index]` is safe: a threatened cell is by definition one
   * the shadow has not taken, and `animateShadow` only touches cells it holds.
   */
  private drawThreat(): void {
    const clearPrevious = () => {
      if (this.threatenedIndex !== null) {
        this.cellTiles[this.threatenedIndex].clearTint();
        this.shadowEyes[this.threatenedIndex].setVisible(false);
        this.threatenedIndex = null;
      }
    };

    if (this.simulation.toppedOut || this.paused || this.storyHolding) {
      clearPrevious();
      return;
    }

    const progress = this.simulation.stallProgress;
    if (progress < THREAT_VISIBLE_FROM) {
      clearPrevious();
      return;
    }

    const target = this.simulation.threatenedCell;
    if (target === null || !isVisibleRow(target.row)) {
      clearPrevious();
      return;
    }

    const index = visibleCellIndex(target.column, target.row);
    if (index !== this.threatenedIndex) {
      clearPrevious();
      this.threatenedIndex = index;
    }

    // Rises from nothing at the threshold to full just as it lands, so the
    // last second before an arrival is unmistakable.
    const closeness = (progress - THREAT_VISIBLE_FROM) / (1 - THREAT_VISIBLE_FROM);

    // A quickening flicker rather than a smooth fade: something steady reads as a
    // UI element, and something unsteady reads as alive.
    const flicker = 0.75 + 0.25 * Math.sin(this.shadowClock / (70 - closeness * 40));

    // The eyes alone, and the tile is deliberately left untinted: dimming it
    // would destroy the one thing the warning exists to convey, which is WHICH
    // tile is about to go.
    this.shadowEyes[index]
      .setVisible(true)
      .setPosition(centerOfColumn(target.column), centerOfRow(target.row))
      .setAngle(0)
      .setScale(0.55 + closeness * 0.45)
      .setAlpha(closeness * flicker * 0.85);
  }

  /**
   * One shadow, alive. Every part is a function of the clock and the cell's own
   * coordinates, so no shadow holds state and no two move in step — creatures
   * breathing in unison read as one animation played twice.
   *
   * Per frame rather than tweened: `drawBoard` rewrites these cells every frame,
   * a shadow changes cell when the stack settles, and the landing bounce already
   * tweens the same objects.
   */
  private animateShadow(index: number, column: number, row: number, strength: number): void {
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

    // Only the creature moves. The tile stays square in the grid, or the cell
    // reads as the TILE being alive rather than something crouching on it.
    this.shadowBodies[index]
      .setVisible(true)
      .setTexture(shadowBodyTexture(strength))
      .setPosition(x, y)
      .setAngle(lean)
      .setScale(breath * (0.5 + 0.5 * risen))
      .setAlpha(opening);

    // Eyes wide as it lands, settling to their idle glow: the flare is what makes
    // an arrival read as something noticing you, and what catches the eye of a
    // player looking elsewhere.
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
   * How open a shadow's eyes are, 0 to 1. Read off the clock rather than
   * scheduled, so a blink costs no timer and no state, and a shadow that moves
   * cell picks up that cell's rhythm.
   */
  private blinkAt(clock: number, phase: number): number {
    const into = (clock + phase * 700) % (BLINK_INTERVAL + phase * 210);
    if (into > BLINK_DURATION) {
      return 1;
    }

    // Shut and open across the window, so the lid travels rather than the eye
    // disappearing for a frame.
    return Math.abs(into / (BLINK_DURATION / 2) - 1);
  }

  /**
   * Let the shadow say something, if it has earned the right to. `shadow-voice.ts`
   * owns when it may speak and what it picks, so this only counts arrivals and
   * draws.
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
   * The idle writes position, angle, scale and alpha every frame, so a cell that
   * stops holding a shadow keeps the lean it was mid-way through. Resetting every
   * cell instead would flatten the landing bounce, a tween on these same objects.
   */
  private restoreCell(index: number): void {
    const column = index % COLUMNS;
    const row = FIRST_VISIBLE_ROW + Math.floor(index / COLUMNS);

    this.cellTiles[index]
      .setPosition(centerOfColumn(column), centerOfRow(row))
      .setAngle(0)
      .setScale(1)
      .setAlpha(1);
    this.shadowBodies[index].setVisible(false);
    this.shadowEyes[index].setVisible(false);
  }

  /**
   * Counted off the engine's counter rather than noticed by watching the board:
   * by the time the scene looks the shadow is simply there, and being there is
   * not an event. Every arrival is in a visible row.
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

    return {
      trace, column, row, toColumn, toRow,
      lit: 0, charge: 0, chargeDelay: 0, chargeColor: TRACE_COLORS[0],
    };
  }

  /**
   * A cell still being animated into counts as empty here, as it does in
   * `drawBoard`, or a trace connects to a tile that has not landed.
   */
  private drawConnections(delta: number): void {
    // Once a run is OVER the traces are no longer a picture of the board: they
    // are being put out one at a time by `loseTheBoard`, or lit one at a time by
    // `winTheRun`. Recomputing from board state here would undo each one the
    // frame after it changed. Test `runOver`, which covers all three endings —
    // `simulation.toppedOut` is only one of them.
    if (this.runOver !== null) {
      return;
    }

    for (const slot of this.connections) {
      // Colourless occupants are excluded explicitly: two shadow cells side by
      // side hold the same value and would "connect", lighting a trace between the
      // two least connected things on the board and tinting it from a palette
      // entry that does not exist. `isColour` is the same question `findGroups`
      // asks, so the two layers cannot disagree about what connects.
      const pieceType = this.settledPieceAt(slot.column, slot.row);
      const linked = isColour(pieceType)
        && pieceType === this.settledPieceAt(slot.toColumn, slot.toRow);

      if (isColour(pieceType)) {
        slot.chargeColor = TRACE_COLORS[pieceType];
      }

      // Eased asymmetrically — quick to light, slow to let go — so a settling
      // board does not flicker as tiles pass each other.
      const target = linked ? 1 : 0;
      const step = delta / (linked ? TRACE_FADE_IN : TRACE_FADE_OUT);
      const gap = target - slot.lit;
      slot.lit += Math.sign(gap) * Math.min(Math.abs(gap), step);

      if (slot.chargeDelay > 0) {
        slot.chargeDelay -= delta;
      } else if (slot.charge > 0) {
        slot.charge = Math.max(0, slot.charge - delta / TRACE_CHARGE_DECAY);
      }
      const signal = slot.chargeDelay > 0 ? 0 : slot.charge;

      // The signal shows even on a trace whose tiles have gone, which is most of
      // them a frame after a clear. The charge outliving the group is what makes
      // a cascade read as something crossing the board.
      const strength = Math.max(slot.lit, signal);
      if (strength <= 0.002) {
        slot.trace.setVisible(false);
        continue;
      }

      // A slow breath, phase-shifted per cell so it never pulses in unison: a
      // circuit at rest should still look powered.
      const breath = 0.87 + 0.13 * Math.sin(
        this.shadowClock / 380 + slot.column * 1.7 + slot.row * 0.9,
      );

      slot.trace
        .setVisible(true)
        .setAlpha(Math.min(1, strength * breath + signal * 0.55))
        .setScale(1 + signal * 0.5)
        .setTint(signal > 0 ? mix(slot.chargeColor, 0xffffff, signal * 0.85) : slot.chargeColor);
    }
  }

  /**
   * The only thing on screen that makes chain DEPTH legible. The colour is
   * captured here rather than read at draw time, because the cells are empty by
   * the next frame and a charge has to remember what cleared it.
   */
  private chargeNetwork(link: ChainLink): void {
    const cleared = new Map<number, number>();
    for (const group of link.groups) {
      for (const cell of group.cells) {
        cleared.set(cell.row * COLUMNS + cell.column, group.pieceType);
      }
    }

    for (const slot of this.connections) {
      const from = cleared.get(slot.row * COLUMNS + slot.column);
      const to = cleared.get(slot.toRow * COLUMNS + slot.toColumn);
      if (from === undefined && to === undefined) {
        continue;
      }

      // Both feet inside the group: fire now. One foot outside: fire a beat
      // later, which is what makes the charge visibly leave where it started.
      slot.charge = 1;
      slot.chargeDelay = from !== undefined && to !== undefined ? 0 : TRACE_SIGNAL_STEP;
      slot.chargeColor = TRACE_COLORS[from ?? to ?? 0];
    }
  }

  /**
   * Light the next node when the run has earned it. Deliberately a whole number
   * rather than a fraction, so progress arrives as something the player watches
   * happen rather than a value drifting upward.
   */
  private drawProgress(): void {
    // Nothing accrues while a fragment is on screen: a second one landing on
    // top of the first would replace it mid-sentence.
    if (this.storyHolding) {
      return;
    }

    // ONE meter: the brain. The board says it too, but that is a lit tile telling
    // you about itself rather than a second gauge.
    const total = neuronsOn(this.simulation.board).length;
    const lit = total === 0 ? 0 : total - unlitCount(this.simulation.board);

    if (lit === this.shownLitNeurons) {
      return;
    }

    const gainedFrom = this.shownLitNeurons;
    this.shownLitNeurons = lit;
    this.redrawMemoryPanel(total === 0 ? 0 : lit / total);

    // One announcement per neuron, staggered, so a cascade reaching two walks up
    // audibly rather than landing as a chord. The sparks fire at the brain node
    // that lit, so the sound and the light agree about where progress happened.
    this.sparks.setParticleTint(TRACK_LIT_COLOR);
    for (let node = gainedFrom; node < lit; node += 1) {
      const at = brainNodeAt(this.nodesRevealed + node, BRAIN_BOX);
      this.sparks.emitParticleAt(at.x, at.y, SPARKS_PER_CELL);
      this.soundBoard.play({
        ...nodeVoice(node, Math.max(total, 1)),
        delay: (node - gainedFrom) * 70,
      });
    }

    // Deliberately does NOT bank a fragment: `checkLock` owns that, and a full
    // meter is the same instant as a solved lock, so asking in both places would
    // surface two fragments for one board.
  }

  /**
   * Derived rather than tracked as two counters, so there is one number to reset
   * and no way for the pair to disagree.
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

    // Every fragment the game has has been surfaced. `null` rather than an index
    // one past the end, so both callers have to say what they do when there is
    // nothing left — reading off the end throws, and a frame that throws stops
    // the render loop for the rest of the session.
    return null;
  }

  /**
   * Hand over a banked fragment, once the board has stopped moving.
   *
   * Three conditions: the cascade over, or it freezes a chain half-resolved; the
   * story clear, or one fragment lands on the last; and a piece placed since the
   * previous one, or a chain that banked a whole memory dumps every fragment over
   * a board nobody has touched. That last turns the reward round, paying one now
   * and one on each of the next placements.
   */
  private surfaceBankedFragment(): void {
    if (
      !this.revealPending
      || this.simulation.resolving
      || this.storyHolding
      || this.simulation.piecesLocked <= this.lastRevealPiece
    ) {
      return;
    }

    this.revealPending = false;
    this.lastRevealPiece = this.simulation.piecesLocked;
    this.revealNextNode();
  }

  /**
   * Deliberately NOT a scene change: cutting away to read makes a memory
   * something the player is SHOWN rather than something that happened to the run
   * they are in. The board is held for a beat and play resumes.
   *
   * Filling the last node of a memory earns its question instead.
   */
  private revealNextNode(): void {
    const at = this.locate(this.nodesRevealed);
    if (at === null) {
      // Nothing left to surface. The meter stays full, which is honest: the run
      // has seen everything the game has.
      return;
    }

    const { memoryIndex, nodeIndex } = at;
    const memory = MEMORIES[memoryIndex];
    const node = memory.nodes[nodeIndex];
    this.nodesRevealed += 1;

    // The question follows the last fragment rather than replacing it, and
    // arrives with NO title. A memory's name over it reads as a question about
    // that memory — it is not, it is addressed to the person at the keyboard, and
    // a label above it makes it part of the exhibit instead.
    this.pendingReveal = nodeIndex === memory.nodes.length - 1
      ? { title: '', body: memory.question, memoryIndex }
      : null;

    // Spent. Emptying it is the feedback that the circuit paid for something, and
    // it re-arms `drawProgress`, which short-circuits on an unchanged count —
    // left full, a player who banked two fragments' worth never sees the second.
    this.shownLitNeurons = 0;
    // With the count already incremented, so the node just earned draws as
    // earned rather than keeping its half-lit "arriving" styling until the next
    // one crosses.
    this.redrawMemoryPanel(0);

    this.showReveal(
      node.title,
      node.body,
      this.holdFor(node.body, this.tuning.fragmentDuration),
      node.photo,
    );
  }

  /**
   * A floor, plus reading time for the line's length. The floor is passed in
   * because a question lingers after being read and a fragment does not.
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
   * Shared by the countdown and by Space, so pressing Space through a memory
   * walks its last fragment to the question rather than throwing it away.
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
   * One keystroke into the answer. Enter submits, and an empty answer is how you
   * decline — no second key to learn, and refusing is a real choice rather than a
   * missing one. Printable characters only.
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
   * The engine is handed the FACT of an answer and nothing else; what was typed
   * only comes back to the panel. Declining is silent — no sting and no "are you
   * sure", you simply keep every cell the shadow took.
   */
  private submitAnswer(): void {
    const answer = this.answerText.trim();
    this.awaitingAnswer = false;
    this.hideReveal();

    if (answer === '') {
      this.answerLine.setVisible(false);
      // Declining still finishes the memory: it keeps the shadows, it does not
      // withhold the ending.
      this.endRunIfNothingLeft(700);
      return;
    }

    // Held over the board while the wave clears it, at the size it was typed:
    // what the player wrote is what paid for the payout, so it should still be on
    // screen while the payout happens.
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

    // After the answer has been read and the wave has finished taking the board
    // back, so the ending lands on a board that is already quiet.
    this.endRunIfNothingLeft(this.holdFor(answer, 900) + 700);
  }

  /**
   * `locate` returning null is the definition of "nothing left to surface", so
   * this reads the same counter the brain does rather than hard-coding how many
   * memories are written.
   */
  private endRunIfNothingLeft(after: number): void {
    if (this.locate(this.nodesRevealed) !== null) {
      return;
    }

    this.time.delayedCall(after, () => {
      if (this.runOver !== null || this.storyHolding) {
        return;
      }
      this.winTheRun();
    });
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
   * Every shadow driven off, deepest first. The stagger is the whole effect: a
   * board that empties in one frame is a state change, one that empties over a
   * second and a half is something happening.
   */
  private driveOffShadow(): void {
    const { driven, settled } = this.simulation.answerQuestion();
    if (driven.length === 0) {
      return;
    }

    this.tweens.killTweensOf(this.popTiles);
    this.cameras.main.shake(220 + 18 * Math.min(driven.length, 12), this.tuning.shakeIntensity * 3);

    // The stack falls into the holes the wave opened, delayed past the end of it
    // rather than run underneath, so the two read as cause and effect rather than
    // as the board collapsing.
    this.time.delayedCall(driven.length * 55 + 180, () => this.dropTiles(settled));

    for (let index = 0; index < driven.length; index += 1) {
      const cell = driven[index];
      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);
      const delay = index * 55;

      const tile = this.popTiles[index];
      tile
        .setPosition(x, y)
        .setTexture(shadowBodyTexture(cell.strength))
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

  /**
   * Baked out of the game's own tiles rather than loaded, so there is no file to
   * be missing. Scaled DOWN only: enlarging a grid makes the grid the subject.
   */
  private showRevealPicture(picture?: string): void {
    const key = picture === undefined ? null : memoryArtTexture(picture);
    if (key === null || !this.textures.exists(key)) {
      this.revealPhoto.setVisible(false);
      return;
    }

    const image = this.revealPhoto.setTexture(key);
    const fit = Math.min(
      PHOTO_MAX_WIDTH / image.width,
      PHOTO_MAX_HEIGHT / image.height,
      1,
    );

    image
      .setScale(fit)
      .setPosition(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 - 90 - (image.height * fit) / 2)
      .setVisible(true);
  }

  private showReveal(title: string, body: string, duration: number, photo?: string): void {
    // Reset first: `openTheRun` borrows this object for the shadow's voice, and
    // every fragment after the opening would otherwise inherit its violet.
    this.revealBody.setColor(REVEAL_BODY_COLOR);
    this.revealRemaining = duration;
    this.revealSkippableIn = REVEAL_SKIP_GRACE;
    this.revealHint.setText(SKIP_PROMPT).setVisible(false);
    this.showRevealPicture(photo);
    this.revealTitle.setText(title);
    // An empty title is hidden rather than drawn blank, so the body keeps its
    // own spacing instead of sitting under a gap where a heading would be.
    this.revealTitle.setVisible(title !== '');
    this.revealBody.setText(body);

    this.tweens.killTweensOf([this.revealScrim, this.revealTitle, this.revealBody, this.revealPhoto]);
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
    const parts = [this.revealScrim, this.revealTitle, this.revealBody, this.revealHint,
      this.revealPhoto];
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
   * Draw the coming memory as an unlit constellation, lighting one node for each
   * fraction the run has earned. The same layout the memory itself uses, because
   * an outline completing is only a payoff if what arrives is what was watched.
   */
  private redrawMemoryPanel(progress: number): void {
    drawBrain(this.memoryPanel, BRAIN_BOX, this.nodesRevealed, progress);
  }

  /** The piece in a cell, treating one mid-animation as not yet arrived. */
  private settledPieceAt(column: number, row: number): number | null {
    if (this.cellsBeingFilled.has(visibleCellIndex(column, row))) {
      return null;
    }
    return this.simulation.board.pieceAt(column, row);
  }

  /**
   * A landing is counted off `piecesLocked` rather than the spawn counter: a lock
   * that starts a cascade and one that tops the board out both commit a pair
   * without spawning another, and those are the landings most worth hearing.
   */
  private playSounds(): void {
    const { piecesLocked, toppedOut, chainLength, resolving } = this.simulation;

    if (piecesLocked !== this.soundedPiecesLocked) {
      this.soundedPiecesLocked = piecesLocked;
      // One voice per landing: a slam speaks for its own impact, and a thud under
      // it would muddy the hit.
      this.soundBoard.play(
        this.slamDistance === null ? landVoice() : hardDropVoice(this.slamDistance),
      );
      this.slamDistance = null;
      this.bounceLanding();
    }

    if (toppedOut !== this.shownToppedOut) {
      this.shownToppedOut = toppedOut;
      if (toppedOut) {
        this.runOver = 'topped-out';
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
   * The engine has already mutated the board, so both halves animate what it no
   * longer shows: a pop draws a tile that is gone, a fall one that has arrived.
   * Which beat it was comes off a counter rather than object identity.
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

    const poppedAt = this.popCells(lastBeat.link, lastBeat.connections);

    // Recorded per LINK, which is what makes a chain read as reaching: three
    // neurons draw three segments on three beats, so the route is watched being
    // taken rather than found already drawn.
    this.reachNeurons(lastBeat.link.neuronsLit);

    // `chainLength` has already been incremented past this link, so the first
    // link pops at index 0. Placed where the clear happened, so a six-wide board
    // does not sound like a single point.
    this.soundBoard.play({
      ...popVoice(this.simulation.chainLength - 1),
      pan: poppedAt === null ? 0 : panForX(poppedAt),
    });
  }

  /**
   * Record the route, and sound them. The pitch climbs the same shape
   * `answerVoice` uses, so the two moments where the player resolves a board are
   * recognisably the same instrument.
   */
  private reachNeurons(lit: readonly NeuronSite[]): void {
    const total = neuronsOn(this.simulation.board).length;

    for (const site of lit) {
      this.litNeurons.push(site);
      this.soundBoard.play({
        ...nodeVoice(this.litNeurons.length - 1, Math.max(total, 1)),
        pan: panForX(centerOfColumn(site.column)),
      });

      const index = visibleCellIndex(site.column, site.row);
      // A flare on the cell itself, so the moment has a place — without it the
      // neuron simply changes texture and the cause is invisible.
      this.cellTiles[index].setScale(1.35);
      this.tweens.add({
        targets: this.cellTiles[index],
        scale: 1,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }

    if (lit.length > 0) {
      this.refreshObjective();
    }
  }

  /**
   * Shrink and fade a tile where one just cleared. Shorter than the beat that
   * carries it, so the hole is empty and legible before the next beat starts.
   */
  private popCells(link: ChainLink, connections: number): number | null {
    const purified = link.shadowPurified;
    this.tweens.killTweensOf(this.popTiles);
    this.hitStopRemaining = this.tuning.hitStopDuration;
    this.kickCamera();
    this.chargeNetwork(link);

    let borrowed = 0;
    let sumX = 0;
    let sumY = 0;

    for (const group of link.groups) {
      for (const cell of group.cells) {
        const x = centerOfColumn(cell.column);
        const y = centerOfRow(cell.row);

        const tile = this.popTiles[borrowed];
        if (tile === undefined) {
          continue;
        }
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

    // Fixed before the shadow borrows from the same pool: the popup belongs over
    // what the player cleared, and averaging the shadow cells in would drag it
    // toward whatever was standing beside it.
    const poppedCells = borrowed;

    for (const cell of purified) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);

      // The creature breaking open over the tile now underneath it. Outward and
      // fading, where a cleared tile collapses inward — a piece falls into the
      // hole it leaves, and this cell has none. Bigger the stronger it was.
      const husk = this.popTiles[borrowed];
      if (husk === undefined) {
        continue;
      }
      borrowed += 1;

      husk
        .setPosition(x, y)
        .setTexture(shadowBodyTexture(cell.strength))
        .setScale(1)
        .setAngle(0)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: husk,
        scale: 1.45 + cell.strength * 0.22,
        alpha: 0,
        duration: this.tuning.popDuration * 1.6,
        ease: 'Quad.easeOut',
        onComplete: () => husk.setVisible(false),
      });

      // And the tile arriving under it, blooming up from nothing — without this
      // the colour simply appears, and the beat reads as a substitution rather
      // than as something becoming something else.
      const born = cell.turnedTo === undefined ? undefined : this.popTiles[borrowed];
      if (born !== undefined && cell.turnedTo !== undefined) {
        borrowed += 1;

        // Held back from `drawBoard` for as long as the bloom runs, the same
        // trick a falling tile uses: the engine turns the cell the instant the
        // link resolves, so the finished tile would otherwise already be sitting
        // there with the bloom growing on top of it.
        const index = visibleCellIndex(cell.column, cell.row);
        this.cellsBeingFilled.add(index);

        born
          .setPosition(x, y)
          .setTexture(tileTexture(cell.turnedTo))
          .setScale(0.2)
          .setAngle(0)
          .setAlpha(0)
          .setVisible(true);

        this.tweens.add({
          targets: born,
          scale: 1,
          alpha: 1,
          duration: this.tuning.popDuration * 1.4,
          ease: 'Back.easeOut',
          onComplete: () => {
            born.setVisible(false);
            this.cellsBeingFilled.delete(index);
          },
        });

        // Sparks in the colour it turned INTO, not the shadow's violet: the cell
        // gained something, and the particles should say which side won it.
        this.sparks.setParticleTint(PIECE_COLORS[cell.turnedTo]);
      } else {
        this.sparks.setParticleTint(SHADOW_EYE_GLOW);
      }

      this.restoreCell(visibleCellIndex(cell.column, cell.row));
      this.sparks.emitParticleAt(x, y, SPARKS_PER_CELL);
    }

    borrowed = this.flinchDamagedShadow(link.shadowDamaged, borrowed);

    if (purified.length > 0) {
      this.soundBoard.play(shadowRecedeVoice(purified.length));
    }

    if (poppedCells === 0) {
      return null;
    }

    this.showConnectionPopup(sumX / poppedCells, sumY / poppedCells, connections);
    return sumX / poppedCells;
  }

  /**
   * A shadow hit and survived. Without this the tiered mechanic is invisible: a
   * clear that leaves a strong shadow standing is indistinguishable from one that
   * did nothing, so the player learns "singles don't work on that one" rather
   * than "singles wear it down".
   *
   * Drawn on a borrowed pop tile rather than the cell, because `animateShadow`
   * recomputes position and scale every frame and would fight a tween on them.
   */
  private flinchDamagedShadow(damaged: readonly ShadowHit[], from: number): number {
    let borrowed = from;

    for (const cell of damaged) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);

      // One tier up from what it is now: the creature it was a moment ago,
      // flashing off as it is knocked down. Borrowed from the same running count
      // as everything else this beat, so it cannot land on a tile mid-tween.
      const tile = this.popTiles[borrowed];
      if (tile === undefined) {
        continue;
      }
      borrowed += 1;

      tile
        .setPosition(x, y)
        .setTexture(shadowBodyTexture(cell.strength + 1))
        .setScale(1)
        .setAngle(0)
        .setAlpha(0.85)
        .setVisible(true);

      this.tweens.add({
        targets: tile,
        scale: 1.3,
        alpha: 0,
        duration: this.tuning.popDuration * 1.2,
        ease: 'Quad.easeOut',
        onComplete: () => tile.setVisible(false),
      });

      this.sparks.setParticleTint(SHADOW_EDGE_COLOR);
      this.sparks.emitParticleAt(x, y, Math.ceil(SPARKS_PER_CELL / 2));
    }

    if (damaged.length > 0) {
      this.soundBoard.play(shadowStruckVoice(damaged.length));
    }

    return borrowed;
  }

  /**
   * Much of why landing reads as contact. The pair is gone by now and `settle`
   * may have moved either half, so the engine reports where each came to rest.
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
   * A camera that only slides reads as a glitch; a couple of tenths of a degree
   * of roll reads as force. Tweened back to zero rather than snapped, or the
   * board ends the shake visibly crooked.
   */
  private kickCamera(): void {
    const camera = this.cameras.main;
    const depth = Math.min(this.simulation.chainLength, 6);
    const weight = 1 + depth;

    camera.shake(90 + 20 * depth, this.tuning.shakeIntensity * weight);

    // Alternating, so consecutive links rock the board rather than pushing it
    // further the same way each time.
    const roll = this.tuning.shakeRollDegrees * weight * (depth % 2 === 0 ? 1 : -1);
    camera.setAngle(roll);
    // `rotateTo` takes radians, unlike `setAngle`.
    camera.rotateTo(0, false, 180, 'Sine.easeOut');
  }

  /**
   * Connections rather than points, because connections are what buy a memory.
   * The multiplier is spelled out above one, or a built chain pays three times
   * the progress with no way to learn that it did.
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
   * thing accelerates and linear motion reads as a slide.
   */
  private dropTiles(moves: readonly TileMove[]): void {
    // A previous drop still in flight owns pooled tiles and suppressed cells this
    // one is about to reuse. Ending it first keeps a slow `fallDuration` from
    // stranding a cell as permanently empty.
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
        // Square root of the distance rather than the distance: falls accelerate,
        // so a six-row drop takes about two and a half times as long as a one-row
        // drop rather than six times, and reads as heavier for it.
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
   * Draw the two halves of the falling pair on top of the board. Separate objects
   * from the board grid, because the pair moves smoothly between cells and
   * fixed-position grid cells cannot.
   */
  private drawPair(): void {
    // In all of these states `pair` still points at the pair whose tiles are
    // already part of the board, so drawing it paints a ghost duplicate — and
    // after a top-out it hangs at its pre-settle position forever. A won run is
    // the same case: the simulation is held rather than stopped.
    if (this.simulation.resolving || this.simulation.toppedOut || this.runOver === 'won') {
      for (const tile of this.pairTiles) {
        tile.setVisible(false);
      }
      return;
    }

    // Draw the pair between rows rather than on them. `fallProgress` is only
    // meaningful while the pair can fall: a landed pair keeps its last value
    // through the lock delay, and offsetting by it sinks the piece into the tile
    // it is resting on.
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
   * Paint the "NEXT" panel, only when the upcoming pair actually changes.
   * Compared as two numbers, so the check itself allocates nothing.
   */
  private drawPreview(): void {
    const [pivotType, satelliteType] = this.simulation.upcoming;
    if (pivotType === this.shownPivotType && satelliteType === this.shownSatelliteType) {
      return;
    }

    this.shownPivotType = pivotType;
    this.shownSatelliteType = satelliteType;
    // Index 0 is the pivot and index 1 the satellite, matching orientation 0 —
    // how the pair will actually appear.
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

    // Not while the story has the board: a reveal freezes the simulation with
    // `resolving` still true, so the callout from the chain that paid for the
    // fragment would sit directly behind it, in the slot the question uses.
    const showing = resolving && chainLength >= 2 && !this.storyHolding;

    this.chainText.setVisible(showing);
    if (showing && chainLength !== this.shownChain) {
      this.shownChain = chainLength;
      this.chainText.setText(`${chainLength} CHAIN`);
    }
  }

  /**
   * The board is left exactly as it stood: losing is information, and clearing
   * the screen throws away the shape that explains why.
   *
   * This only ever HIDES the readout. `loseTheBoard` and `winTheRun` show it,
   * once their sequences have played.
   */
  private refreshGameOver(): void {
    // Tests `runOver`, which covers all three endings. Not while a fragment is
    // up: the clear that fills the meter can be the same clear that ends the run,
    // and the reveal draws first, so the readout would print across the memory it
    // just paid for. The run is over either way; the memory goes first.
    if (this.runOver === null || this.storyHolding) {
      this.gameOverText.setVisible(false);
      this.gameOverLine.setVisible(false);
      this.gameOverHint.setVisible(false);
      this.contactOffer.setVisible(false);
    }
  }

  /**
   * The shadow winning. This board is about connections, so losing is watching
   * them go: every lit trace dies in turn, falling a semitone a cell —
   * `answerVoice` backwards, because answering is the moment this is opposite to.
   *
   * Nothing here touches the simulation. The run is already over.
   */
  private loseTheBoard(): void {
    const lit = this.connections.filter((slot) => slot.trace.visible);

    // The signal degrading: colour drains and the image coarsens as the
    // interference comes up, so the board is visibly being lost rather than
    // covered over.
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
      if (this.runOver === null) {
        return;
      }
      // Composed here rather than at creation: what the run was reaching for is
      // only known once it has ended.
      this.gameOverLine.setText(closingLine(this.unfinishedBusiness()));

      for (const text of [this.gameOverText, this.gameOverLine, this.gameOverHint]) {
        text.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 420 });
      }
    });
  }

  /**
   * The exact mirror of `loseTheBoard`, so the game's two endings are the same
   * shape in opposite directions: the traces light rather than die, the pitch
   * climbs rather than falls, the panel fills rather than dims. No static and no
   * colour drain — degrading the signal is what the shadow does.
   */
  private winTheRun(): void {
    this.runOver = 'won';

    // Everything answering "what do I have left to work with" goes, the objective
    // included: the board it describes was mid-play when the question was
    // answered, and it would stand over the words saying the memory is finished.
    this.tweens.add({
      targets: [this.objectiveText, this.piecesText, ...this.runReadouts, ...this.previewTiles],
      alpha: 0,
      duration: 420,
    });

    // The board's own skeleton, lit one link at a time: every trace between two
    // occupied cells, not only those joining a matching pair. The mirror of the
    // loss is the network COMPLETING, where lighting the whole grid would read as
    // a mesh rather than as something that was built.
    const built = this.connections.filter((slot) => (
      isColour(this.settledPieceAt(slot.column, slot.row))
      && isColour(this.settledPieceAt(slot.toColumn, slot.toRow))
    ));

    built.forEach((slot, index) => {
      this.soundBoard.play(answerVoice(index % 24));
      slot.trace
        .setVisible(true)
        .setAlpha(0)
        .setScale(1)
        .setTint(TRACK_LIT_COLOR);
      this.tweens.add({
        targets: slot.trace,
        alpha: 1,
        duration: 260,
        delay: index * 60,
      });
    });

    this.tweens.add({
      targets: this.memoryPanel,
      alpha: 1,
      duration: 900,
    });

    const settled = built.length * 60 + 520;

    this.time.delayedCall(settled, () => {
      // A restart during the sequence cancels it, as it does for a loss.
      if (this.runOver !== 'won') {
        return;
      }

      // The memory just finished is the one before whatever comes next:
      // `nodesRevealed` has already walked past it.
      const finished = MEMORIES[Math.max(0, this.answeringMemory)];
      this.gameOverText.setText(STILL_CONNECTED);
      this.gameOverLine.setText(recoveredLine(finished.title));

      for (const text of [this.gameOverText, this.gameOverLine, this.gameOverHint, this.contactOffer]) {
        text.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 420 });
      }
    });
  }

  /**
   * Read at the end rather than tracked. `locate` returns null once every
   * fragment has surfaced: nothing was left to fail to reach, so the closing line
   * says the general thing instead.
   */
  private unfinishedBusiness(): UnfinishedBusiness {
    const at = this.locate(this.nodesRevealed);
    if (at === null) {
      return { reaching: null, connectionsShort: 0 };
    }

    // Counted in neurons still dark: a neuron IS a connection, so "two
    // connections short of The Hat" means the two nodes that never lit.
    return {
      reaching: MEMORIES[at.memoryIndex].nodes[at.nodeIndex].title,
      connectionsShort: Math.max(1, unlitCount(this.simulation.board)),
    };
  }

  private refreshFps(time: number): void {
    if (!this.showFps || time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
