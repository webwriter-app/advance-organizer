import { ReactiveControllerHost } from "lit";
import { countImageItems, filterImageFiles } from "../../utils/image-import";
import { CanvasStores, insertImages } from "./insert";
import { ZoomController } from "./zoom";

export class DropController {
  private _imageCount: number | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & CanvasStores,
    private readonly zoom: ZoomController,
  ) {}

  get imageCount(): number | null {
    return this._imageCount;
  }

  private _setImageCount(imageCount: number | null): void {
    if (this._imageCount === imageCount) return;
    this._imageCount = imageCount;
    this.host.requestUpdate();
  }

  onDragOver = (e: DragEvent): void => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    const imageCount = countImageItems(e.dataTransfer.items);
    if (imageCount === 0) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    this._setImageCount(imageCount);
  };

  onDragLeave = (e: DragEvent): void => {
    const target = e.currentTarget as Element;
    const related = e.relatedTarget as Element | null;
    if (related && target.contains(related)) return;
    this._setImageCount(null);
  };

  onDrop = (e: DragEvent): void => {
    this._setImageCount(null);
    const files = filterImageFiles(e.dataTransfer?.files);
    e.preventDefault();
    e.stopPropagation();
    if (files.length === 0) return;
    insertImages(
      files,
      this.zoom.clientToScene(e.clientX, e.clientY),
      this.host,
    );
  };
}
