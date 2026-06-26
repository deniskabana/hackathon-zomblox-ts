import type { WorldPosition } from "../config/core/grid.config";
import type { AnyEntity } from "../entities/engine/AEntity";

export type RaycastHit =
  | {
      type: "entity";
      entity: AnyEntity;
      point: WorldPosition;
      distance: number;
    }
  | {
      type: "wall";
      point: WorldPosition;
      distance: number;
    };
