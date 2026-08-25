import { ReactiveController, ReactiveControllerHost } from "lit";
import createPanZoom, { type PanZoom } from "panzoom";
import { BoxItem, Point } from "../../model/types";
import { computeBounds, INTERACTIVE_SELECTOR } from "./helper";

export class ZoomController implements ReactiveController {
  private _panzoom: PanZoom | null = null;
  private _svg: SVGSVGElement | null = null;
  private _wheelDoc: Document | null = null;

  private static readonly ZOOM_STEP = 1.3;
  private static readonly FIT_PADDING = 32;
  private static readonly LINE_HEIGHT = 16;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly minZoom: number,
    private readonly maxZoom: number,
    private readonly isEditable: () => boolean,
  ) {
    host.addController(this);
  }

  hostDisconnected(): void {
    this._wheelDoc?.removeEventListener("wheel", this._onWheel, {
      capture: true,
    });
    this._panzoom?.off("zoom", this._syncZoomLevel);
    this._panzoom?.dispose();
    this._panzoom = null;
  }

  init(viewport: SVGGElement): void {
    if (!viewport) return;
    this._svg = viewport.ownerSVGElement;

    this._panzoom = createPanZoom(viewport, {
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomDoubleClickSpeed: 1, // disable double-click to zoom
      beforeMouseDown: (e) => {
        // middle-click always pans
        if (e.button === 1) return false;
        // left-click pans in read-only mode
        if (e.button === 0 && !this.isEditable()) return false;
        // shift + left-click always pans unless clicking an interactive element
        if (
          e.button === 0 &&
          e.shiftKey &&
          !(e.target as Element | null)?.closest(INTERACTIVE_SELECTOR)
        )
          return false;
        return true;
      },
      filterKey: (e?: KeyboardEvent) =>
        !!(e?.target instanceof HTMLElement && e.target.isContentEditable), // prevent interference with label editing
      beforeWheel: () => true,
    });
    this._panzoom.on("zoom", this._syncZoomLevel);
    this._syncZoomLevel();
    // The WebWriter editor sets `pointer-events: none` on the whole widget while ctrl
    // is held, so the wheel event never reaches the SVG. Listen on the document instead
    // and use the pointer position to decide whether the event belongs to this canvas.
    this._wheelDoc = this._svg?.ownerDocument ?? null;
    this._wheelDoc?.addEventListener("wheel", this._onWheel, {
      capture: true,
      passive: false,
    });
  }

  private _onWheel = (e: WheelEvent): void => {
    const rect = this._svg?.getBoundingClientRect();
    if (!rect || !this._panzoom) return;
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return;

    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaMode > 0 ? ZoomController.LINE_HEIGHT : 1;
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY * factor;
      // adopted from Panzoom
      const multiplier =
        1 - Math.sign(delta) * Math.min(0.25, Math.abs(delta / 128));
      this._panzoom.zoomTo(
        e.clientX - rect.left,
        e.clientY - rect.top,
        multiplier,
      );
    } else {
      // shift + wheel scrolls horizontally, unless the browser already swapped the axes
      const [dx, dy] =
        e.shiftKey && !e.deltaX ? [e.deltaY, 0] : [e.deltaX, e.deltaY];
      this._panzoom.moveBy(-dx * factor, -dy * factor, false);
    }
  };

  get scale(): number {
    return this._panzoom?.getTransform().scale ?? 1;
  }

  private _clampZoom(scale: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, scale));
  }

  private _zoomTo(scale: number, x: number, y: number): void {
    if (!this._panzoom) return;
    const current = this._panzoom.getTransform().scale;
    this._panzoom.zoomTo(0, 0, scale / current);
    this._panzoom.moveTo(x, y);
  }

  zoomIn(): void {
    this._zoomBy(ZoomController.ZOOM_STEP);
  }
  zoomOut(): void {
    this._zoomBy(1 / ZoomController.ZOOM_STEP);
  }

  private _zoomBy(factor: number): void {
    if (!this._panzoom) return;
    const { width, height } = this._viewportSize();
    const t = this._panzoom.getTransform();
    const targetScale = this._clampZoom(t.scale * factor);
    if (targetScale === t.scale) return;

    const cx = width / 2;
    const cy = height / 2;
    const sceneX = (cx - t.x) / t.scale;
    const sceneY = (cy - t.y) / t.scale;
    this._zoomTo(
      targetScale,
      cx - sceneX * targetScale,
      cy - sceneY * targetScale,
    );
  }

  fitToContent(items: readonly BoxItem[]): void {
    if (!this._panzoom) return;
    const { width, height } = this._viewportSize();
    if (width === 0 || height === 0) return;

    const bounds = computeBounds(items);
    if (!bounds) {
      this._zoomTo(1, width / 2, height / 2);
      return;
    }

    const scale = this._clampZoom(
      Math.min(
        (width - 2 * ZoomController.FIT_PADDING) / bounds.dimension.width,
        (height - 2 * ZoomController.FIT_PADDING) / bounds.dimension.height,
      ),
    );

    this._zoomTo(
      scale,
      width / 2 - bounds.position.x * scale,
      height / 2 - bounds.position.y * scale,
    );
  }

  private _viewportSize(): { width: number; height: number } {
    const rect = this._svg?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }

  clientToScene(clientX: number, clientY: number): Point {
    const rect = this._svg?.getBoundingClientRect();
    const t = this._panzoom?.getTransform();
    const scale = t?.scale ?? 1;
    return {
      x: (clientX - (rect?.left ?? 0) - (t?.x ?? 0)) / scale,
      y: (clientY - (rect?.top ?? 0) - (t?.y ?? 0)) / scale,
    };
  }

  viewportCenter(): Point {
    const { width, height } = this._viewportSize();
    const t = this._panzoom?.getTransform();
    const scale = t?.scale ?? 1;
    return {
      x: (width / 2 - (t?.x ?? 0)) / scale,
      y: (height / 2 - (t?.y ?? 0)) / scale,
    };
  }

  private _syncZoomLevel = (): void => {
    this.host.requestUpdate();
  };
}
