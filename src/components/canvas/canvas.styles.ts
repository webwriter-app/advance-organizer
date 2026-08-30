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

  .edge .label-content {
    pointer-events: auto;
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

  .touch-indicator rect {
    transform-box: fill-box;
    transform-origin: center;
    animation: ao-touch-indicator-in 200ms ease-out;
    transition:
      transform 100ms ease-out,
      opacity 100ms ease-out;
  }

  .touch-indicator.hidden rect {
    transform: scale(0.4);
    opacity: 0;
  }

  @keyframes ao-touch-indicator-in {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .touch-indicator rect {
      animation: none;
    }
  }
`;

export const labelStyles = css`
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

  .edge .label-content {
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    padding: 2px 6px;
  }
`;
