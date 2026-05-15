import { ReactiveControllerHost } from "lit";
import { Id } from "../model/types";
import { DocumentController } from "./document";
import { Observable } from "./observable";

export class SelectionController extends Observable {
  private _entries: Set<Id> = new Set();

  constructor(
    host: ReactiveControllerHost,
    private readonly doc: DocumentController,
  ) {
    super(host);

    this.doc.subscribe(() => {
      this._prune();
    });
  }

  get entries(): Set<Id> {
    return this._entries;
  }

  get size(): number {
    return this._entries.size;
  }

  has(id: Id): boolean {
    return this._entries.has(id);
  }

  isEmpty(): boolean {
    return this._entries.size === 0;
  }

  select(id: Id): void {
    this._entries.clear();
    this._entries.add(id);
    this.notify();
  }

  toggle(id: Id): void {
    if (this._entries.has(id)) {
      this._entries.delete(id);
    } else {
      this._entries.add(id);
    }
    this.notify();
  }

  clear(): void {
    this._entries.clear();
    this.notify();
  }

  private _prune(): void {
    const beforeSize = this._entries.size;
    this._entries.forEach((id) => {
      if (!this.doc.hasItem(id)) {
        this._entries.delete(id);
      }
    });
    if (this._entries.size !== beforeSize) {
      this.notify();
    }
  }
}
