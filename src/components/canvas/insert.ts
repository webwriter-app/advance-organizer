import { Id, Point } from "../../model/types";
import type { DocumentController } from "../../state/document";
import type { PageController } from "../../state/page";
import type { SelectionController } from "../../state/selection";
import { ClipboardPayload } from "../../utils/clipboard";
import { displayDimension, importImage } from "../../utils/image-import";
import { INSERT_GAP } from "./helper";

export interface CanvasStores {
  doc: DocumentController;
  selection: SelectionController;
  pages: PageController;
}

export function insertPayload(
  payload: ClipboardPayload,
  stores: CanvasStores,
): void {
  const { newIds, nodeIdMap } = stores.doc.insertItems(payload);

  for (const [oldId, newId] of nodeIdMap) {
    const content = payload.pages[oldId];
    if (content) stores.pages.addPage(newId, content);
  }

  stores.selection.select(newIds);
}

export async function insertImages(
  files: File[],
  position: Point,
  stores: CanvasStores,
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
