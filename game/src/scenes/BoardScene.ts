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
} from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { type TileMove } from '../engine/board';
import { type ChainLink } from '../engine/matching';
import { SWIPE_TUNING, DEFAULT_TUNING, type Tuning } from '../tuning';
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
  SHADOW_BODY_TEXTURE,
  tileTexture,
} from './tile-textures';
import { reportCrash } from '../crash-reporter';
import { RESTING, characterAfter, characterFrame, characterOn, thoughtFrame } from '../character';
import {
  CHARACTER_FRAME_HEIGHT,
  CHARACTER_FRAME_WIDTH,
  CHARACTER_PIXEL,
  HAND_REACH_AT,
  THOUGHT_FRAMES,
  bakeCharacterStandIn,
  characterTexture,
  thoughtTexture,
} from './character-textures';
import { PURSE_CENTER } from '../character-purse';
import { STILL_AMBIENT, ambientAfter } from '../audio/ambient';
import { themeFor } from '../audio/memory-themes';
import { LockSequence, type SequenceWorld } from '../lock-sequence';
import { staticFrame } from '../static-noise';
import { chooseOpening } from '../opening';
import { revealNextNode } from '../reveal';
import { RevealCard } from './reveal-card';
import { FOUND_FLIGHT_END_MS, MemoryPanel, type FlightHooks } from './memory-panel';
import { EndingScreen } from './ending-screen';
import { FoundMemories } from './found-memories';
import { MemoryReader } from './memory-reader';
import { VictorySky } from './victory-sky';
import { MemoryHandover } from './memory-handover';
import {
  stageLength,
  type HandoverStage,
} from '../handover';
import { PressTwiceButton } from './press-twice-button';
import { VictoryScreen } from './victory-screen';
import { isSolved, lockFor, lockProgress, seedLock } from '../engine/locks';
import { litCount, neuronsOn, unlitCount, type NeuronSite } from '../engine/neurons';
import {
  CHAPTERS,
  FRAGMENT_COUNT,
  collectableAt,
  collectionEntries,
  nodeAt,
} from '../memories';
import {
  forgetAllProgress,
  forgetRun,
  foundFragments,
  rememberIntroSeen,
  rememberSoundMuted,
  resumeAt,
  soundMuted,
} from '../progress';
import { type IntroControls, introCards } from '../intro';
import { neighbourOf } from '../sky';
import {
  OVERTHINKING_LINE,
  SHADOW_OPENING_LINE,
  closingLine,
  shadowLine,
  type UnfinishedBusiness,
} from '../shadow-voice';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator, pressedDirection } from '../input/input-translator';
import { Overthinking } from '../overthinking';
import { SwipeControls } from '../input/swipe-controls';
import { TouchControls } from '../input/touch-controls';
import { SoundBoard } from '../audio/sound-board';
import { READER_TEXT_WIDTH } from '../reader-fit';
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

const CELL_SIZE = 64;
const GAP = 4;

const FPS_REFRESH_INTERVAL = 250;

const SHADOW_BOB_PIXELS = 2.4;
const SHADOW_LEAN_DEGREES = 3.2;
const SHADOW_BREATH = 0.045;
const SHADOW_ARRIVAL_DURATION = 340;

const THREAD_PULSE = 420;


export const TOUCH_PRIMARY = typeof matchMedia === 'function'
  && matchMedia('(pointer: coarse)').matches;

const REDUCED_MOTION = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Must match the media query that shows #turn-upright in `index.html`.
const TURN_UPRIGHT_QUERY = '(pointer: coarse) and (orientation: landscape) and (max-height: 599px)';

const SKIP_PROMPT = TOUCH_PRIMARY ? 'tap  \u00b7  continue' : 'space  \u00b7  continue';
const CONTACT_URL = '/#contact';
const soundLabel = (muted: boolean) => (muted ? 'sound off' : 'sound on');
const FOUND_HINT = TOUCH_PRIMARY ? 'pause  \u00b7  read' : 'esc  \u00b7  read';
const RESTART_PROMPT = TOUCH_PRIMARY ? 'tap to restart' : 'restart';
const RESET_PROMPT = 'reset progress';
const RESET_ARMED_PROMPT = TOUCH_PRIMARY ? 'tap again to erase it all' : 'click again to erase it all';
const INTRO_CONTROLS: IntroControls = TOUCH_PRIMARY ? 'swipe' : 'keyboard';

const BLINK_DURATION = 90;
const BLINK_INTERVAL = 2300;


const SPARK_TEXTURE = 'spark';

const STATIC_TEXTURE = 'static';
const STATIC_SIZE = 96;
const SPARK_RADIUS = 6;
const SPARKS_PER_CELL = 7;
const SCORE_POPUP_POOL = 4;

const BOARD_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 900;

const ORIGIN_X = 40;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE + (VISIBLE_ROWS - 1) * GAP;
const ORIGIN_Y = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;


const MEMORY_PANEL_TOP = 300;

const FOUND_ROW_Y = CANVAS_HEIGHT / 2 + 160;
const FOUND_ROW_MARGIN = 24;
const RESET_Y = CANVAS_HEIGHT / 2 + 290;


const SIDE_COMMAND_GAP = 8;

const MEMORY_BOX = {
  left: ORIGIN_X + BOARD_WIDTH + 14,
  top: MEMORY_PANEL_TOP - 46,
  width: CANVAS_WIDTH - (ORIGIN_X + BOARD_WIDTH) - 26,
  height: 300,
};

const SOUND_ROW_HEIGHT = TOUCH_PRIMARY ? 46 : 0;
const SHERIFF_COUNT_Y = MEMORY_BOX.top + MEMORY_BOX.height + 12 - SOUND_ROW_HEIGHT;

const SIDE_COMMAND_WIDTH = (MEMORY_BOX.width - SIDE_COMMAND_GAP) / 2;
const SIDE_COMMAND_Y = ORIGIN_Y + BOARD_HEIGHT - 34;
const CHARACTER_X = MEMORY_BOX.left + MEMORY_BOX.width / 2;
const SOUND_COMMAND_Y = SIDE_COMMAND_Y - 61;
const CHARACTER_BOTTOM = SIDE_COMMAND_Y - 42 - SOUND_ROW_HEIGHT;
const ABOVE_PAUSE_SCRIM = 10;
const THOUGHT_OFFSET_X = 52;
const THOUGHT_OFFSET_Y = 176;
const onCharacter = (frameX: number, frameY: number) => ({
  x: CHARACTER_X - CHARACTER_FRAME_WIDTH / 2 + frameX * CHARACTER_PIXEL,
  y: CHARACTER_BOTTOM - CHARACTER_FRAME_HEIGHT + frameY * CHARACTER_PIXEL,
});
const MEMORY_LANDS_AT = {
  hand: onCharacter(HAND_REACH_AT.x, HAND_REACH_AT.y),
  purse: onCharacter(PURSE_CENTER.x, PURSE_CENTER.y),
};
const PURSE_AT_SCREEN = MEMORY_LANDS_AT.purse;
const PURSE_FLASH_COLOR = 0xf2b705;
const PURSE_FLASH_MS = 380;
const THEME_AFTER_CHIME_MS = 220;

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

const BOARD_FRAME_MARGIN = 15;
const VICTORY_CARD_COLOR = 0x150a28;
const VICTORY_PICTURE_FRAME = 300;

const BOARD_FRAME_CHAMFER = 20;

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

function panForX(x: number): number {
  const across = (x - ORIGIN_X) / BOARD_WIDTH;
  return Math.max(-1, Math.min(1, (across - 0.5) * 1.4));
}

function centerOfColumn(column: number): number {
  return ORIGIN_X + column * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

function centerOfRow(row: number): number {
  return ORIGIN_Y + (row - FIRST_VISIBLE_ROW) * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

function centerOfSite(site: NeuronSite): { x: number; y: number } {
  return { x: centerOfColumn(site.column), y: centerOfRow(site.row) };
}

// Not a mask: Phaser 4's `setMask` compiles, runs, and leaves the tile drawn in full.
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

function easeOutBack(progress: number): number {
  const overshoot = 1.7;
  const back = progress - 1;

  return 1 + (overshoot + 1) * back ** 3 + overshoot * back ** 2;
}

function isVisibleRow(row: number): boolean {
  return row >= FIRST_VISIBLE_ROW && row < ROWS;
}

function visibleCellIndex(column: number, row: number): number {
  return (row - FIRST_VISIBLE_ROW) * COLUMNS + column;
}

const THREAT_VISIBLE_FROM = 0.45;

const TRACE_FADE_IN = 90;
const TRACE_FADE_OUT = 220;

const TRACE_CHARGE_DECAY = 260;

const TRACE_SIGNAL_STEP = 70;

interface ConnectionSlot {
  trace: Phaser.GameObjects.Image;
  column: number;
  row: number;
  toColumn: number;
  toRow: number;
  lit: number;
  charge: number;
  chargeDelay: number;
  chargeColor: number;
}

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



  private litNeurons: NeuronSite[] = [];

  private threadSurge: { whole: boolean; progress: number; duration: number } | null = null;



  private neuronThread: Phaser.GameObjects.Graphics;

  private threatenedIndex: number | null = null;
  private chainText: Phaser.GameObjects.Text;
  private staticOverlay: Phaser.GameObjects.TileSprite;

  private staticStrength = 0;

  private endingScreen: EndingScreen;
  private previewTiles: Phaser.GameObjects.Image[];

  private shownPivotType = -1;

  private shownSatelliteType = -1;
  private shownChain = -1;
  private nextFpsRefresh = 0;
  private timestep: FixedTimestep;
  // Not `input`: that shadows Phaser's own `Scene.input` plugin.
  private inputTranslator: InputTranslator;

  private readonly touch = new TouchControls();

  readonly swipe = new SwipeControls(SWIPE_TUNING);

  private lastPiecesSpawned = 0;
  private restartKey: Phaser.Input.Keyboard.Key;
  private hardDropKey: Phaser.Input.Keyboard.Key;
  private pauseKey: Phaser.Input.Keyboard.Key;

  private paused = false;

  private pauseScrim: Phaser.GameObjects.Rectangle;
  private pauseText: Phaser.GameObjects.Text;

  private foundMemories: FoundMemories;

  private readingIndex: number | null = null;

  private memoryReader: MemoryReader;

  private tappedMemory: number | null = null;

  private resetButton: PressTwiceButton;

  private resetKeys: Phaser.Input.Keyboard.Key[];

  private resetPressed = false;

  private victory: VictoryScreen;

  private playAgainPressed = false;

  private focusRow = -1;

  private focusFrame: Phaser.GameObjects.Graphics;

  private enterKey: Phaser.Input.Keyboard.Key;

  private popTiles: Phaser.GameObjects.Image[];
  private fallTiles: Phaser.GameObjects.Image[];

  private shadowBodies: Phaser.GameObjects.Image[];

  private shadowEyes: Phaser.GameObjects.Image[];

  private animatedShadowCells = new Set<number>();

  private pulsingCells = new Set<number>();

  private shadowArrival: { cellIndex: number; age: number } | null = null;

  private shadowSpeech: Phaser.GameObjects.Text;

  private spokenShadowLines: string[] = [];

  private arrivalsSinceShadowSpoke = 0;

  private shadowClock = 0;

  private shownShadowTaken = 0;

  private connections: ConnectionSlot[];

  private runOver: 'topped-out' | 'won' | null = null;

  private character: Phaser.GameObjects.Image;
  private thought: Phaser.GameObjects.Image;

  private characterState = RESTING;

  private shownCharacterTexture = characterTexture('idle', 0);

  private runReadouts: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];

  private objectiveHeld = false;

  private boardFrame: Phaser.GameObjects.Graphics;

  private memoryPanel: MemoryPanel;


  private memoryHandover: MemoryHandover;

  private crashed = false;
  private turnedAway = false;

  private sideCommands: Phaser.GameObjects.Text[] = [];
  private soundCommand: Phaser.GameObjects.Text;

  private nodesRevealed = 0;

  private foundBeat: { photo?: string; title: string; hint: string | null } | null = null;

  private sheriffCount: Phaser.GameObjects.Text;



  private revealCard: RevealCard;
  private victoryCard: RevealCard;

  private introCardShowing: number | null = null;

  private cellsBeingFilled = new Set<number>();

  private shownBeats = 0;

  private readonly lockSequence = new LockSequence();
  private readonly soundBoard = new SoundBoard({ muted: soundMuted() });
  private ambient = STILL_AMBIENT;
  private shownToppedOut = false;

  private soundedPiecesLocked = 0;
  private soundedResting = false;

  private judgedPiecesLocked = 0;

  private readonly overthinking = new Overthinking();

  private chainAwaitingFlourish = 0;

  private slamDistance: number | null = null;

  private hitStopRemaining = 0;

  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private scorePopups: Phaser.GameObjects.Text[];
  private nextScorePopup = 0;

  private tuning: Tuning;

  constructor() {
    super('Board');
  }

  create(): void {
    this.tuning = { ...DEFAULT_TUNING };
    this.simulation = new Simulation(randomPieceTypes, this.tuning);
    this.timestep = new FixedTimestep();
    this.inputTranslator = new InputTranslator(this.tuning);
    this.lastPiecesSpawned = this.simulation.piecesSpawned;
    this.nextFpsRefresh = 0;

    if (import.meta.env.DEV) {
      window.tuning = this.tuning;
      window.simulation = this.simulation;
      window.boardScene = this;
    }

    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);

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

    this.memoryPanel = new MemoryPanel(this, MEMORY_BOX, MEMORY_LANDS_AT);

    bakeTileTextures(this, CELL_SIZE, GAP);

    bakeCharacterStandIn(this);

    this.cellTiles = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.cellTiles.push(
          this.add.image(centerOfColumn(column), centerOfRow(row), tileTexture(null)),
        );
      }
    }

    this.shadowBodies = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.shadowBodies.push(
          this.add
            .image(centerOfColumn(column), centerOfRow(row), SHADOW_BODY_TEXTURE)
            .setVisible(false),
        );
      }
    }

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

    this.neuronThread = this.add.graphics();
    this.neuronThread.enableFilters();
    this.neuronThread.filters?.internal.addGlow(TRACK_LIT_COLOR, 2.5, 0, 1, false, 4, 8);

    this.pairTiles = [
      this.add.image(0, 0, tileTexture(null)),
      this.add.image(0, 0, tileTexture(null)),
    ];

    this.popTiles = [];
    this.fallTiles = [];
    for (let index = 0; index < COLUMNS * VISIBLE_ROWS; index += 1) {
      this.fallTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
    }
    for (let index = 0; index < COLUMNS * VISIBLE_ROWS * 2; index += 1) {
      this.popTiles.push(this.add.image(0, 0, tileTexture(null)).setVisible(false));
    }
    const sparkTexture = this.add.graphics();
    sparkTexture.fillStyle(0xffffff, 1).fillCircle(SPARK_RADIUS, SPARK_RADIUS, SPARK_RADIUS);
    sparkTexture.generateTexture(SPARK_TEXTURE, SPARK_RADIUS * 2, SPARK_RADIUS * 2);

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

    const commandX = (index: number) =>
      MEMORY_BOX.left + SIDE_COMMAND_WIDTH / 2 + index * (SIDE_COMMAND_WIDTH + SIDE_COMMAND_GAP);
    const commandStyle = {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9d86b8',
      backgroundColor: '#2b1644',
      align: 'center',
      fixedWidth: SIDE_COMMAND_WIDTH,
      padding: { y: 24 },
    };

    if (TOUCH_PRIMARY) {
      this.sideCommands = (['pause', 'restart'] as const).map((action, index) => {
        const command = this.add
          .text(commandX(index), SIDE_COMMAND_Y, action, commandStyle)
          .setOrigin(0.5, 0.5)
          .setInteractive({ useHandCursor: true });

        return this.onPress(command, () => this.touch.press(action));
      });
    }

    this.soundCommand = this.add
      .text(
        CHARACTER_X,
        TOUCH_PRIMARY ? SOUND_COMMAND_Y : SIDE_COMMAND_Y,
        soundLabel(this.soundBoard.muted),
        TOUCH_PRIMARY
          ? { ...commandStyle, fontSize: '14px', fixedWidth: MEMORY_BOX.width, padding: { y: 10 } }
          : { fontFamily: 'monospace', fontSize: '14px', color: '#9d86b8', padding: { x: 10, y: 8 } },
      )
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.onPress(this.soundCommand, () => this.toggleSound());
    this.sideCommands.push(this.soundCommand);

    this.character = this.add.image(CHARACTER_X, CHARACTER_BOTTOM, characterTexture('idle', 0))
      .setOrigin(0.5, 1);
    this.thought = this.add.image(CHARACTER_X + THOUGHT_OFFSET_X, CHARACTER_BOTTOM - THOUGHT_OFFSET_Y, thoughtTexture(0))
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.sheriffCount = this.add.text(CHARACTER_X, SHERIFF_COUNT_Y, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9481aa',
    }).setOrigin(0.5, 0.5);

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
    this.enterKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.ENTER);
    this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.M).on('down', () => this.toggleSound());
    this.resetKeys = [Input.Keyboard.KeyCodes.BACKSPACE, Input.Keyboard.KeyCodes.DELETE]
      .map((code) => this.input.keyboard!.addKey(code));

    this.input.keyboard!.on(Input.Keyboard.Events.ANY_KEY_DOWN, () => this.soundBoard.unlock());

    if (typeof matchMedia === 'function') {
      matchMedia(TURN_UPRIGHT_QUERY).addEventListener('change', (event) => {
        this.turnedAway = event.matches;
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.soundBoard.resumeIfStopped();
      }
    });

    this.input.on(
      Input.Events.POINTER_UP,
      (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        this.soundBoard.unlock();

        if (this.swipe.gesturing) {
          return;
        }

        if (this.victory.pressables.some((target) => over.includes(target))
          || this.sideCommands.some((command) => over.includes(command))
          || this.foundMemories.pictures.some((picture) => picture !== null && over.includes(picture))
          || over.includes(this.resetButton.text)) {
          return;
        }

        if (this.betweenPlay) {
          this.touch.press('drop');
        }
      },
    );

    if (TOUCH_PRIMARY) {
      this.input.on(
        Input.Events.POINTER_DOWN,
        (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
          if (this.betweenPlay || over.length > 0) {
            return;
          }
          this.swipe.begin(pointer.x, pointer.y, this.time.now);
        },
      );

      this.input.on(Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) {
          this.swipe.move(pointer.x, pointer.y, this.time.now);
        }
      });

      this.input.on(Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
        this.swipe.end(pointer.x, pointer.y, this.time.now);
      });
    }

    this.showFps = import.meta.env.DEV;
    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    }).setVisible(this.showFps);

    this.objectiveText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, 34, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#c98cff',
    }).setOrigin(0.5, 0);

    this.chainText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, ORIGIN_Y + 30, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.memoryHandover = new MemoryHandover(this, {
      centerX: ORIGIN_X + BOARD_WIDTH / 2,
      centerY: ORIGIN_Y + BOARD_HEIGHT / 2,
      width: BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      height: BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
    }, MEMORY_LANDS_AT);

    this.victory = new VictoryScreen(
      this,
      collectionEntries(),
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      { reset: RESET_PROMPT, resetArmed: RESET_ARMED_PROMPT },
    );
    this.victory.memories.pictures.forEach((picture, index) => {
      if (picture !== null) {
        this.onPress(picture, () => {
          this.tappedMemory = index;
        });
      }
    });
    this.onPress(this.victory.contactButton, () => this.openContact());
    this.onPress(this.victory.playAgainButton, () => {
      this.playAgainPressed = true;
    });
    this.onPress(this.victory.resetButton.text, () => {
      this.resetPressed = true;
    });

    this.revealCard = new RevealCard(this, {
      centerX: ORIGIN_X + BOARD_WIDTH / 2,
      centerY: CANVAS_HEIGHT / 2,
      coverWidth: BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      coverHeight: BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
      textWidth: BOARD_WIDTH,
    }, SKIP_PROMPT);

    this.victoryCard = new RevealCard(this, {
      centerX: CANVAS_WIDTH / 2,
      centerY: CANVAS_HEIGHT / 2,
      coverWidth: CANVAS_WIDTH,
      coverHeight: CANVAS_HEIGHT,
      textWidth: CANVAS_WIDTH - 60,
      coverColor: VICTORY_CARD_COLOR,
      pictureFrameHeight: VICTORY_PICTURE_FRAME,
    }, SKIP_PROMPT);

    this.staticOverlay = this.add.tileSprite(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
      STATIC_TEXTURE,
    ).setVisible(false).setBlendMode(BlendModes.ADD);

    this.endingScreen = new EndingScreen(this, {
      centerX: ORIGIN_X + BOARD_WIDTH / 2,
      centerY: CANVAS_HEIGHT / 2,
      textWidth: BOARD_WIDTH,
    }, RESTART_PROMPT);


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

    this.foundMemories = new FoundMemories(
      this,
      collectionEntries(),
      CANVAS_WIDTH / 2,
      FOUND_ROW_Y,
      CANVAS_WIDTH - FOUND_ROW_MARGIN * 2,
    );
    this.memoryReader = new MemoryReader(this, {
      centerX: CANVAS_WIDTH / 2,
      textWidth: READER_TEXT_WIDTH,
    });

    this.foundMemories.pictures.forEach((picture, index) => {
      if (picture !== null) {
        this.onPress(picture, () => {
          this.tappedMemory = index;
        });
      }
    });

    this.resetButton = new PressTwiceButton(
      this,
      CANVAS_WIDTH / 2,
      RESET_Y,
      RESET_PROMPT,
      RESET_ARMED_PROMPT,
    );
    this.onPress(this.resetButton.text, () => {
      this.resetPressed = true;
    });

    this.focusFrame = this.add.graphics().setVisible(false);

    this.resetShownState();
  }

  update(time: number, delta: number): void {
    if (this.crashed) {
      if (Input.Keyboard.JustDown(this.restartKey) || this.touch.takeRestart()
        || this.touch.takeDrop()) {
        this.guarded(() => this.recoverFromCrash())();
      }
      return;
    }

    this.guarded(() => this.step(time, delta))();
  }

  private guarded(run: () => void): () => void {
    return () => {
      try {
        run();
      } catch (error) {
        this.crash(error);
      }
    };
  }

  private crash(error: unknown): void {
    this.crashed = true;
    reportCrash(error);

    try {
      this.setPaused(false);
      this.endingScreen.showCrash();
      this.revealCard.coverBoard();
    } catch (secondError) {
      reportCrash(secondError);
    }
  }

  private recoverFromCrash(): void {
    this.endingScreen.hideCrash();
    this.revealCard.uncoverBoard();
    this.restart(this.moreToReach);
    this.crashed = false;
  }

  private step(time: number, delta: number): void {
    if (this.turnedAway) {
      this.turnedAway = false;
      if (this.readingIndex === null && !this.victory.active && this.runOver !== 'won') {
        this.setPaused(true);
      }
    }

    if (Input.Keyboard.JustDown(this.pauseKey) || this.touch.takePause()) {
      if (this.readingIndex !== null) {
        this.closeReading();
      } else if (!this.victory.active && this.runOver !== 'won') {
        this.setPaused(!this.paused);
      }
    }

    // `JustDown` consumes the press, so the `paused` test must come first.
    if (this.paused) {
      this.readFromPause();
    } else if (this.victory.active && this.readingIndex === null) {
      this.readFromVictory();
    } else if (this.victory.active) {
      this.readWhileReadingVictory(this.readingIndex!);
    }

    const restartPressed = Input.Keyboard.JustDown(this.restartKey) || this.touch.takeRestart();
    if (!this.victory.active
      && (restartPressed || (this.runOver === 'topped-out' && this.touch.takeDrop()))) {
      this.restart(this.moreToReach);
    }

    if (!this.paused && !this.simulation.toppedOut && !this.storyHolding
      && this.runOver !== 'won') {
      this.readInput(delta);
    }

    if (this.paused) {
      this.advanceCharacter(delta);
      this.advanceAmbient(delta);
      this.memoryReader.advance(delta);
      this.drawBoard();
      this.drawConnections(0);
      this.drawPair();
      this.drawPreview();
      this.refreshChain();
      this.refreshGameOver();
      this.refreshFps(time);
      return;
    }

    this.advanceCharacter(delta);
    this.advanceAmbient(delta);
    this.card.advance(delta);

    if (this.card.holding) {
      if (this.card.waitForSkip(
        delta,
        () => Input.Keyboard.JustDown(this.hardDropKey) || this.touch.takeDrop(),
      )) {
        this.advanceReveal();
      }
    } else if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= delta;
    } else if (!this.boardFrozen) {
      for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
        this.simulation.update(FIXED_STEP);
      }
    }

    if (this.hitStopRemaining <= 0 && !this.storyHolding) {
      this.shadowClock += delta;

      if (this.shadowArrival !== null) {
        this.shadowArrival.age += delta;
        if (this.shadowArrival.age >= SHADOW_ARRIVAL_DURATION) {
          this.shadowArrival = null;
        }
      }
    }

    this.openTheBoard();
    this.judgePlacedPiece();
    this.playShadowArrival();
    this.playCascadeBeat();
    this.playSounds();
    this.drawBoard();
    this.checkLock();
    this.handOverSolvedBoard(delta);
    this.drawNeuronThread(delta);
    this.drawThreat();
    this.drawConnections(delta);
    this.surfaceBankedFragment();
    this.drawProgress();
    this.drawPair();
    this.drawPreview();
    this.refreshChain();
    this.refreshStatic();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  private refreshStatic(): void {
    if (this.staticStrength <= 0) {
      return;
    }

    const frame = staticFrame(this.staticStrength, REDUCED_MOTION, Math.random, STATIC_SIZE);
    this.staticOverlay.tilePositionX = frame.offsetX;
    this.staticOverlay.tilePositionY = frame.offsetY;
    this.staticOverlay.setAlpha(frame.alpha);
  }

  private setPaused(paused: boolean, select?: number): void {
    if (paused === this.paused) {
      return;
    }

    this.paused = paused;
    this.swipe.cancel();
    this.pauseScrim.setVisible(paused);
    this.pauseText.setVisible(paused);
    this.characterState = characterOn(this.characterState, paused ? 'pause' : 'resume');
    this.character.setDepth(paused ? ABOVE_PAUSE_SCRIM : 0);

    if (paused) {
      this.resetButton.show();
      this.tweens.pauseAll();
      this.foundMemories.show(this.storyHolding ? [] : foundFragments(), select);
      this.startFocus();
    } else {
      this.stopReadingInPause();
      this.resetButton.hide();
      this.tweens.resumeAll();
      this.foundMemories.hide();
      this.focusRow = -1;
      this.drawFocus();
    }
  }

  private pressReset(): void {
    if (this.resetButton.press(this.time.now)) {
      this.startOver();
    }
  }

  private startOver(): void {
    this.foundBeat = null;
    forgetAllProgress();
    this.restart();
  }

  private playAgain(): void {
    this.foundBeat = null;
    forgetRun();
    this.restart();
  }

  private flightHooks(): FlightHooks {
    return {
      onReach: () => { this.characterState = characterOn(this.characterState, 'reach'); },
      onCaught: () => { this.characterState = characterOn(this.characterState, 'catch'); },
      onLanded: () => this.memoryLanded(),
    };
  }

  private memoryLanded(): void {
    const found = foundFragments().length;

    this.characterState = characterOn(this.characterState, 'good');
    this.flashPurse();
    this.soundBoard.play(nodeVoice(Math.max(found - 1, 0), FRAGMENT_COUNT));
    const photo = collectableAt(found - 1)?.photo;
    if (photo !== undefined) {
      this.soundBoard.playTheme(themeFor(photo).map((voice) => ({ ...voice, delay: voice.delay + THEME_AFTER_CHIME_MS })));
    }
    this.refreshSheriffCount();
  }

  private flashPurse(): void {
    const flash = this.add.circle(PURSE_AT_SCREEN.x, PURSE_AT_SCREEN.y, 10, PURSE_FLASH_COLOR, 0.9);
    this.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: PURSE_FLASH_MS,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private refreshSheriffCount(): void {
    this.sheriffCount.setText(`${foundFragments().length} / ${FRAGMENT_COUNT}`);
  }

  private showVictory(): void {
    this.victory.show(foundFragments());
    this.startFocus();
  }

  private readFromVictory(): void {
    const tapped = this.tappedMemory;
    this.tappedMemory = null;
    const picked = Input.Keyboard.JustDown(this.hardDropKey)
      || Input.Keyboard.JustDown(this.enterKey);
    const playAgainPressed = this.playAgainPressed;
    this.playAgainPressed = false;
    const resetPressed = this.resetKeys.some((key) => Input.Keyboard.JustDown(key))
      || this.resetPressed;
    this.resetPressed = false;
    this.touch.takeDrop();

    if (resetPressed) {
      this.pressVictoryReset();
      return;
    }

    this.victory.resetButton.expire(this.time.now);
    this.victory.memories.tick(this.time.now, this.game.loop.delta);
    this.steerFocus(this.victory.memories);

    if (tapped !== null) {
      this.openFound(tapped);
    } else if (playAgainPressed) {
      this.playAgain();
    } else if (picked) {
      this.pressFocused();
    }
  }

  private readWhileReadingVictory(reading: number): void {
    const direction = Input.Keyboard.JustDown(this.cursors.left) ? -1
      : Input.Keyboard.JustDown(this.cursors.right) ? 1
        : 0;

    if (direction !== 0) {
      const next = neighbourOf(foundFragments(), reading, direction === 1 ? -1 : 1);
      if (next !== reading) {
        this.openFound(next);
      }
    } else if (Input.Keyboard.JustDown(this.enterKey)) {
      this.closeReading();
    }
  }

  private pressVictoryReset(): void {
    if (this.victory.resetButton.press(this.time.now)) {
      this.startOver();
    }
  }

  private readFromPause(): void {
    if (this.readingIndex !== null) {
      this.readWhilePaused();
      return;
    }

    const tapped = this.tappedMemory;
    this.tappedMemory = null;
    const picked = Input.Keyboard.JustDown(this.enterKey);
    const resumed = Input.Keyboard.JustDown(this.hardDropKey);
    const tappedAway = this.touch.takeDrop();
    const resetPressed = this.resetKeys.some((key) => Input.Keyboard.JustDown(key))
      || this.resetPressed;
    this.resetPressed = false;

    if (resetPressed) {
      this.pressReset();
      return;
    }

    this.resetButton.expire(this.time.now);
    this.steerFocus(this.foundMemories);

    if (tapped !== null) {
      this.openFound(tapped);
    } else if (picked) {
      if (!this.pressFocused()) {
        this.setPaused(false);
      }
    } else if (resumed || tappedAway) {
      this.setPaused(false);
    }
  }

  private readWhilePaused(): void {
    const resetPressed = this.resetKeys.some((key) => Input.Keyboard.JustDown(key))
      || this.resetPressed;
    this.resetPressed = false;
    if (resetPressed) {
      this.closeReading();
      this.pressReset();
      return;
    }

    const tapped = this.tappedMemory;
    this.tappedMemory = null;
    const done = Input.Keyboard.JustDown(this.hardDropKey)
      || Input.Keyboard.JustDown(this.enterKey)
      || this.touch.takeDrop();

    if (Input.Keyboard.JustDown(this.cursors.left)) {
      this.foundMemories.move(-1);
    }
    if (Input.Keyboard.JustDown(this.cursors.right)) {
      this.foundMemories.move(1);
    }
    if (tapped !== null) {
      this.foundMemories.select(tapped);
    }

    if (done && tapped === null) {
      this.closeReading();
    } else if (this.foundMemories.selected !== this.readingIndex) {
      this.openFound(this.foundMemories.selected);
    }
  }

  private focusRows(): (Phaser.GameObjects.Text | null)[] {
    if (this.victory.active) {
      return [
        null,
        this.victory.contactButton,
        this.victory.playAgainButton,
        this.victory.resetButton.text,
      ];
    }

    return this.foundMemories.showing ? [null, this.resetButton.text] : [this.resetButton.text];
  }

  private startFocus(): void {
    this.focusRow = this.focusRows()[0] === null ? 0 : -1;
    this.drawFocus();
  }

  private steerFocus(memories: FoundMemories | VictorySky): void {
    if (Input.Keyboard.JustDown(this.cursors.up)) {
      this.moveFocus(-1);
    }
    if (Input.Keyboard.JustDown(this.cursors.down)) {
      this.moveFocus(1);
    }
    if (Input.Keyboard.JustDown(this.cursors.left)) {
      memories.move(-1);
    }
    if (Input.Keyboard.JustDown(this.cursors.right)) {
      memories.move(1);
    }
  }

  private moveFocus(direction: -1 | 1): void {
    const rows = this.focusRows();
    const first = rows[0] === null ? 0 : -1;

    this.focusRow = Math.max(first, Math.min(rows.length - 1, this.focusRow + direction));
    this.drawFocus();
  }

  private drawFocus(): void {
    const button = this.focusRows()[this.focusRow];
    this.focusFrame.clear().setVisible(false);

    if (this.focusRow < 0 || button === null || button === undefined) {
      return;
    }

    this.focusFrame
      .lineStyle(2, 0xc98cff, 1)
      .strokeRect(
        button.x - button.width / 2 - 5,
        button.y - button.height / 2 - 5,
        button.width + 10,
        button.height + 10,
      )
      .setVisible(true);
  }

  private pressFocused(): boolean {
    const rows = this.focusRows();
    const button = rows[this.focusRow];

    if (this.focusRow < 0 || button === undefined) {
      return false;
    }

    if (button === null) {
      const memories = this.victory.active ? this.victory.memories : this.foundMemories;
      if (!memories.showing) {
        return false;
      }
      this.openFound(memories.selected);
      return true;
    }

    if (button === this.victory.contactButton) {
      this.openContact();
    } else if (button === this.victory.playAgainButton) {
      this.playAgain();
    } else if (button === this.victory.resetButton.text) {
      this.pressVictoryReset();
    } else {
      this.pressReset();
    }

    return true;
  }

  private openFound(index: number): void {
    const node = collectableAt(index)!;

    this.readingIndex = index;
    this.focusFrame.setVisible(false);
    if (node.photo !== undefined) {
      this.soundBoard.playTheme(themeFor(node.photo));
    }

    if (!this.victory.active) {
      this.foundMemories.select(index);
      this.pauseText.setVisible(false);
      this.memoryReader.show(node.body, node.photo);
      return;
    }

    this.victory.hideContents();
    this.victoryCard.show(node.title, node.body, node.photo);
  }

  private closeReading(): void {
    const read = this.readingIndex ?? undefined;
    this.readingIndex = null;

    if (!this.victory.active) {
      this.stopReadingInPause();
      this.pauseText.setVisible(true);
      this.startFocus();
      return;
    }

    this.victoryCard.reset();
    this.victory.showContents(read);
    this.startFocus();
  }

  private stopReadingInPause(): void {
    this.memoryReader.hide();
    if (!this.victory.active) {
      this.readingIndex = null;
    }
  }

  private restart(keepMemory = false): void {
    this.setPaused(false);
    this.simulation.restart();

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

    this.resetShownState(keepMemory);
  }

  private resetShownState(keepMemory = false): void {
    this.cellsBeingFilled.clear();
    this.threatenedIndex = null;

    if (!keepMemory) {
      this.nodesRevealed = resumeAt(FRAGMENT_COUNT);
    }

    this.lockSequence.reset();
    this.startLock();
    this.simulation.shadowHeld = this.nodesRevealed === 0;

    for (const slot of this.connections) {
      slot.lit = 0;
      slot.charge = 0;
      slot.chargeDelay = 0;
      slot.trace.setVisible(false);
    }

    this.runOver = null;
    this.victory.hide();
    this.characterState = characterOn(this.characterState, 'restart');
    this.endingScreen.reset();
    this.memoryHandover.reset();
    this.memoryPanel.reset();
    this.tweens.killAll();
    this.staticStrength = 0;
    this.staticOverlay.setVisible(false);
    this.cameras.main.filters.external.clear();
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);
    for (const slot of this.connections) {
      this.tweens.killTweensOf(slot.trace);
      slot.trace.setAlpha(1);
    }

    this.revealCard.reset();
    this.objectiveHeld = false;
    this.tweens.killTweensOf([
      this.objectiveText, ...this.runReadouts, ...this.previewTiles,
    ]);
    for (const part of [
      this.objectiveText, ...this.runReadouts, ...this.previewTiles,
    ]) {
      part.setAlpha(1);
    }
    this.tweens.killTweensOf(this.cellTiles);
    for (let index = 0; index < this.cellTiles.length; index += 1) {
      this.restoreCell(index);
    }
    this.threadSurge = null;
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
    this.soundedResting = false;
    this.judgedPiecesLocked = this.simulation.piecesLocked;
    this.overthinking.newBoard();
    this.slamDistance = null;
    this.shownChain = -1;
    this.shownPivotType = -1;
    this.shownSatelliteType = -1;
    this.shownToppedOut = false;
    this.chainAwaitingFlourish = 0;
    this.hitStopRemaining = 0;
    this.nextScorePopup = 0;

    this.introCardShowing = null;
    this.readingIndex = null;
    this.refreshSheriffCount();
    this.memoryPanel.startOver(this.upcomingPhoto());

    if (this.foundBeat !== null) {
      this.memoryPanel.showFound(this.foundBeat.photo, this.foundBeat.title, this.foundBeat.hint);
      this.foundBeat = null;
    }

    if (!keepMemory) {
      this.openTheRun();
    }
  }

  private openTheRun(): void {
    const opening = chooseOpening();

    if (opening === 'victory') {
      this.runOver = 'won';
      this.showVictory();
      return;
    }

    if (opening === 'intro') {
      this.showIntroCard(0);
    } else if (opening === 'shadow') {
      this.revealCard.show('', SHADOW_OPENING_LINE);
      this.revealCard.setBodyColor('#b07dff');
    }

    this.holdObjective();
  }

  private holdObjective(): void {
    this.objectiveHeld = true;
    this.tweens.killTweensOf(this.objectiveText);
    this.objectiveText.setAlpha(0);
  }

  private openTheBoard(): void {
    if (!this.objectiveHeld || this.storyHolding) {
      return;
    }

    this.objectiveHeld = false;
    this.tweens.add({
      targets: this.objectiveText,
      alpha: 1,
      duration: 520,
    });
  }

  private readSwipe(): void {
    for (let action = this.swipe.take(); action !== null; action = this.swipe.take()) {
      if (action === 'rotate') {
        this.overthinking.decided();
        this.simulation.rotate();
      } else if (action === 'drop') {
        this.dropTheHardWay();
      } else {
        this.overthinking.decided();
        this.shift(action === 'left' ? -1 : 1);
      }
    }
  }

  private dropTheHardWay(): void {
    const locksBefore = this.simulation.piecesLocked;
    const distance = this.simulation.hardDrop();
    if (this.simulation.piecesLocked !== locksBefore) {
      this.slamDistance = distance;
    }
  }

  private readInput(delta: number): void {
    this.readSwipe();

    if (Input.Keyboard.JustDown(this.cursors.up)) {
      this.overthinking.decided();
      this.simulation.rotate();
    }

    if (Input.Keyboard.JustDown(this.hardDropKey) || this.touch.takeDrop()) {
      this.dropTheHardWay();
    }

    const newPiece = this.simulation.piecesSpawned !== this.lastPiecesSpawned;
    this.lastPiecesSpawned = this.simulation.piecesSpawned;

    this.simulation.softDropping = this.inputTranslator.update(
      {
        direction: pressedDirection(this.cursors.left, this.cursors.right),
        softDropHeld: this.cursors.down.isDown,
        newPiece,
        delta,
      },
      (direction, fresh) => {
        if (fresh) {
          this.overthinking.decided();
        }
        return this.shift(direction);
      },
    );
  }

  private openContact(): void {
    window.location.href = CONTACT_URL;
  }

  private toggleSound(): void {
    const muted = this.soundBoard.toggleMute();
    rememberSoundMuted(muted);
    this.soundCommand.setText(soundLabel(muted));
  }

  // Phaser fires pointerup on whatever the finger is over, not on what it
  // pressed, so a drag that ends on a control would trigger it.
  private onPress<T extends Phaser.GameObjects.GameObject>(target: T, run: () => void): T {
    let armed = false;

    target.on('pointerdown', () => {
      armed = true;
    });
    target.on('pointerout', () => {
      armed = false;
    });
    target.on('pointerup', () => {
      if (!armed) {
        return;
      }
      armed = false;
      run();
    });

    return target;
  }

  private get card(): RevealCard {
    return this.victory.active ? this.victoryCard : this.revealCard;
  }

  private get boardFrozen(): boolean {
    return this.runOver === 'won' || (this.lockSequence.handingOver && !this.simulation.resolving);
  }

  private get betweenPlay(): boolean {
    return this.paused || this.card.holding || this.runOver !== null || this.crashed;
  }

  private shift(direction: HorizontalDirection): boolean {
    return direction === -1 ? this.simulation.moveLeft() : this.simulation.moveRight();
  }

  private drawBoard(): void {
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const pieceType = this.settledPieceAt(column, row);
        const index = visibleCellIndex(column, row);
        const possessed = isShadow(pieceType);

        this.cellTiles[index].setTexture(
          tileTexture(possessed ? shadowHolding(pieceType as number) : pieceType),
        );

        if (possessed) {
          this.animateShadow(index, column, row);
        } else if (this.animatedShadowCells.delete(index)) {
          this.restoreCell(index);
        }

        const waiting = pieceType === neuronCell(false);
        if (waiting) {
          this.pulsingCells.add(index);
          const beat = Math.sin(this.shadowClock / 430 + column * 1.3 + row * 0.7);
          this.cellTiles[index]
            .setScale(1 + beat * 0.045)
            .setAlpha(0.88 + beat * 0.12);
        } else if (this.pulsingCells.delete(index) && !possessed) {
          this.cellTiles[index].setScale(1).setAlpha(1).setAngle(0);
        }
      }
    }
  }

  private startLock(): void {
    const lock = lockFor(this.chapterIndex);
    this.tuning.fallInterval = lock.fallInterval;
    seedLock(this.simulation.board, lock, Math.random);
    this.litNeurons = [];
    this.refreshObjective();
  }

  private refreshObjective(): void {
    const total = neuronsOn(this.simulation.board).length;

    this.objectiveText.setText(this.whereYouAre(`${litCount(this.simulation.board)} of ${total}`));
  }

  private whereYouAre(objective: string): string {
    return `${CHAPTERS[this.chapterIndex].title}  \u00b7  ${objective}`;
  }

  private get sequenceWorld(): SequenceWorld {
    return { resolving: this.simulation.resolving, storyHolding: this.storyHolding };
  }

  private checkLock(): void {
    if (!this.lockSequence.checkSolved(this.sequenceWorld, () => isSolved(this.simulation.board))) {
      return;
    }

    this.threadSurge = { whole: true, progress: 0, duration: stageLength('settle') };
    this.objectiveText.setText(this.whereYouAre('open'));
    this.tweens.add({ targets: this.objectiveText, alpha: 0.45, duration: 400 });
  }

  private drawNeuronThread(delta: number): void {
    this.neuronThread.clear();

    if (this.threadSurge !== null) {
      this.threadSurge.progress += delta / this.threadSurge.duration;
      if (this.threadSurge.progress >= 1) {
        this.threadSurge = null;
      }
    }

    if (this.litNeurons.length > 1) {
      this.neuronThread.lineStyle(3, TRACK_LIT_COLOR, 0.85);
      this.neuronThread.beginPath();
      const first = centerOfSite(this.litNeurons[0]);
      this.neuronThread.moveTo(first.x, first.y);
      for (const site of this.litNeurons.slice(1)) {
        const at = centerOfSite(site);
        this.neuronThread.lineTo(at.x, at.y);
      }
      this.neuronThread.strokePath();
      this.drawSurge(this.litNeurons.map(centerOfSite));
    }

    if (this.litNeurons.length === 0) {
      return;
    }

    const dark = neuronsOn(this.simulation.board)
      .find(({ column, row }) => !isNeuronLit(this.simulation.board.pieceAt(column, row) as number));
    if (dark === undefined) {
      return;
    }

    const from = centerOfSite(this.litNeurons[this.litNeurons.length - 1]);
    const to = centerOfSite(dark);
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(Math.floor(span / 14), 1);

    this.neuronThread.lineStyle(2, TRACK_LIT_COLOR, 0.22);
    for (let step = 0; step < steps; step += 2) {
      const dashStart = step / steps;
      const dashEnd = Math.min((step + 1) / steps, 1);
      this.neuronThread.lineBetween(
        from.x + (to.x - from.x) * dashStart,
        from.y + (to.y - from.y) * dashStart,
        from.x + (to.x - from.x) * dashEnd,
        from.y + (to.y - from.y) * dashEnd,
      );
    }
  }

  private handOverSolvedBoard(delta: number): void {
    if (this.runOver === 'won') {
      return;
    }

    for (const stage of this.lockSequence.advance(delta, this.sequenceWorld)) {
      this.beginHandoverStage(stage);
    }
  }

  private beginHandoverStage(stage: HandoverStage): void {
    const found = this.foundBeat;

    if (stage === 'fade') {
      this.memoryHandover.coverBoard(stageLength('fade'));
    } else if (stage === 'bloom' && found !== null) {
      this.memoryHandover.bloom(found.photo, found.title);
    } else if (stage === 'flight') {
      this.memoryHandover.fly(stageLength('flight'), this.flightHooks());
    } else if (stage === 'return') {
      this.restart(true);
      this.memoryHandover.uncoverBoard(stageLength('return'));
    }
  }

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

    const closeness = (progress - THREAT_VISIBLE_FROM) / (1 - THREAT_VISIBLE_FROM);

    const flicker = 0.75 + 0.25 * Math.sin(this.shadowClock / (70 - closeness * 40));

    this.shadowEyes[index]
      .setVisible(true)
      .setPosition(centerOfColumn(target.column), centerOfRow(target.row))
      .setAngle(0)
      .setScale(0.55 + closeness * 0.45)
      .setAlpha(closeness * flicker * 0.85);
  }

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

    this.shadowBodies[index]
      .setVisible(true)
      .setTexture(SHADOW_BODY_TEXTURE)
      .setPosition(x, y)
      .setAngle(lean)
      .setScale(breath * (0.5 + 0.5 * risen))
      .setAlpha(opening);

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

  private blinkAt(clock: number, phase: number): number {
    const into = (clock + phase * 700) % (BLINK_INTERVAL + phase * 210);
    if (into > BLINK_DURATION) {
      return 1;
    }

    return Math.abs(into / (BLINK_DURATION / 2) - 1);
  }

  private speakForShadow(): void {
    const line = shadowLine(
      this.simulation.shadowOnBoard,
      this.arrivalsSinceShadowSpoke,
      this.spokenShadowLines,
      this.overthinking.due,
    );

    this.arrivalsSinceShadowSpoke += 1;
    if (line === null) {
      return;
    }

    this.arrivalsSinceShadowSpoke = 0;
    this.spokenShadowLines.push(line);
    if (line === OVERTHINKING_LINE) {
      this.overthinking.told();
    }

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

  private judgePlacedPiece(): void {
    if (this.simulation.piecesLocked === this.judgedPiecesLocked) {
      return;
    }
    this.judgedPiecesLocked = this.simulation.piecesLocked;
    this.overthinking.placed();
  }

  private playShadowArrival(): void {
    const { shadowTaken, lastShadowCell } = this.simulation;
    if (shadowTaken === this.shownShadowTaken || lastShadowCell === null) {
      return;
    }

    this.shownShadowTaken = shadowTaken;
    this.soundBoard.play(shadowArrivalVoice());
    this.characterState = characterOn(this.characterState, 'shadow');
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

  private drawConnections(delta: number): void {
    if (this.runOver !== null) {
      return;
    }

    for (const slot of this.connections) {
      const pieceType = this.settledPieceAt(slot.column, slot.row);
      const linked = isColour(pieceType)
        && pieceType === this.settledPieceAt(slot.toColumn, slot.toRow);

      if (isColour(pieceType)) {
        slot.chargeColor = TRACE_COLORS[pieceType];
      }

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

      const strength = Math.max(slot.lit, signal);
      if (strength <= 0.002) {
        slot.trace.setVisible(false);
        continue;
      }

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

  private drawSurge(points: readonly { x: number; y: number }[]): void {
    const surge = this.threadSurge;
    if (surge === null) {
      return;
    }

    const path = surge.whole ? points : points.slice(-2);
    const spans = path.slice(1).map((at, index) => Math.hypot(
      at.x - path[index].x,
      at.y - path[index].y,
    ));
    const total = spans.reduce((sum, span) => sum + span, 0);
    if (total === 0) {
      return;
    }

    let travelled = surge.progress * total;
    let leg = 0;
    while (leg < spans.length - 1 && travelled > spans[leg]) {
      travelled -= spans[leg];
      leg += 1;
    }

    const along = Math.min(travelled / spans[leg], 1);
    const head = {
      x: path[leg].x + (path[leg + 1].x - path[leg].x) * along,
      y: path[leg].y + (path[leg + 1].y - path[leg].y) * along,
    };

    this.neuronThread.lineStyle(5, 0xffffff, 0.9);
    this.neuronThread.beginPath();
    this.neuronThread.moveTo(path[0].x, path[0].y);
    for (let step = 1; step <= leg; step += 1) {
      this.neuronThread.lineTo(path[step].x, path[step].y);
    }
    this.neuronThread.lineTo(head.x, head.y);
    this.neuronThread.strokePath();

    this.neuronThread.fillStyle(0xffffff, 1);
    this.neuronThread.fillCircle(head.x, head.y, 7);
  }

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

      slot.charge = 1;
      slot.chargeDelay = from !== undefined && to !== undefined ? 0 : TRACE_SIGNAL_STEP;
      slot.chargeColor = TRACE_COLORS[from ?? to ?? 0];
    }
  }

  private drawProgress(): void {
    if (this.storyHolding || this.foundBeat !== null) {
      return;
    }

    const progress = lockProgress(
      this.simulation.board,
      this.simulation.score,
      lockFor(this.chapterIndex).fillScore,
    );

    this.memoryPanel.showProgress(this.upcomingPhoto(), progress);
  }

  private get moreToReach(): boolean {
    return nodeAt(this.nodesRevealed) !== null;
  }

  private get chapterIndex(): number {
    return nodeAt(this.nodesRevealed)?.chapterIndex ?? CHAPTERS.length - 1;
  }

  private surfaceBankedFragment(): void {
    if (this.lockSequence.takeReveal(this.sequenceWorld)) {
      this.surfaceNextNode();
    }
  }

  private surfaceNextNode(): void {
    const reveal = revealNextNode(this.nodesRevealed);
    if (reveal.kind === 'none') {
      return;
    }

    this.nodesRevealed = reveal.nodesRevealed;
    this.simulation.shadowHeld = false;

    const { node } = reveal;
    const hint = reveal.firstFind ? FOUND_HINT : null;

    if (reveal.kind === 'won') {
      this.winTheRun();
      this.memoryPanel.showFoundFlying(node.photo, node.title, hint, this.flightHooks());
      return;
    }

    this.foundBeat = { photo: node.photo, title: node.title, hint };
  }

  private holdFor(text: string, floor: number): number {
    return floor + text.length * this.tuning.readingPerCharacter;
  }

  private advanceAmbient(delta: number): void {
    const { clock, voices } = ambientAfter(this.ambient, delta, foundFragments().length);
    this.ambient = clock;
    this.soundBoard.playAll(voices);
  }

  private advanceCharacter(delta: number): void {
    this.characterState = characterAfter(this.characterState, delta);

    const texture = characterTexture(this.characterState.animation, characterFrame(this.characterState));
    if (texture !== this.shownCharacterTexture) {
      this.shownCharacterTexture = texture;
      this.character.setTexture(texture);
    }

    const thinking = this.characterState.animation === 'thinking';
    this.thought.setVisible(thinking);
    if (thinking) {
      this.thought.setTexture(thoughtTexture(thoughtFrame(this.characterState, THOUGHT_FRAMES)));
    }
  }

  private get storyHolding(): boolean {
    return this.card.holding;
  }

  private advanceReveal(): void {
    if (this.readingIndex !== null) {
      this.closeReading();
      return;
    }

    if (this.introCardShowing !== null) {
      const next = this.introCardShowing + 1;
      if (next < introCards(INTRO_CONTROLS).length) {
        this.showIntroCard(next);
        return;
      }
      this.introCardShowing = null;
      this.characterState = characterOn(this.characterState, 'resume');
      rememberIntroSeen();
    }

    this.revealCard.hide();
  }

  private showIntroCard(index: number): void {
    const card = introCards(INTRO_CONTROLS)[index];
    this.introCardShowing = index;
    this.characterState = characterOn(this.characterState, index === 0 ? 'welcome' : 'instructions');
    this.revealCard.show(card.title, card.body);
  }

  private upcomingPhoto(): string | undefined {
    return nodeAt(this.nodesRevealed)?.node.photo;
  }

  private settledPieceAt(column: number, row: number): number | null {
    if (this.cellsBeingFilled.has(visibleCellIndex(column, row))) {
      return null;
    }
    return this.simulation.board.pieceAt(column, row);
  }

  private playSounds(): void {
    const { piecesLocked, toppedOut, chainLength, resolving } = this.simulation;

    const { resting } = this.simulation;
    if (resting && !this.soundedResting && this.slamDistance === null) {
      this.soundBoard.play(landVoice());
    }
    this.soundedResting = resting;

    if (piecesLocked !== this.soundedPiecesLocked) {
      this.soundedPiecesLocked = piecesLocked;
      if (this.slamDistance !== null) {
        this.soundBoard.play(hardDropVoice(this.slamDistance));
      }
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
      const flourish = chainVoices(this.chainAwaitingFlourish);
      this.soundBoard.playAll(flourish);
      if (flourish.length > 0) {
        this.characterState = characterOn(this.characterState, 'good');
      }
      this.chainAwaitingFlourish = 0;
    }
  }

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

    this.reachNeurons(lastBeat.link.neuronsLit);

    this.soundBoard.play({
      ...popVoice(this.simulation.chainLength - 1),
      pan: poppedAt === null ? 0 : panForX(poppedAt),
    });
  }

  private reachNeurons(lit: readonly NeuronSite[]): void {
    const total = neuronsOn(this.simulation.board).length;

    if (lit.length > 0) {
      this.characterState = characterOn(this.characterState, 'good');
    }

    for (const site of lit) {
      this.litNeurons.push(site);
      this.soundBoard.play({
        ...nodeVoice(this.litNeurons.length - 1, Math.max(total, 1)),
        pan: panForX(centerOfColumn(site.column)),
      });

      if (this.litNeurons.length > 1) {
        this.threadSurge = { whole: false, progress: 0, duration: THREAD_PULSE };
      }

      const index = visibleCellIndex(site.column, site.row);
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

  private popCells(link: ChainLink, connections: number): number | null {
    const purified = link.shadowPurified;
    this.tweens.killTweensOf(this.popTiles);
    if (!REDUCED_MOTION) {
      this.hitStopRemaining = this.tuning.hitStopDuration;
      this.kickCamera();
    }
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

    const poppedCells = borrowed;

    for (const cell of purified) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);

      const husk = this.popTiles[borrowed];
      if (husk === undefined) {
        continue;
      }
      borrowed += 1;

      husk
        .setPosition(x, y)
        .setTexture(SHADOW_BODY_TEXTURE)
        .setScale(1)
        .setAngle(0)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: husk,
        scale: 1.67,
        alpha: 0,
        duration: this.tuning.popDuration * 1.6,
        ease: 'Quad.easeOut',
        onComplete: () => husk.setVisible(false),
      });

      const born = cell.turnedTo === undefined ? undefined : this.popTiles[borrowed];
      if (born !== undefined && cell.turnedTo !== undefined) {
        borrowed += 1;

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

        this.sparks.setParticleTint(PIECE_COLORS[cell.turnedTo]);
      } else {
        this.sparks.setParticleTint(SHADOW_EYE_GLOW);
      }

      this.restoreCell(visibleCellIndex(cell.column, cell.row));
      this.sparks.emitParticleAt(x, y, SPARKS_PER_CELL);
    }

    if (purified.length > 0) {
      this.soundBoard.play(shadowRecedeVoice(purified.length));
    }

    if (poppedCells === 0) {
      return null;
    }

    this.showConnectionPopup(sumX / poppedCells, sumY / poppedCells, connections);
    return sumX / poppedCells;
  }

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

  private kickCamera(): void {
    const camera = this.cameras.main;
    const depth = Math.min(this.simulation.chainLength, 6);
    const weight = 1 + depth;

    camera.shake(90 + 20 * depth, this.tuning.shakeIntensity * weight);

    const roll = this.tuning.shakeRollDegrees * weight * (depth % 2 === 0 ? 1 : -1);
    camera.setAngle(roll);
    // `rotateTo` takes radians, unlike `setAngle`.
    camera.rotateTo(0, false, 180, 'Sine.easeOut');
  }

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

  private dropTiles(moves: readonly TileMove[]): void {
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
        .setTexture(tileTexture(isShadow(pieceType) ? shadowHolding(pieceType) : pieceType))
        .setScale(1)
        .setAlpha(1)
        .setVisible(true);

      this.tweens.add({
        targets: tile,
        y: centerOfRow(move.toRow),
        duration: this.tuning.fallDuration * Math.sqrt(move.toRow - move.fromRow),
        ease: 'Quad.easeIn',
        onComplete: () => {
          tile.setVisible(false);
          this.cellsBeingFilled.delete(cellIndex);
        },
      });
    }
  }

  private drawPair(): void {
    if (this.simulation.resolving || this.simulation.toppedOut || this.runOver === 'won') {
      for (const tile of this.pairTiles) {
        tile.setVisible(false);
      }
      return;
    }

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

  private drawPreview(): void {
    const [pivotType, satelliteType] = this.simulation.upcoming;
    if (pivotType === this.shownPivotType && satelliteType === this.shownSatelliteType) {
      return;
    }

    this.shownPivotType = pivotType;
    this.shownSatelliteType = satelliteType;
    this.previewTiles[0].setTexture(tileTexture(pivotType));
    this.previewTiles[1].setTexture(tileTexture(satelliteType));
  }

  private refreshChain(): void {
    const { resolving, chainLength } = this.simulation;

    const showing = resolving && chainLength >= 3 && !this.storyHolding;

    this.chainText.setVisible(showing);
    if (showing && chainLength !== this.shownChain) {
      this.shownChain = chainLength;
      this.chainText.setText(`${chainLength} CHAIN`);
    }
  }

  private refreshGameOver(): void {
    if (this.runOver === null || this.storyHolding || this.paused) {
      this.endingScreen.hide();
    } else {
      this.endingScreen.restore();
    }
  }

  private loseTheBoard(): void {
    this.characterState = characterOn(this.characterState, 'lost');

    const lit = this.connections.filter((slot) => slot.trace.visible);

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

    const settled = lit.length * 45 + 320;

    this.memoryPanel.fadeTo(0.15, 700, settled * 0.4);

    this.time.delayedCall(settled, this.guarded(() => {
      if (this.runOver === null) {
        return;
      }
      this.endingScreen.showLost(closingLine(this.unfinishedBusiness()));
    }));
  }

  private winTheRun(): void {
    this.runOver = 'won';
    this.characterState = characterOn(this.characterState, 'won');

    this.tweens.add({
      targets: [this.objectiveText, ...this.runReadouts, ...this.previewTiles],
      alpha: 0,
      duration: 420,
    });

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

    this.memoryPanel.fadeTo(1, 900);

    const settled = Math.max(built.length * 60 + 520, FOUND_FLIGHT_END_MS + 400);

    this.time.delayedCall(settled, this.guarded(() => {
      if (this.runOver !== 'won') {
        return;
      }

      this.showVictory();
    }));
  }

  private unfinishedBusiness(): UnfinishedBusiness {
    const at = nodeAt(this.nodesRevealed);
    if (at === null) {
      return { reaching: null, connectionsShort: 0 };
    }

    return {
      reaching: at.node.title,
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
