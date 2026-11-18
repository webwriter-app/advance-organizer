import type { OutlineItem } from "../../model/outline";

/** Reads a (nested) `ul` or `ol`; an item's text is its own text without the nested list. */
export function outlineFromList(list: Element): OutlineItem[] {
  return Array.from(list.children)
    .filter((child) => child.localName === "li")
    .map((item) => {
      let text = "";
      let nested: OutlineItem[] = [];
      for (const child of item.childNodes) {
        if (child instanceof Element && (child.localName === "ul" || child.localName === "ol")) {
          nested = nested.concat(outlineFromList(child));
        } else {
          text += child.textContent ?? "";
        }
      }
      return { text: text.replace(/\s+/g, " ").trim(), children: nested };
    });
}

export function listFromOutline(items: readonly OutlineItem[]): HTMLUListElement {
  const list = document.createElement("ul");
  for (const item of items) {
    const li = document.createElement("li");
    li.append(item.text);
    if (item.children.length) li.append(listFromOutline(item.children));
    list.append(li);
  }
  return list;
}
