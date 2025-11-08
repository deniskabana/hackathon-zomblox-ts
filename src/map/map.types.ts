/** Tiled editor export schema */
export interface MapJsonSchema {
  compressionlevel: number;
  height: number;
  width: number;
  infinite: boolean;
  layers: AnyLayer[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tilewidth: number;
  tileheight: number;
  tilesets: { firstguid: number; source: string }[];
  type: "map";
  version: string;
}

export type AnyLayer = LayerGroup | LayerTiles | LayerObjectGroup | MapObject;

interface ALayer {
  id: number;
  x: number;
  y: number;
  name: string;
  opacity: number;
  visible: boolean;
}

export interface LayerGroup extends ALayer {
  type: "group";
  layers: AnyLayer[];
}

export interface LayerTiles extends ALayer {
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
}

export interface LayerObjectGroup extends ALayer {
  type: "objectgroup";
  draworder: string;
  objects: MapObject[];
}

export interface MapObject extends ALayer {
  type: "";
  rotation: number;
  width: number;
  height: number;
  point?: boolean;
}
