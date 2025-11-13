import testmap00 from "../../public/levels/basicmap-01.json";
import { worldToGrid, type GridConfig, type GridPosition } from "../config/gameGrid";
import assertNever from "../utils/assertNever";
import type { AnyLayer, LayerGroup, LayerObjectGroup, LayerTiles, MapObject } from "./map.types";

export interface GameMap {
  tileLayers: { ground: number[]; groundDecor: number[]; overlay: number[]; overlayDecor: number[] };
  objects: GridPosition[];
  spawn: GridPosition;
}

/**
 * Fetch and parse a Tiled editor JSON into a game map
 * @returns Game Map and Grid Config
 */
export default function parseJsonMap(): { map: GameMap; config: GridConfig } {
  const map = testmap00; // TODO: Fetch

  if (map.type !== "map") throw new Error("Incorrect JSON file.");

  const mapConfig: GridConfig = {
    GRID_WIDTH: map.width,
    GRID_HEIGHT: map.height,
    TILE_SIZE: map.tilewidth,
  };

  if (map.layers.length < 1) throw new Error("Map is empty.");

  const parsedMap: GameMap = {
    tileLayers: { ground: [], groundDecor: [], overlay: [], overlayDecor: [] },
    objects: [],
    spawn: { x: 0, y: 0 },
  };

  for (const mapLayer of map.layers) parseLayer(mapLayer, parsedMap, mapConfig);

  return { map: parsedMap, config: mapConfig };
}

function parseLayer(mapLayer: Record<string, unknown> | AnyLayer, parsedMap: GameMap, mapConfig: GridConfig): void {
  const typedLayer = getTypedLayer(mapLayer);
  if (!typedLayer) return;
  const type = typedLayer?.type;

  switch (type) {
    case "group":
      for (const mapLayer of typedLayer.layers) parseLayer(mapLayer, parsedMap, mapConfig);
      break;

    case "tilelayer":
      if (typedLayer.name === "GROUND") {
        parsedMap.tileLayers.ground = typedLayer.data;
      } else if (typedLayer.name === "GROUND_DECOR") {
        parsedMap.tileLayers.groundDecor = typedLayer.data;
      } else if (typedLayer.name === "OVERLAY") {
        parsedMap.tileLayers.overlay = typedLayer.data;
      } else if (typedLayer.name === "OVERLAY_DECOR") {
        parsedMap.tileLayers.overlayDecor = typedLayer.data;
      }
      break;

    case "objectgroup":
      for (const mapObject of typedLayer.objects) parseLayer(mapObject, parsedMap, mapConfig);
      break;

    case "":
      if (typedLayer.point === true) {
        parsedMap.spawn = worldToGrid({ x: typedLayer.x, y: typedLayer.y }, { gridConfig: mapConfig });
      } else {
        parsedMap.objects.push(worldToGrid({ x: typedLayer.x, y: typedLayer.y }, { gridConfig: mapConfig }));
      }
      break;

    default:
      assertNever(type);
  }
}

function getTypedLayer(mapLayer: Record<string, unknown> | AnyLayer): AnyLayer | undefined {
  const type = mapLayer.type as AnyLayer["type"];
  switch (type) {
    case "group":
      return mapLayer as unknown as LayerGroup;

    case "tilelayer":
      return mapLayer as unknown as LayerTiles;

    case "objectgroup":
      return mapLayer as unknown as LayerObjectGroup;

    case "":
      return mapLayer as unknown as MapObject;

    default:
      assertNever(type);
  }
}
