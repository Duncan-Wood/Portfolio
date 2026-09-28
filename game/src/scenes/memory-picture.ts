import { CUSTOMER_MAP_LAND_TEXTURE, TRACE_TEXTURE, memoryArtTexture } from './tile-textures';
import { CustomerMapBuild } from './customer-map-build';
import { CUSTOMER_MAP_PICTURE } from '../memory-pictures';

export class MemoryPicture {
  readonly image: Phaser.GameObjects.Image;
  private readonly mapBuild: CustomerMapBuild;
  private building = false;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, TRACE_TEXTURE).setVisible(false);
    this.mapBuild = new CustomerMapBuild(scene);
  }

  get parts(): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
    return [this.image, this.mapBuild.graphics];
  }

  get shown(): boolean {
    return this.image.visible;
  }

  get height(): number {
    return this.image.visible ? this.image.displayHeight : 0;
  }

  show(photo: string | undefined, maxWidth: number, maxHeight: number): void {
    this.hide();

    const key = photo === undefined ? null
      : photo === CUSTOMER_MAP_PICTURE ? CUSTOMER_MAP_LAND_TEXTURE
      : memoryArtTexture(photo);
    if (key === null || !this.image.scene.textures.exists(key)) {
      return;
    }

    this.image.setTexture(key);
    const fit = Math.min(maxWidth / this.image.width, maxHeight / this.image.height, 1);
    this.image.setScale(fit).setAlpha(1).setVisible(true);
    this.building = photo === CUSTOMER_MAP_PICTURE;
  }

  placeAt(x: number, y: number): void {
    this.image.setPosition(x, y);
    if (this.building) {
      this.mapBuild.play(this.image);
    }
  }

  advance(delta: number): void {
    this.mapBuild.advance(delta);
  }

  hide(): void {
    this.image.setVisible(false);
    this.mapBuild.stop();
    this.building = false;
  }
}
