import { css } from "lit";

export const canvasStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 600px;
  }

  :host(.resizing),
  :host(.resizing) * {
    cursor: var(--ao-resize-cursor, default) !important;
  }

  svg:focus {
    outline: none;
  }

  svg:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  ao-zoom-controls {
    z-index: 10;
  }

  ao-drag-overlay {
    z-index: 20;
  }

  .label-fo {
    overflow: visible;
    pointer-events: none;
  }

  .label-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .label-content {
    max-width: 100%;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: none;
  }

  .label-editor {
    outline: none;
    cursor: text;
    pointer-events: auto;
    user-select: text;
  }

  :host(:not([editable])) .node.has-page,
  .badge {
    cursor: pointer;
  }

  .edge .label-content {
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    padding: 2px 6px;
    pointer-events: auto;
  }
`;
