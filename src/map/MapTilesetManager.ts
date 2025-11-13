import SpriteSheet, { type SpriteFrame } from "../utils/classes/SpriteSheet";

export default class MapTilesetManager {
  private spriteSheet: SpriteSheet;
  private columns: number;

  constructor(tilesetImage: HTMLImageElement, tileSize: number = 48) {
    this.columns = Math.floor(tilesetImage.width / tileSize);

    // Calculate total tiles
    const rows = Math.floor(tilesetImage.height / tileSize);
    const totalTiles = this.columns * rows;

    // Create frames for every tile
    const frames: SpriteFrame[] = [];
    for (let i = 0; i < totalTiles; i++) {
      const col = i % this.columns;
      const row = Math.floor(i / this.columns);

      frames.push({
        x: col * tileSize,
        y: row * tileSize,
        width: tileSize,
        height: tileSize,
      });
    }

    this.spriteSheet = new SpriteSheet(tilesetImage, frames);
  }

  /**
   * Get sprite frame for a Tiled tile ID (1-indexed)
   * Returns null for tileId 0 (empty tile)
   */
  public getTileFrame(tileId: number): { spriteSheet: SpriteSheet; frameIndex: number } | null {
    if (tileId === 0) return null;

    const frameIndex = tileId - 1; // Convert Tiled's 1-indexed to 0-indexed

    return {
      spriteSheet: this.spriteSheet,
      frameIndex,
    };
  }
}
