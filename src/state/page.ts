import { type ReactiveControllerHost } from "lit";
import { Observable } from "./observable";
import { DocumentController } from "./document";
import { LitElementWw } from "@webwriter/lit";
import { Id } from "../model/types";

const PAGE_TAG = "webwriter-advance-organizer-page";

export class PageController extends Observable {
  constructor(
    host: ReactiveControllerHost,
    private readonly doc: DocumentController,
  ) {
    super(host);

    this.doc.subscribe(() => {
      this._prune();
    });
  }

  hasPage(id: Id): boolean {
    return (this.host as LitElementWw).children.namedItem(id) !== null;
  }

  getPage(id: Id): Element | null {
    return (this.host as LitElementWw).children.namedItem(id);
  }

  get pageIds(): Set<Id> {
    const ids = new Set<Id>();
    for (const child of (this.host as LitElementWw).children) {
      if (child.tagName.toLowerCase() === PAGE_TAG && child.id) {
        ids.add(child.id);
      }
    }
    return ids;
  }

  addPage(id: Id): Element {
    const page = document.createElement(PAGE_TAG);
    page.id = id;
    (this.host as LitElementWw).appendChild(page);
    this.notify();
    return page;
  }

  removePage(id: Id): void {
    const page = this.getPage(id);
    if (page) {
      page.remove();
      this.notify();
    }
  }

  private _prune(): void {
    const beforeSize = this.pageIds.size;
    this.pageIds.forEach((id) => {
      if (!this.doc.hasItem(id)) {
        this.removePage(id);
      }
    });
    if (this.pageIds.size !== beforeSize) {
      this.notify();
    }
  }
}
