import { EntityType } from "../../types/EntityType";
import AEntity from "./AEntity";

export default abstract class ABlock extends AEntity {
  public entityType = EntityType.BLOCK;
}
