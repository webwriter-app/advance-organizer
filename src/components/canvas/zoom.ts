import type { Viewport, WorldBox } from "@webwriter/lit/viewport";
import { Bounds, BoxItem, Point } from "../../model/types";
import { computeBounds } from "./helper";

/**
 * The canvas' own questions about its view, answered from the `Viewport` module:
 * where the content is, how it is fitted at the start, and the geometry that the
 * interaction modes need. Wheel, drag and pinch navigation belong to the module.
 */
export class ZoomController {
  private _initialFitObserver: ResizeObserver | null = null;
  private _remembered: (Point & { scale: number }) | null = null;

  private static readonly ZOOM_STEP = 1.3;
  private static readonly FIT_PADDING = 32;
  static readonly PAN_MARGIN = 200;
  private static readonly INITIAL_FIT_MAX_ZOOM = 1;
  static readonly PAUSED_ATTRIBUTE = "data-pan-paused";

  constructor(
    private readonly host: HTMLElement,
    private readonly viewport: Viewport,
    private readonly maxZoom: number,
    private readonly isEditable: () => boolean,
    private readonly contentItems: () => readonly BoxItem[],
  ) {}

  /** Authors pan without limits; readers stay near the content. */
  panLimit(): WorldBox | null {
    if (this.isEditable()) return null;
    const bounds = computeBounds(this.contentItems());
    if (!bounds) return null;
    return {
      x: bounds.position.x - bounds.dimension.width / 2,
      y: bounds.position.y - bounds.dimension.height / 2,
      width: bounds.dimension.width,
      height: bounds.dimension.height,
    };
  }

  /** Called when the canvas is removed: the view is put back when it returns. */
  remember(): void {
    this._initialFitObserver?.disconnect();
    this._initialFitObserver = null;
    const { x, y, scale } = this.viewport;
    this._remembered = { x, y, scale };
  }

  /**
   * Shows the view that was remembered, or else fits the content once the window has a
   * size. The observer is created after the module's own, so the module has opened the
   * window when this runs.
   */
  init(svg: SVGSVGElement): void {
    this._initialFitObserver?.disconnect();
    this._initialFitObserver = new ResizeObserver(() => {
      if (!svg.clientWidth || !svg.clientHeight) return;
      this._initialFitObserver?.disconnect();
      this._initialFitObserver = null;
      const remembered = this._remembered;
      this._remembered = null;
      if (remembered) this._moveTo(remembered.scale, remembered.x, remembered.y);
      else if (this.contentItems().length > 0) {
        this.fitToContent(ZoomController.INITIAL_FIT_MAX_ZOOM);
      }
    });
    this._initialFitObserver.observe(svg);
  }

  get scale(): number {
    return this.viewport.scale;
  }

  /** Stops the module's navigation, for example while a touch selection runs. */
  setPanningEnabled(enabled: boolean): void {
    this.host.toggleAttribute(ZoomController.PAUSED_ATTRIBUTE, !enabled);
  }

  panningEnabled(): boolean {
    return !this.host.hasAttribute(ZoomController.PAUSED_ATTRIBUTE);
  }

  zoomIn(): void {
    this.viewport.zoomBy(ZoomController.ZOOM_STEP);
  }
  zoomOut(): void {
    this.viewport.zoomBy(1 / ZoomController.ZOOM_STEP);
  }

  /** Sets scale and translation: the module zooms about the centre, then moves. */
  private _moveTo(scale: number, x: number, y: number): void {
    this.viewport.zoomTo(scale);
    this.viewport.panBy(x - this.viewport.x, y - this.viewport.y);
  }

  fitToContent(maxScale: number = this.maxZoom): void {
    const { width, height, min, max } = this.viewport;
    if (width === 0 || height === 0) return;

    const bounds = computeBounds(this.contentItems());
    if (!bounds) {
      this._moveTo(1, width / 2, height / 2);
      return;
    }

    const scale = Math.min(
      maxScale,
      Math.min(
        max,
        Math.max(
          min,
          Math.min(
            (width - 2 * ZoomController.FIT_PADDING) / bounds.dimension.width,
            (height - 2 * ZoomController.FIT_PADDING) / bounds.dimension.height,
          ),
        ),
      ),
    );

    this._moveTo(
      scale,
      width / 2 - bounds.position.x * scale,
      height / 2 - bounds.position.y * scale,
    );
  }

  clientToScene(clientX: number, clientY: number): Point {
    return this.viewport.toWorld(clientX, clientY);
  }

  viewportCenter(): Point {
    const { width, height, x, y, scale } = this.viewport;
    return { x: (width / 2 - x) / scale, y: (height / 2 - y) / scale };
  }

  visibleBounds(): Bounds | null {
    const { width, height, scale } = this.viewport;
    if (width === 0 || height === 0) return null;
    return {
      position: this.viewportCenter(),
      dimension: { width: width / scale, height: height / scale },
    };
  }
}
