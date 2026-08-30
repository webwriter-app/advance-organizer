import { Point } from "../../model/types";

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
  private _timer: number | null = null;

  constructor(private readonly onLongPress: (origin: Point) => void) {}

  start(e: PointerEvent): void {
    // A second pointer means the user is panning or pinching, not holding.
    if (this._pointerId !== null) {
      this.cancel();
      return;
    }

    this._pointerId = e.pointerId;
    this._origin = { x: e.clientX, y: e.clientY };
    this._timer = window.setTimeout(() => {
      const origin = this._origin!;
      this.cancel();
      this.onLongPress(origin);
    }, LongPressController.HOLD_MS);
  }

  onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this._pointerId || !this._origin) return;
    const dx = e.clientX - this._origin.x;
    const dy = e.clientY - this._origin.y;
    if (Math.hypot(dx, dy) > LongPressController.MOVE_TOLERANCE) this.cancel();
  }

  cancel(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._pointerId = null;
    this._origin = null;
  }
}
