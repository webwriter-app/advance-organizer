import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    position: relative;
    overflow: hidden;

    border: 1px solid var(--sl-color-neutral-300);
    border-radius: var(--sl-border-radius-medium);
    box-sizing: border-box;
  }

  .root {
    display: flex;
    flex-direction: column;
  }

  .root.reading {
    height: 600px;
  }

  .root.reading ao-canvas,
  .root.reading .page-container {
    flex: 1 1 0;
    min-height: 0;
    height: auto;
  }

  .page-container {
    display: none;
    flex-direction: column;

    height: 600px;
    padding: var(--sl-spacing-medium);
    padding-bottom: 0;
    box-sizing: border-box;
    background-color: var(--sl-color-gray-100);
    overflow: auto;
  }

  .page-container.open {
    display: flex;
  }

  .page {
    display: none;
    flex-direction: column;
    flex: 1 0 auto;
  }

  .page.open {
    display: flex;
    animation: ao-view-enter 200ms ease both;
  }

  .page-header {
    display: none;
  }

  .page slot {
    background-color: white;
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
    padding: var(--sl-spacing-medium);
    border: 1px solid var(--sl-color-gray-300);
    border-bottom: none;
    border-radius: var(--sl-border-radius-medium) var(--sl-border-radius-medium)
      0 0;
    box-sizing: border-box;
  }

  .page ::slotted(*) {
    flex: 1 0 auto;
  }

  .page.open slot {
    animation: ao-page-slot-enter 200ms ease both;
  }

  ao-canvas {
    animation: ao-view-enter 200ms ease both;
  }

  @keyframes ao-page-slot-enter {
    from {
      transform: scale(0.985);
    }
    to {
      transform: none;
    }
  }

  @keyframes ao-view-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    ao-canvas,
    .page.open,
    .page.open slot {
      animation: none;
    }
  }

  .spacer {
    flex: 1;
  }

  ao-toolbar.page-view {
    flex-wrap: nowrap;
  }

  /* --- PRINT VIEW --- */

  .print-organizer {
    display: none;
  }

  @media print {
    :host {
      border-color: var(--sl-color-neutral-1000);
      outline: none !important;
      overflow: visible;
    }

    .root,
    .root.reading {
      display: block;
      height: auto;
    }

    ao-toolbar,
    ao-canvas,
    ao-context-menu {
      display: none;
    }

    .print-organizer {
      display: block;
      width: 100%;
      height: auto;
      max-height: 80vh;
      break-inside: avoid;
    }

    .page-container,
    .page-container.open,
    .page,
    .page.open {
      display: block;
      height: auto;
      padding: 0;
      overflow: visible;
      background: none;
      animation: none;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: var(--sl-spacing-small);
      border-top: 1px solid var(--sl-color-neutral-1000);
      padding: var(--sl-spacing-medium);

      break-inside: avoid;
      break-after: avoid;
    }

    .page-number {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 1.75em;
      height: 1.75em;
      border-radius: 50%;
      font-weight: bold;

      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .page-label {
      font-weight: bold;
    }

    .page slot {
      display: block;
      flex: none;
      border: none;
      border-radius: 0;
      padding-top: 0;
      background: none;
      animation: none;
    }
  }
`;
