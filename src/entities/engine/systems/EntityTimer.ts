/** Creates a new timer, accepts optional description to be used when declaring types. */
export class EntityTimer<_OptionalDescription extends string | undefined = undefined> {
  private _value: number;
  private _active: boolean;
  private _initialValue: number;

  constructor({ initialValue, autoStart = true }: { initialValue: number; autoStart?: boolean }) {
    this._initialValue = initialValue;
    this._value = this._initialValue * -1;
    this._active = autoStart;
  }

  public _tick(deltaTime: number): void {
    if (this._active && this._value < 0) this._value += deltaTime;
  }

  public reset(value: number = this._initialValue): void {
    this._value = value * -1;
    this._active = true;
  }

  public pause(): void {
    this._active = false;
  }

  public continue(): void {
    this._active = true;
  }

  // Setters
  // --------------------------------------------------

  public getIsActive(): boolean {
    return this._active;
  }
  public getIsDone(): boolean {
    return this._value >= 0;
  }
  public get value(): number {
    return this._value;
  }
}
