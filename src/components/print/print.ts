import { html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { Id, Node } from "../../model/types";
import { DocumentController } from "../../state/document";
import { PageController } from "../../state/page";
import { renderArrowMarker, renderEdge } from "../canvas/edge";
import { computeBounds } from "../canvas/helper";
import { renderImage } from "../canvas/image";
import { getBadgeColors, renderNode } from "../canvas/node";

const PRINT_PADDING = 32;

export interface PrintEntry {
  readonly node: Node;
  readonly number: number;
}

/**
 * Get all nodes that have a linked page, sorted by their position on the canvas (top to bottom, left to right).
 */
export function getPrintEntries(
  doc: DocumentController,
  pages: PageController,
): PrintEntry[] {
  return doc.nodes
    .filter((node) => pages.hasPage(node.id))
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    .map((node, index) => ({ node, number: index + 1 }));
}

/**
 * The organizer as a static SVG. Badges show the page number instead of the icon.
 */
export function renderPrintOrganizer(
  doc: DocumentController,
  entries: readonly PrintEntry[],
): TemplateResult | typeof nothing {
  const bounds = computeBounds([...doc.nodes, ...doc.images]);
  if (!bounds) return nothing;

  const numbers = new Map(entries.map((e) => [e.node.id, e.number]));
  const { position, dimension } = bounds;
  const viewBox = [
    position.x - dimension.width / 2 - PRINT_PADDING,
    position.y - dimension.height / 2 - PRINT_PADDING,
    dimension.width + 2 * PRINT_PADDING,
    dimension.height + 2 * PRINT_PADDING,
  ].join(" ");

  return html`<svg class="print-organizer" viewBox=${viewBox}>
    ${renderArrowMarker()}
    <g class="images">${doc.images.map((img) => renderImage(img))}</g>
    <g class="edges">${doc.edges.map((e) => renderEdge(e, doc))}</g>
    <g class="nodes">
      ${doc.nodes.map((n) =>
        renderNode(n, numbers.has(n.id), false, numbers.get(n.id)),
      )}
    </g>
  </svg>`;
}

/**
 * The linked pages in the order of their numbers.
 * When editing, only the open page is shown, when printing, all of them are.
 */
export function renderPages(
  entries: readonly PrintEntry[],
  openPageId: Id | null,
): TemplateResult {
  return html`<div class="page-container${openPageId === null ? "" : " open"}">
    ${entries.map(({ node, number }) => {
      const { badge, icon } = getBadgeColors(node.style);
      return html`<section class="page${node.id === openPageId ? " open" : ""}">
        <header class="page-header">
          <span
            class="page-number"
            style=${styleMap({ backgroundColor: badge, color: icon })}
            >${number}</span
          >
          <span class="page-label">${node.label.text}</span>
        </header>
        <slot data-page=${node.id}></slot>
      </section>`;
    })}
  </div>`;
}
