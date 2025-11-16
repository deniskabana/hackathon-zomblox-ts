import { EntityType } from "../../types/EntityType";
import AEntity from "./AEntity";

export default abstract class APlayer extends AEntity {
  public entityType = EntityType.PLAYER;
  protected abstract drawShadow(size: number): void;
}
