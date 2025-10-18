export interface Effect {
  duration: number;
  render: (_deltaTime: number) => void;
  startTime: number;
}
