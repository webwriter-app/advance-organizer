import { ReactiveController, ReactiveControllerHost } from "lit";
import { Id } from "../../model/types";
import type { DocumentController } from "../../state/document";

export const EDITOR_CLASS = "label-editor";

export interface LabelEditHost extends ReactiveControllerHost {
  readonly renderRoot: ParentNode;
  readonly doc: DocumentController;
}

export class LabelEditController implements ReactiveController {
  private _editingId: Id | null = null;
  private _focusPending: boolean = false;

  constructor(private readonly host: LabelEditHost) {
    host.addController(this);
  }

  get editingId(): Id | null {
    return this._editingId;
  }

  isEditing(id: Id): boolean {
    return this._editingId === id;
  }

  start(id: Id): void {
    this._editingId = id;
    this._focusPending = true;
    this.host.requestUpdate();
  }

  hostUpdated(): void {
    if (!this._focusPending || !this._editingId) return;
    this._focusPending = false;

    const el = this._editorFor(this._editingId);
    if (!el) return;

    const item = this.host.doc.get(this._editingId);
    if (!item || (item.kind !== "node" && item.kind !== "edge")) return;

    // Set text imperatively to avoid Lit issues with contenteditable
    el.textContent = item.label?.text ?? "";
    el.focus();
    if (selectAllText(el)) return;

    const id = this._editingId;
    requestAnimationFrame(() => {
      if (this._editingId !== id) return;
      const editor = this._editorFor(id);
      if (editor) selectAllText(editor);
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (!this._editingId) return;
    if (!isEditorElement(e.target)) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.commit();
      this._focusCanvas();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.cancel();
      this._focusCanvas();
    }
    e.stopPropagation();
  }

  onFocusOut(e: FocusEvent): void {
    if (!isEditorElement(e.target)) return;
    this.commit();
  }

  commit(): void {
    const id = this._editingId;
    if (!id) return;

    const text = (this._editorFor(id)?.innerText ?? "").trim();
    this._editingId = null;
    this.host.requestUpdate();
    this.host.doc.updateLabelText(id, text);
  }

  cancel(): void {
    if (!this._editingId) return;
    // Triggers re-render to restore previous label text
    this._editingId = null;
    this.host.requestUpdate();
  }

  private _focusCanvas(): void {
    this.host.renderRoot
      .querySelector<SVGSVGElement>("svg")
      ?.focus({ preventScroll: true });
  }

  private _editorFor(id: Id): HTMLElement | null {
    return this.host.renderRoot.querySelector<HTMLElement>(
      `.${EDITOR_CLASS}[data-edit-id="${id}"]`,
    );
  }
}

function isEditorElement(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.classList?.contains(EDITOR_CLASS);
}

function selectAllText(el: HTMLElement): boolean {
  const sel = selectionOf(el);
  if (!sel) return false;

  sel.removeAllRanges();
  sel.setBaseAndExtent(el, 0, el, el.childNodes.length);

  return selectionIsInside(el);
}

function selectionOf(el: HTMLElement): Selection | null {
  const root = el.getRootNode() as Node & {
    getSelection?: () => Selection | null;
  };
  return root.getSelection?.() ?? window.getSelection();
}

function selectionIsInside(el: HTMLElement): boolean {
  const sel = selectionOf(el);
  if (!sel?.rangeCount) return false;
  return el.contains(sel.getRangeAt(0).commonAncestorContainer);
}
