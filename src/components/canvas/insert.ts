import { Bounds, Dimension, Id, Node, NodeStyle, Point } from "../../model/types";
import { DEFAULT_PRESET, presetStyle } from "../../model/presets";
import type { DocumentController } from "../../state/document";
import type { PageController } from "../../state/page";
import type { SelectionController } from "../../state/selection";
import { ClipboardPayload } from "../../utils/clipboard";
import {
  displayDimension,
  importImage,
  pickImageFiles,
} from "../../utils/image-import";
import { INSERT_GAP } from "./helper";
import { msg } from "@lit/localize";

export interface CanvasStores {
  doc: DocumentController;
  selection: SelectionController;
  pages: PageController;
}

export type ItemStores = Pick<CanvasStores, "doc" | "selection">;

const NEW_NODE_DIMENSION: Dimension = { width: 160, height: 80 };
const NEW_NODE_STYLE: NodeStyle = presetStyle(DEFAULT_PRESET);

export function insertNode(position: Point, stores: ItemStores): Node {
  const node = stores.doc.addNode({
    dimension: NEW_NODE_DIMENSION,
    label: { text: msg("New node") },
    position: stores.doc.freePosition(position),
    style: NEW_NODE_STYLE,
  });
  stores.selection.select(new Set<Id>([node.id]));
  return node;
}

export function insertPayload(
  payload: ClipboardPayload,
  stores: CanvasStores,
  viewport?: Bounds | null,
): void {
  const { newIds, nodeIdMap } = stores.doc.insertItems(payload, viewport);

  for (const [oldId, newId] of nodeIdMap) {
    const content = payload.pages[oldId];
    if (content) stores.pages.addPage(newId, content);
  }

  stores.selection.select(newIds);
}

export function duplicateSelection(stores: CanvasStores): void {
  const { newIds, nodeIdMap } = stores.doc.duplicateItems(
    new Set(stores.selection.entries),
  );

  for (const [oldId, newId] of nodeIdMap) {
    stores.pages.duplicatePage(oldId, newId);
  }

  stores.selection.select(newIds);
}

export async function insertImages(
  files: File[],
  position: Point,
  stores: ItemStores,
): Promise<void> {
  const inserted = new Set<Id>();
  let offset = 0;

  for (const file of files) {
    try {
      const imported = await importImage(file);
      const image = stores.doc.addImage({
        dimension: displayDimension(imported),
        position: { x: position.x + offset, y: position.y + offset },
        src: imported.src,
      });
      inserted.add(image.id);
      offset += INSERT_GAP;
    } catch (error) {
      console.error(`Could not insert ${file.name}`, error);
    }
  }

  if (inserted.size > 0) stores.selection.select(inserted);
}

export async function pickAndInsertImages(
  position: Point,
  stores: ItemStores,
): Promise<void> {
  const files = await pickImageFiles();
  if (files.length === 0) return;
  await insertImages(files, position, stores);
}
