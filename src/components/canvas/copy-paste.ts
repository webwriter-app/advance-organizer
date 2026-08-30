import { Bounds, Id, Point } from "../../model/types";
import {
  ClipboardAction,
  ClipboardContent,
  ClipboardPayload,
  createPayload,
  readClipboard,
  readPayload,
  writePayload,
  writePayloadToClipboard,
} from "../../utils/clipboard";
import { filterImageFiles } from "../../utils/image-import";
import { CanvasStores, insertImages, insertPayload } from "./insert";

export interface ClipboardHost extends CanvasStores {
  readonly editingId: Id | null;
}

export function selectionPayload(
  stores: ClipboardHost,
): ClipboardPayload | null {
  if (stores.editingId) return null;

  const items = stores.doc.collectItems(stores.selection.entries);
  if (items.nodes.length === 0 && items.images.length === 0) return null;

  const pages: Record<Id, string> = {};
  for (const node of items.nodes) {
    const content = stores.pages.getPageContent(node.id);
    if (content) pages[node.id] = content;
  }

  return createPayload({ ...items, pages });
}

export function copySelection(
  e: ClipboardEvent,
  stores: ClipboardHost,
): boolean {
  const payload = selectionPayload(stores);
  if (!payload || !e.clipboardData) return false;

  e.preventDefault();
  writePayload(e.clipboardData, payload);
  return true;
}

export function cutSelection(e: ClipboardEvent, stores: ClipboardHost): void {
  if (!copySelection(e, stores)) return;
  stores.doc.removeItems(new Set(stores.selection.entries));
}

export function pasteFromEvent(
  e: ClipboardEvent,
  viewport: Bounds | null,
  stores: ClipboardHost,
): void {
  if (stores.editingId) return;

  const payload = readPayload(e.clipboardData);
  if (payload) {
    e.preventDefault();
    insertPayload(payload, stores, viewport);
    return;
  }

  const files = filterImageFiles(e.clipboardData?.files);
  if (files.length === 0) return;
  e.preventDefault();
  insertImages(files, dropPosition(viewport), stores);
}

function dropPosition(viewport: Bounds | null): Point {
  return viewport?.position ?? { x: 0, y: 0 };
}

export async function runClipboardAction(
  action: ClipboardAction,
  viewport: Bounds | null,
  stores: ClipboardHost,
): Promise<void> {
  if (stores.editingId) return;

  if (action === "paste") {
    await pasteFromClipboard(viewport, stores);
    return;
  }

  const payload = selectionPayload(stores);
  if (!payload) return;

  try {
    await writePayloadToClipboard(payload);
  } catch (error) {
    console.error("Could not write to the clipboard", error);
    return;
  }

  if (action === "cut") {
    stores.doc.removeItems(new Set(stores.selection.entries));
  }
}

async function pasteFromClipboard(
  viewport: Bounds | null,
  stores: ClipboardHost,
): Promise<void> {
  let content: ClipboardContent;
  try {
    content = await readClipboard();
  } catch (error) {
    console.error("Could not read the clipboard", error);
    return;
  }

  if (content.payload) {
    insertPayload(content.payload, stores, viewport);
  } else if (content.images.length > 0) {
    await insertImages(content.images, dropPosition(viewport), stores);
  }
}
