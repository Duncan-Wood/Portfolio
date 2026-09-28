import {
  CUSTOMER_MAP_LAND_TEXTURE,
  ONE_DOOR_DOORWAY_TEXTURE,
  TRACE_TEXTURE,
  memoryArtTexture,
} from './tile-textures';
import { CustomerMapBuild } from './customer-map-build';
import { OneDoorStream } from './one-door-stream';
import { CUSTOMER_MAP_PICTURE, ONE_DOOR_PICTURE } from '../memory-pictures';

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
      [CUSTOMER_MAP_PICTURE]: { texture: CUSTOMER_MAP_LAND_TEXTURE, animation: new CustomerMapBuild(scene) },
      [ONE_DOOR_PICTURE]: { texture: ONE_DOOR_DOORWAY_TEXTURE, animation: new OneDoorStream(scene) },
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
