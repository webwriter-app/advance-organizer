import { Point } from "../../model/types";

export interface HeldPress {
  origin: Point;
  target: Element | null;
}

/**
 * Recognizes a press-and-hold on a single touch pointer: the callback fires once
 * the pointer has stayed within {@link LongPressController.MOVE_TOLERANCE} for
 * {@link LongPressController.HOLD_MS}.
 */
export class LongPressController {
  private static readonly HOLD_MS = 500;
  private static readonly MOVE_TOLERANCE = 10;

  private _pointerId: number | null = null;
  private _origin: Point | null = null;
  private _target: Element | null = null;
  private _timer: number | null = null;
  private _held = false;

  constructor(
    private readonly onLongPress: (
      origin: Point,
      target: Element | null,
    ) => void,
  ) {}

  get pending(): boolean {
    return this._timer !== null || this._held;
  }

  start(e: PointerEvent): void {
    // A second pointer means the user is panning or pinching, not holding.
    if (this._pointerId !== null) {
      this.cancel();
      return;
    }

    this._pointerId = e.pointerId;
    this._origin = { x: e.clientX, y: e.clientY };
    this._target = e.target as Element | null;
    this._timer = window.setTimeout(() => {
      this._timer = null;
      this._held = true;
      this.onLongPress(this._origin!, this._target);
    }, LongPressController.HOLD_MS);
  }

  onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this._pointerId || !this._origin) return;
    const dx = e.clientX - this._origin.x;
    const dy = e.clientY - this._origin.y;
    if (Math.hypot(dx, dy) > LongPressController.MOVE_TOLERANCE) this.cancel();
  }

  heldPress(pointerId: number): HeldPress | null {
    if (!this._held || pointerId !== this._pointerId) return null;
    return { origin: this._origin!, target: this._target };
  }

  cancel(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._pointerId = null;
    this._origin = null;
    this._target = null;
    this._held = false;
  }
}
