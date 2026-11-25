import type { MsgFn } from "@lit/localize";
import { ReactiveController, ReactiveControllerHost } from "lit";
import { Id, Label, Point } from "../../model/types";
import {
  CanvasStores,
  duplicateSelection,
  insertNode,
  pickAndInsertImages,
} from "../canvas/insert";

const MOVE_STEP = 1;
const MOVE_STEP_COARSE = 10;

const MOVE_DIRECTIONS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export const MOD_LABEL = /mac|iphone|ipad/i.test(navigator.userAgent)
  ? "⌘"
  : "Ctrl";

interface KeyboardCanvas extends CanvasStores {
  readonly msg: MsgFn;
  readonly editable: boolean;
  readonly editingId: Id | null;

  insertPosition(): Point;
  startLabelEdit(id: Id): void;
  toggleDrawEdge(): void;

  cancelInteraction(): boolean;
}

interface KeyboardHost extends ReactiveControllerHost, EventTarget {
  keyboardTarget(e: KeyboardEvent): KeyboardCanvas | null;
}

export class KeyboardController implements ReactiveController {
  constructor(private readonly host: KeyboardHost) {
    host.addController(this);
  }

  hostConnected(): void {
    this.host.addEventListener("keydown", this._onKeydown, { capture: true });
  }

  hostDisconnected(): void {
    this.host.removeEventListener("keydown", this._onKeydown, {
      capture: true,
    });
  }

  private _onKeydown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.altKey) return;

    const canvas = this.host.keyboardTarget(e);
    if (!canvas || !canvas.editable || canvas.editingId !== null) return;

    if (this._handle(e, canvas)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private _handle(e: KeyboardEvent, canvas: KeyboardCanvas): boolean {
    const modifier = e.ctrlKey || e.metaKey;
    const direction = MOVE_DIRECTIONS[e.key];

    if (direction) {
      if (modifier || canvas.selection.isEmpty()) return false;
      const step = e.shiftKey ? MOVE_STEP_COARSE : MOVE_STEP;
      this._moveSelection(canvas, direction, step);
      return true;
    }

    if (modifier) {
      switch (e.key.toLowerCase()) {
        case "a":
          return this._selectAll(canvas);
        case "d":
          return this._duplicate(canvas);
        case "b":
          return this._toggleLabelStyle(canvas, "bold");
        case "i":
          return this._toggleLabelStyle(canvas, "italic");
        case "u":
          return this._toggleLabelStyle(canvas, "underline");
        default:
          return false;
      }
    }

    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) {
      return this._stepSelection(canvas, e.shiftKey ? -1 : 1);
    }

    switch (e.key) {
      case "Delete":
      case "Backspace":
        return this._deleteSelection(canvas);
      case "Escape":
        return this._cancel(canvas);
      case "Enter":
      case "F2":
        return this._startLabelEdit(canvas);
    }

    switch (e.key.toLowerCase()) {
      case "c":
        if (!e.repeat) insertNode(canvas.insertPosition(), canvas);
        return true;
      case "r":
        if (e.repeat) return true;
        if (!(e.shiftKey && this._connectSelected(canvas))) canvas.toggleDrawEdge();
        return true;
      case "i":
        if (!e.repeat) {
          void pickAndInsertImages(canvas.insertPosition(), canvas);
        }
        return true;
      default:
        return false;
    }
  }

  private _moveSelection(
    canvas: KeyboardCanvas,
    direction: Point,
    step: number,
  ): void {
    const positions = new Map<Id, Point>();
    for (const id of canvas.selection.entries) {
      const item = canvas.doc.get(id);
      if (item?.kind !== "node" && item?.kind !== "image") continue;
      positions.set(id, {
        x: item.position.x + direction.x * step,
        y: item.position.y + direction.y * step,
      });
    }
    if (positions.size > 0) canvas.doc.moveItems(positions);
  }

  private _deleteSelection(canvas: KeyboardCanvas): boolean {
    if (!canvas.selection.isEmpty()) {
      canvas.doc.removeItems(new Set(canvas.selection.entries));
    }
    return true;
  }

  private _cancel(canvas: KeyboardCanvas): boolean {
    if (canvas.cancelInteraction()) return true;
    if (canvas.selection.isEmpty()) return false;
    canvas.selection.clear();
    return true;
  }

  private _selectAll(canvas: KeyboardCanvas): boolean {
    const ids = new Set<Id>([
      ...canvas.doc.nodes.map((node) => node.id),
      ...canvas.doc.edges.map((edge) => edge.id),
      ...canvas.doc.images.map((image) => image.id),
    ]);
    if (ids.size === 0) return false;
    canvas.selection.select(ids);
    return true;
  }

  private _duplicate(canvas: KeyboardCanvas): boolean {
    if (canvas.selection.isEmpty()) return false;
    duplicateSelection(canvas);
    return true;
  }

  private _toggleLabelStyle(
    canvas: KeyboardCanvas,
    key: "bold" | "italic" | "underline",
  ): boolean {
    const labels: Label[] = [];
    for (const id of canvas.selection.entries) {
      const item = canvas.doc.get(id);
      if (item?.kind !== "image" && item?.label) labels.push(item.label);
    }
    if (labels.length === 0) return false;

    const allSet = labels.every((label) => label[key]);
    for (const id of canvas.selection.entries) {
      canvas.doc.updateLabelStyle(id, { [key]: !allSet });
    }
    return true;
  }

  private _startLabelEdit(canvas: KeyboardCanvas): boolean {
    if (canvas.selection.isEmpty()) {
      const first = this._itemIds(canvas)[0];
      if (first === undefined) return false;
      canvas.selection.select(new Set([first]));
      return true;
    }
    if (canvas.selection.size !== 1) return false;
    const id = canvas.selection.entries.values().next().value;
    if (id === undefined) return false;
    const item = canvas.doc.get(id);
    if (item?.kind !== "node" && item?.kind !== "edge") return false;
    canvas.startLabelEdit(id);
    return true;
  }

  private _itemIds(canvas: KeyboardCanvas): Id[] {
    return [
      ...canvas.doc.nodes.map((node) => node.id),
      ...canvas.doc.edges.map((edge) => edge.id),
      ...canvas.doc.images.map((image) => image.id),
    ];
  }

  /** Tab moves a single selection through the items; at either end it leaves the canvas. */
  private _stepSelection(canvas: KeyboardCanvas, step: 1 | -1): boolean {
    if (canvas.selection.size !== 1) return false;
    const ids = this._itemIds(canvas);
    const current = ids.indexOf(canvas.selection.entries.values().next().value!);
    const next = ids[current + step];
    if (current < 0 || next === undefined) return false;
    canvas.selection.select(new Set([next]));
    return true;
  }

  /** With two concepts selected, Shift+R connects them, the keyboard way of drawing a relation. */
  private _connectSelected(canvas: KeyboardCanvas): boolean {
    if (canvas.selection.size !== 2) return false;
    const [source, target] = [...canvas.selection.entries].map((id) =>
      canvas.doc.get(id),
    );
    if (source?.kind !== "node" || target?.kind !== "node") return false;
    const dx = target.position.x - source.position.x;
    const dy = target.position.y - source.position.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const sourcePosition = horizontal ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
    const targetPosition = horizontal ? (dx >= 0 ? "left" : "right") : dy >= 0 ? "top" : "bottom";
    const edge = canvas.doc.addEdge({
      source: source.id,
      sourcePosition,
      target: target.id,
      targetPosition,
      style: { markerEnd: "arrow" },
    });
    if (edge) canvas.selection.select(new Set([edge.id]));
    return true;
  }
}
