import { EntityType } from "../../types/EntityType";
import AEntity from "./AEntity";

export default abstract class ACollectable extends AEntity {
  public entityType = EntityType.COLLECTABLE;
}
