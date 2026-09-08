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
import { HAT_FULL_CHARGE } from '../engine/hat';
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
import { hatEarned, playedBefore, rememberHat, rememberPlayed } from '../progress';
import {
  CONNECTION_LOST,
  REACH_OUT_LINE,
  SHADOW_CLOSING_LINE,
  SHADOW_OPENING_LINE,
  STILL_CONNECTED,
  closingLine,
  RECOVERED_LINE,
  shadowLine,
  type UnfinishedBusiness,
} from '../shadow-voice';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator } from '../input/input-translator';
import { SoundBoard } from '../audio/sound-board';
import {
  chainVoices,
  hardDropVoice,
  hatVoice,
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

const CELL_SIZE = 64;
const GAP = 4;

const FPS_REFRESH_INTERVAL = 250;

const SHADOW_BOB_PIXELS = 2.4;
const SHADOW_LEAN_DEGREES = 3.2;
const SHADOW_BREATH = 0.045;
const SHADOW_ARRIVAL_DURATION = 340;

const PHOTO_MAX_WIDTH = 330;
const PHOTO_MAX_HEIGHT = 250;

const REVEAL_SKIP_GRACE = 420;

const HANDOVER_BEHIND_REVEAL = 300;
const HANDOVER_IN_THE_OPEN = 900;
const HANDOVER_DIM = 240;

const ANSWER_LIMIT = 48;

const SKIP_PROMPT = 'space';
const ANSWER_PROMPT = 'type an answer   ·   enter';
const CARET_PERIOD = 1060;

const BLINK_DURATION = 90;
const BLINK_INTERVAL = 2300;

const HAT_METER_Y = 790;
const HAT_METER_WIDTH = 104;
const HAT_METER_HEIGHT = 12;
const HAT_PROMPT = 'press F';
const HAT_BEAM_WIDTH = 10;
const HAT_BEAM_DURATION = 220;
const HAT_BEAM_HIT_DURATION = 420;

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

const CONTACT_OFFER_Y = CANVAS_HEIGHT / 2 + 84;
const HINT_ALONE_Y = CANVAS_HEIGHT / 2 + 84;
const HINT_BELOW_OFFER_Y = CANVAS_HEIGHT / 2 + 132;

const MEMORY_PANEL_TOP = 300;
const MEMORY_PANEL_HEIGHT = 450;

const MEMORY_PANEL_LEFT = 476;

const ANSWER_ECHO_LEFT = MEMORY_PANEL_LEFT;

const BRAIN_BOX = {
  left: ORIGIN_X + BOARD_WIDTH + 14,
  top: MEMORY_PANEL_TOP - 46,
  width: CANVAS_WIDTH - (ORIGIN_X + BOARD_WIDTH) - 26,
  height: 300,
};

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

const BOARD_FRAME_MARGIN = 15;

const REVEAL_BODY_COLOR = '#e8eef2';
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

  private lockSolved = false;

  private lockEndingIn = 0;

  private shownPiecesRemaining = -1;

  private litNeurons: NeuronSite[] = [];

  private neuronThread: Phaser.GameObjects.Graphics;

  private threatenedIndex: number | null = null;
  private chainText: Phaser.GameObjects.Text;
  private staticOverlay: Phaser.GameObjects.TileSprite;

  private staticStrength = 0;

  private gameOverText: Phaser.GameObjects.Text;

  private gameOverLine: Phaser.GameObjects.Text;

  private gameOverHint: Phaser.GameObjects.Text;

  private contactOffer: Phaser.GameObjects.Text;
  private previewTiles: Phaser.GameObjects.Image[];

  private piecesText: Phaser.GameObjects.Text;

  private hatKey: Phaser.Input.Keyboard.Key;

  private hatMeter: Phaser.GameObjects.Rectangle;

  private hatBeam: Phaser.GameObjects.Rectangle;

  private hatPrompt: Phaser.GameObjects.Text;

  private hatParts: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];

  private shownHatCharge = -1;
  private shownPivotType = -1;
  private shownSatelliteType = -1;
  private shownChain = -1;
  private nextFpsRefresh = 0;
  private timestep: FixedTimestep;
  // Not `input`: that shadows Phaser's own `Scene.input` plugin.
  private inputTranslator: InputTranslator;
  private lastPiecesSpawned = 0;
  private restartKey: Phaser.Input.Keyboard.Key;
  private hardDropKey: Phaser.Input.Keyboard.Key;
  private pauseKey: Phaser.Input.Keyboard.Key;

  private paused = false;

  private pauseScrim: Phaser.GameObjects.Rectangle;
  private pauseText: Phaser.GameObjects.Text;
  private pauseHint: Phaser.GameObjects.Text;

  private popTiles: Phaser.GameObjects.Image[];
  private fallTiles: Phaser.GameObjects.Image[];

  private shadowBodies: Phaser.GameObjects.Image[];

  private shadowEyes: Phaser.GameObjects.Image[];

  private animatedShadowCells = new Set<number>();

  private pulsingCells = new Set<number>();

  private revealPhoto: Phaser.GameObjects.Image;

  private shadowArrival: { cellIndex: number; age: number } | null = null;

  private shadowSpeech: Phaser.GameObjects.Text;

  private spokenShadowLines: string[] = [];

  private arrivalsSinceShadowSpoke = 0;

  private shadowClock = 0;

  private shownShadowTaken = 0;

  private connections: ConnectionSlot[];

  private runOver: 'topped-out' | 'out-of-pieces' | 'won' | null = null;

  private runReadouts: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];

  private objectiveHeld = false;

  private boardFrame: Phaser.GameObjects.Graphics;

  private memoryPanel: Phaser.GameObjects.Graphics;

  private shownLitNeurons = 0;

  private nodesRevealed = 0;

  private revealRemaining = 0;

  private revealPending = false;

  private lastRevealPiece = -1;

  private pendingReveal: { title: string; body: string; memoryIndex: number } | null = null;

  private revealScrim: Phaser.GameObjects.Rectangle;
  private revealTitle: Phaser.GameObjects.Text;

  private revealHint: Phaser.GameObjects.Text;

  private revealSkippableIn = 0;

  private awaitingAnswer = false;

  private answerText = '';

  private answeringMemory = 0;

  private memoryAnswers: string[] = [];

  private answerLine: Phaser.GameObjects.Text;

  private answerEcho: Phaser.GameObjects.Text;
  private revealBody: Phaser.GameObjects.Text;

  private cellsBeingFilled = new Set<number>();

  private shownBeats = 0;

  private readonly soundBoard = new SoundBoard();
  private shownToppedOut = false;

  private soundedPiecesLocked = 0;

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

    this.memoryPanel = this.add.graphics();

    bakeTileTextures(this, CELL_SIZE, GAP);

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
            .image(centerOfColumn(column), centerOfRow(row), shadowBodyTexture(1))
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

    this.runReadouts.push(this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y - 46, 'NEXT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8ea3b0',
    }).setOrigin(0.5, 0.5));

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

    const hatLabel = this.add.text(PREVIEW_CENTER_X, HAT_METER_Y - 24, 'HAT', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7a5f96',
    }).setOrigin(0.5, 0.5);

    const hatTrack = this.add.rectangle(
      PREVIEW_CENTER_X,
      HAT_METER_Y,
      HAT_METER_WIDTH,
      HAT_METER_HEIGHT,
      TRACK_COLOR,
    );

    this.hatPrompt = this.add.text(PREVIEW_CENTER_X, HAT_METER_Y + 22, HAT_PROMPT, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c98cff',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.hatMeter = this.add.rectangle(
      PREVIEW_CENTER_X - HAT_METER_WIDTH / 2,
      HAT_METER_Y,
      0,
      HAT_METER_HEIGHT,
      TRACK_LIT_COLOR,
    ).setOrigin(0, 0.5);

    this.hatParts = [hatLabel, hatTrack, this.hatMeter];
    this.runReadouts.push(...this.hatParts);

    this.simulation.hatUnlocked = hatEarned();
    for (const part of this.hatParts) {
      part.setVisible(this.simulation.hatUnlocked);
    }

    this.hatBeam = this.add.rectangle(0, 0, HAT_BEAM_WIDTH, 0, TRACK_LIT_COLOR)
      .setVisible(false)
      .setBlendMode(BlendModes.ADD);

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
    this.hatKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.F);

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => this.typeIntoAnswer(event));

    this.input.keyboard!.on(Input.Keyboard.Events.ANY_KEY_DOWN, () => this.soundBoard.unlock());

    this.showFps = import.meta.env.DEV;
    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    }).setVisible(this.showFps);

    this.objectiveText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, 12, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#c98cff',
    }).setOrigin(0.5, 0);

    this.chainText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, ORIGIN_Y + 30, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.revealScrim = this.add.rectangle(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      BOARD_WIDTH + BOARD_FRAME_MARGIN * 2,
      BOARD_HEIGHT + BOARD_FRAME_MARGIN * 2,
      GROUND_COLOR,
    ).setVisible(false);

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

    this.revealHint = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 96, SKIP_PROMPT, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6b5a80',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.answerLine = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2 + 74, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: BOARD_WIDTH - 80 },
      stroke: '#150a24',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setVisible(false);

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

    this.gameOverHint = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      HINT_ALONE_Y,
      'restart',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8ea3b0',
        backgroundColor: '#221038',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.contactOffer = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CONTACT_OFFER_Y,
      REACH_OUT_LINE,
      {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#221038',
        backgroundColor: '#c98cff',
        padding: { x: 18, y: 10 },
      },
    )
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        window.location.href = '/#contact';
      });

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
        wordWrap: { width: BOARD_WIDTH - 24 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

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

  update(time: number, delta: number): void {
    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }

    // `JustDown` consumes the press, so the `paused` test must come first.
    if (this.paused && Input.Keyboard.JustDown(this.hardDropKey)) {
      this.setPaused(false);
    }

    if (!this.awaitingAnswer && Input.Keyboard.JustDown(this.restartKey)) {
      this.restart(this.moreToReach);
    }

    if (!this.paused && !this.simulation.toppedOut && !this.storyHolding
      && this.runOver !== 'won') {
      this.readInput(delta);
    }

    if (this.paused) {
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
    } else if (this.revealRemaining > 0) {
      this.revealRemaining -= delta;

      if (this.revealSkippableIn > 0) {
        this.revealSkippableIn -= delta;
        if (this.revealSkippableIn <= 0) {
          this.revealHint.setVisible(true).setAlpha(0);
          this.tweens.add({ targets: this.revealHint, alpha: 1, duration: 260 });
        }
      } else if (Input.Keyboard.JustDown(this.hardDropKey)) {
        this.revealRemaining = 0;
      }

      if (this.revealRemaining <= 0) {
        this.advanceReveal();
      }
    } else if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= delta;
    } else if (this.runOver === 'won') {
    } else {
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
    this.refreshHat();
    this.refreshAnswerLine(time);
    this.refreshStatic();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  private refreshStatic(): void {
    if (this.staticStrength <= 0) {
      return;
    }

    this.staticOverlay.tilePositionX = Math.random() * STATIC_SIZE;
    this.staticOverlay.tilePositionY = Math.random() * STATIC_SIZE;
    this.staticOverlay.setAlpha(this.staticStrength * (0.1 + Math.random() * 0.14));
  }

  private refreshAnswerLine(time: number): void {
    if (this.awaitingAnswer) {
      this.revealHint.setVisible(this.answerText.length === 0);
    }

    if (!this.awaitingAnswer) {
      return;
    }

    const caret = time % CARET_PERIOD < CARET_PERIOD / 2 ? '_' : ' ';
    this.answerLine.setText(this.answerText + caret);
  }

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

  private restart(keepMemory = false, keepStory = false): void {
    this.setPaused(false);
    this.simulation.restart(keepMemory);

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

  private resetShownState(keepMemory = false, keepStory = false): void {
    this.cellsBeingFilled.clear();
    this.threatenedIndex = null;

    if (!keepMemory) {
      this.shownLitNeurons = 0;
      this.nodesRevealed = 0;
    }

    this.startLock();

    for (const slot of this.connections) {
      slot.lit = 0;
      slot.charge = 0;
      slot.chargeDelay = 0;
      slot.trace.setVisible(false);
    }

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
    this.tweens.killAll();
    this.staticStrength = 0;
    this.staticOverlay.setVisible(false);
    this.hatBeam.setVisible(false);
    this.cameras.main.filters.external.clear();
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 1.15, 0.22);
    for (const slot of this.connections) {
      this.tweens.killTweensOf(slot.trace);
      slot.trace.setAlpha(1);
    }

    if (!keepStory) {
      this.tweens.killTweensOf([
        this.revealScrim, this.revealTitle, this.revealBody, this.revealHint,
      ]);
      for (const part of [this.revealScrim, this.revealTitle, this.revealBody, this.revealHint]) {
        part.setVisible(false).setAlpha(1);
      }
      this.revealSkippableIn = 0;
    }
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
    this.shownHatCharge = -1;
    for (const part of this.hatParts) {
      part.setVisible(this.simulation.hatUnlocked);
    }
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
    this.lastRevealPiece = -1;
    this.redrawMemoryPanel(0);

    if (!keepMemory) {
      this.openTheRun();
    }
  }

  private openTheRun(): void {
    if (playedBefore()) {
      this.showReveal('', SHADOW_OPENING_LINE, this.holdFor(SHADOW_OPENING_LINE, 1100));
      this.revealBody.setColor('#b07dff');
    }
    rememberPlayed();

    this.holdObjective(0);
  }

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
    if (Input.Keyboard.JustDown(this.cursors.up)) {
      this.simulation.rotate();
    }

    if (Input.Keyboard.JustDown(this.hatKey)) {
      this.fireTheHat();
    }

    if (Input.Keyboard.JustDown(this.hardDropKey)) {
      const locksBefore = this.simulation.piecesLocked;
      const distance = this.simulation.hardDrop();
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

  private pressedDirection(): HorizontalDirection | null {
    const { left, right } = this.cursors;
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
          this.animateShadow(index, column, row, shadowStrength(pieceType as number));
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
          this.cellTiles[index].setScale(1).setAlpha(1);
        }
      }
    }
  }

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

  private refreshObjective(): void {
    const lock = lockFor(this.nodesRevealed);
    const total = neuronsOn(this.simulation.board).length;
    const lit = total - unlitCount(this.simulation.board);

    this.objectiveText.setText(`${lock.objective}  \u2014  ${lit} of ${total}`);
  }

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

    this.revealPending = true;
  }

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

  private refreshPieces(delta: number): void {
    if (this.runOver === 'won') {
      return;
    }

    const remaining = this.simulation.piecesRemaining;
    if (remaining !== this.shownPiecesRemaining) {
      this.shownPiecesRemaining = remaining;
      this.piecesText.setText(Number.isFinite(remaining) ? `${remaining}` : '');
      this.piecesText.setColor(remaining <= 2 ? '#e4572e' : '#e9dcff');
    }

    if (this.lockEndingIn > 0) {
      this.lockEndingIn -= delta;
      if (this.lockEndingIn <= 0) {
        this.lockEndingIn = 0;
        this.restart(true, this.storyHolding);
      }
      return;
    }

    if (this.lockSolved) {
      if (this.simulation.resolving || this.revealPending) {
        return;
      }

      if (this.pendingReveal !== null || this.awaitingAnswer) {
        return;
      }

      if (this.revealRemaining > 0) {
        this.holdObjective(HANDOVER_DIM);
        this.lockEndingIn = HANDOVER_BEHIND_REVEAL;
        return;
      }

      this.lockEndingIn = HANDOVER_IN_THE_OPEN;
      return;
    }

    if (!this.simulation.outOfPieces || this.simulation.resolving || this.storyHolding) {
      return;
    }

    this.lockEndingIn = 2600;
    this.runOver = 'out-of-pieces';
    this.objectiveText.setText('out of pieces').setAlpha(1);
    this.soundBoard.play(connectionLostVoice(0));
    this.loseTheBoard();
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

    this.shadowBodies[index]
      .setVisible(true)
      .setTexture(shadowBodyTexture(strength))
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
    if (this.storyHolding) {
      return;
    }

    const total = neuronsOn(this.simulation.board).length;
    const lit = total === 0 ? 0 : total - unlitCount(this.simulation.board);

    if (lit === this.shownLitNeurons) {
      return;
    }

    const gainedFrom = this.shownLitNeurons;
    this.shownLitNeurons = lit;
    this.redrawMemoryPanel(total === 0 ? 0 : lit / total);

    this.sparks.setParticleTint(TRACK_LIT_COLOR);
    for (let node = gainedFrom; node < lit; node += 1) {
      const at = brainNodeAt(this.nodesRevealed + node, BRAIN_BOX);
      this.sparks.emitParticleAt(at.x, at.y, SPARKS_PER_CELL);
      this.soundBoard.play({
        ...nodeVoice(node, Math.max(total, 1)),
        delay: (node - gainedFrom) * 70,
      });
    }

  }

  private get moreToReach(): boolean {
    return this.locate(this.nodesRevealed) !== null;
  }

  private locate(total: number): { memoryIndex: number; nodeIndex: number } | null {
    let remaining = total;

    for (let index = 0; index < MEMORIES.length; index += 1) {
      const nodes = MEMORIES[index].nodes.length;
      if (remaining < nodes) {
        return { memoryIndex: index, nodeIndex: remaining };
      }
      remaining -= nodes;
    }

    return null;
  }

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

  private revealNextNode(): void {
    const at = this.locate(this.nodesRevealed);
    if (at === null) {
      return;
    }

    const { memoryIndex, nodeIndex } = at;
    const memory = MEMORIES[memoryIndex];
    const node = memory.nodes[nodeIndex];
    this.nodesRevealed += 1;

    if (node.grantsHat === true) {
      this.grantHat();
    }

    this.pendingReveal = nodeIndex === memory.nodes.length - 1
      ? { title: '', body: memory.question, memoryIndex }
      : null;

    this.shownLitNeurons = 0;
    this.redrawMemoryPanel(0);

    this.showReveal(
      node.title,
      node.body,
      this.holdFor(node.body, this.tuning.fragmentDuration),
      node.photo,
    );
  }

  private holdFor(text: string, floor: number): number {
    return floor + text.length * this.tuning.readingPerCharacter;
  }

  private get storyHolding(): boolean {
    return this.revealRemaining > 0 || this.awaitingAnswer;
  }

  private advanceReveal(): void {
    const pending = this.pendingReveal;
    this.pendingReveal = null;

    if (pending === null) {
      this.hideReveal();
      return;
    }

    this.askQuestion(pending.body, pending.memoryIndex);
  }

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

  private submitAnswer(): void {
    const answer = this.answerText.trim();
    this.awaitingAnswer = false;
    this.hideReveal();

    if (answer === '') {
      this.answerLine.setVisible(false);
      this.endRunIfNothingLeft(700);
      return;
    }

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

    this.endRunIfNothingLeft(this.holdFor(answer, 900) + 700);
  }

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

  private showAnswerEcho(): void {
    const answer = this.memoryAnswers[this.answeringMemory];

    if (answer === undefined) {
      this.answerEcho.setVisible(false);
      return;
    }

    this.answerEcho.setText(`"${answer}"`).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.answerEcho, alpha: 1, duration: 600, delay: 400 });
  }

  private driveOffShadow(): void {
    const { driven, settled } = this.simulation.answerQuestion();
    if (driven.length === 0) {
      return;
    }

    this.tweens.killTweensOf(this.popTiles);
    this.cameras.main.shake(220 + 18 * Math.min(driven.length, 12), this.tuning.shakeIntensity * 3);

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
    this.revealBody.setColor(REVEAL_BODY_COLOR);
    this.revealRemaining = duration;
    this.revealSkippableIn = REVEAL_SKIP_GRACE;
    this.revealHint.setText(SKIP_PROMPT).setVisible(false);
    this.showRevealPicture(photo);
    this.revealTitle.setText(title);
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

  private redrawMemoryPanel(progress: number): void {
    drawBrain(this.memoryPanel, BRAIN_BOX, this.nodesRevealed, progress);
  }

  private settledPieceAt(column: number, row: number): number | null {
    if (this.cellsBeingFilled.has(visibleCellIndex(column, row))) {
      return null;
    }
    return this.simulation.board.pieceAt(column, row);
  }

  private playSounds(): void {
    const { piecesLocked, toppedOut, chainLength, resolving } = this.simulation;

    if (piecesLocked !== this.soundedPiecesLocked) {
      this.soundedPiecesLocked = piecesLocked;
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

    for (const site of lit) {
      this.litNeurons.push(site);
      this.soundBoard.play({
        ...nodeVoice(this.litNeurons.length - 1, Math.max(total, 1)),
        pan: panForX(centerOfColumn(site.column)),
      });

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

  private flinchDamagedShadow(damaged: readonly ShadowHit[], from: number): number {
    let borrowed = from;

    for (const cell of damaged) {
      if (!isVisibleRow(cell.row)) {
        continue;
      }

      const x = centerOfColumn(cell.column);
      const y = centerOfRow(cell.row);

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

  private fireTheHat(): void {
    if (!this.simulation.canFireHat) {
      return;
    }

    const firedFrom = this.simulation.pair.row;
    const column = this.simulation.pair.column;
    const hit = this.simulation.fireHat();

    const x = centerOfColumn(column);
    const fromY = centerOfRow(Math.max(firedFrom, FIRST_VISIBLE_ROW));
    const toY = centerOfRow(hit === null ? ROWS - 1 : hit.row);

    this.soundBoard.play(hatVoice());

    this.tweens.killTweensOf(this.hatBeam);
    this.hatBeam
      .setPosition(x, (fromY + toY) / 2)
      .setSize(HAT_BEAM_WIDTH, Math.abs(toY - fromY) + CELL_SIZE)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: this.hatBeam,
      alpha: 0,
      duration: hit === null ? HAT_BEAM_DURATION : HAT_BEAM_HIT_DURATION,
      onComplete: () => this.hatBeam.setVisible(false),
    });

    if (hit === null) {
      return;
    }

    this.hitStopRemaining = this.tuning.hitStopDuration;
    this.cameras.main.shake(180, this.tuning.shakeIntensity * 2);

    const tile = this.popTiles[0];
    this.tweens.killTweensOf(tile);
    tile
      .setPosition(x, toY)
      .setTexture(shadowBodyTexture(hit.strength))
      .setScale(1)
      .setAngle(0)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: tile,
      scale: 1.7,
      alpha: 0,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => tile.setVisible(false),
    });

    this.sparks.setParticleTint(TRACK_LIT_COLOR);
    this.sparks.emitParticleAt(x, toY, SPARKS_PER_CELL * 2);
  }

  private refreshHat(): void {
    this.hatPrompt.setVisible(this.simulation.canFireHat && !this.storyHolding);

    if (this.simulation.hatCharge === this.shownHatCharge) {
      return;
    }

    this.shownHatCharge = this.simulation.hatCharge;
    const filled = (this.simulation.hatCharge / HAT_FULL_CHARGE) * HAT_METER_WIDTH;
    this.hatMeter.setSize(filled, HAT_METER_HEIGHT);
  }

  private grantHat(): void {
    rememberHat();
    this.simulation.hatUnlocked = true;
    this.simulation.hatCharge = HAT_FULL_CHARGE;
    this.shownHatCharge = -1;

    for (const part of this.hatParts) {
      part.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: part, alpha: 1, duration: 420 });
    }
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
        .setTexture(tileTexture(pieceType))
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

    const showing = resolving && chainLength >= 2 && !this.storyHolding;

    this.chainText.setVisible(showing);
    if (showing && chainLength !== this.shownChain) {
      this.shownChain = chainLength;
      this.chainText.setText(`${chainLength} CHAIN`);
    }
  }

  private refreshGameOver(): void {
    if (this.runOver === null || this.storyHolding) {
      this.gameOverText.setVisible(false);
      this.gameOverLine.setVisible(false);
      this.gameOverHint.setVisible(false);
      this.contactOffer.setVisible(false);
    }
  }

  private loseTheBoard(): void {
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

    this.tweens.add({
      targets: this.memoryPanel,
      alpha: 0.15,
      duration: 700,
      delay: settled * 0.4,
    });

    this.time.delayedCall(settled, () => {
      if (this.runOver === null) {
        return;
      }
      this.gameOverLine.setText(closingLine(this.unfinishedBusiness()));
      this.gameOverHint.setY(HINT_ALONE_Y);

      for (const text of [this.gameOverText, this.gameOverLine, this.gameOverHint]) {
        text.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 420 });
      }
    });
  }

  private winTheRun(): void {
    this.runOver = 'won';

    this.tweens.add({
      targets: [this.objectiveText, this.piecesText, ...this.runReadouts, ...this.previewTiles],
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

    this.tweens.add({
      targets: this.memoryPanel,
      alpha: 1,
      duration: 900,
    });

    const settled = built.length * 60 + 520;

    this.time.delayedCall(settled, () => {
      if (this.runOver !== 'won') {
        return;
      }

      this.gameOverHint.setY(HINT_BELOW_OFFER_Y);
      this.gameOverText.setText(STILL_CONNECTED);
      this.gameOverLine.setText(RECOVERED_LINE);

      for (const text of [this.gameOverText, this.gameOverLine, this.gameOverHint, this.contactOffer]) {
        text.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 420 });
      }
    });
  }

  private unfinishedBusiness(): UnfinishedBusiness {
    const at = this.locate(this.nodesRevealed);
    if (at === null) {
      return { reaching: null, connectionsShort: 0 };
    }

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
