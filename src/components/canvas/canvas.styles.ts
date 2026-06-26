import { css } from "lit";

export const canvasStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 600px;
  }

  svg:focus {
    outline: none;
  }

  svg:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .label-fo {
    overflow: visible;
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
`;
