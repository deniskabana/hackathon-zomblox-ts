import { EntityType } from "../../types/EntityType";
import AEntity from "./AEntity";

export default abstract class AEnemy extends AEntity {
  public entityType = EntityType.ENEMY;
  protected abstract drawShadow(size: number): void;
}
