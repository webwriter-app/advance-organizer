import { type ReactiveControllerHost } from "lit";
import { Observable } from "./observable";
import { DocumentController } from "./document";
import { LitElementWw } from "@webwriter/lit";
import DOMPurify from "dompurify";
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

  getPageContent(id: Id): string | null {
    return this.getPage(id)?.innerHTML ?? null;
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

  addPage(id: Id, content?: string): Element {
    const page = document.createElement(PAGE_TAG);
    page.id = id;
    if (content) {
      // Once browser support is better, replace this with the HTML Sanitizer API
      // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API
      const sanitizedContent = DOMPurify.sanitize(content, {
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: () => true,
          attributeNameCheck: () => true,
          allowCustomizedBuiltInElements: false,
        },
      });
      page.innerHTML = sanitizedContent;
    }
    (this.host as LitElementWw).appendChild(page);
    this.notify();
    return page;
  }

  duplicatePage(fromId: Id, toId: Id): Element | null {
    const source = this.getPage(fromId);
    if (!source) return null;
    const clone = source.cloneNode(true) as Element;
    clone.id = toId;
    (this.host as LitElementWw).appendChild(clone);
    this.notify();
    return clone;
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
