export interface LevelState {
  phase: "day" | "night";
  daysCounter: number;
  zombiesKillCounter: number;
  currencyTotalCounter: number;
  currency: number;
  totalTimeCounter: number;
}
