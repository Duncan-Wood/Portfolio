import {
  ONE_DOOR_DOORWAY_TEXTURE,
  REVIEW_BASE_TEXTURE,
  TRACE_TEXTURE,
  TRANSCRIPT_BASE_TEXTURE,
  memoryArtTexture,
} from './tile-textures';
import { OneDoorStream } from './one-door-stream';
import { ReviewPlay } from './review-play';
import { TranscriptPlay } from './transcript-play';
import { ONE_DOOR_PICTURE, REVIEW_PICTURE, TRANSCRIPT_PICTURE } from '../memory-pictures';

interface PictureAnimation {
  readonly graphics: Phaser.GameObjects.Graphics;
  play(over: Phaser.GameObjects.Image): void;
  advance(delta: number): void;
  stop(): void;
}

export class MemoryPicture {
  readonly image: Phaser.GameObjects.Image;
  private readonly animations: Readonly<Record<string, { texture: string; animation: PictureAnimation }>>;
  private playing: PictureAnimation | null = null;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, TRACE_TEXTURE).setVisible(false);
    this.animations = {
      [ONE_DOOR_PICTURE]: { texture: ONE_DOOR_DOORWAY_TEXTURE, animation: new OneDoorStream(scene) },
      [REVIEW_PICTURE]: { texture: REVIEW_BASE_TEXTURE, animation: new ReviewPlay(scene) },
      [TRANSCRIPT_PICTURE]: { texture: TRANSCRIPT_BASE_TEXTURE, animation: new TranscriptPlay(scene) },
    };
  }

  get parts(): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
    return [this.image, ...Object.values(this.animations).map(({ animation }) => animation.graphics)];
  }

  get shown(): boolean {
    return this.image.visible;
  }

  get height(): number {
    return this.image.visible ? this.image.displayHeight : 0;
  }

  show(photo: string | undefined, maxWidth: number, maxHeight: number): void {
    this.hide();

    const animated = photo === undefined ? undefined : this.animations[photo];
    const key = photo === undefined ? null : animated?.texture ?? memoryArtTexture(photo);
    if (key === null || !this.image.scene.textures.exists(key)) {
      return;
    }

    this.image.setTexture(key);
    const fit = Math.min(maxWidth / this.image.width, maxHeight / this.image.height, 1);
    this.image.setScale(fit).setAlpha(1).setVisible(true);
    this.playing = animated?.animation ?? null;
  }

  placeAt(x: number, y: number): void {
    this.image.setPosition(x, y);
    this.playing?.play(this.image);
  }

  advance(delta: number): void {
    this.playing?.advance(delta);
  }

  hide(): void {
    this.image.setVisible(false);
    this.playing?.stop();
    this.playing = null;
  }
}
