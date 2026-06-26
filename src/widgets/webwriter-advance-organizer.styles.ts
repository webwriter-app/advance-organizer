import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    position: relative;

    border: 1px solid var(--sl-color-neutral-300);
    border-radius: var(--sl-border-radius-medium);
    box-sizing: border-box;
  }

  .context-menu-backdrop {
    position: absolute;
    inset: 0;
    z-index: 1000;
  }

  .context-menu-backdrop ww-context-menu {
    position: absolute;
  }

  .page-container {
    height: 600px;
    padding: var(--sl-spacing-medium);
    padding-bottom: 0;
    box-sizing: border-box;
    background-color: var(--sl-color-gray-100);
    overflow: auto;

    animation: ao-view-enter 200ms ease both;
  }

  .page-container slot {
    background-color: white;
    display: block;
    min-height: 100%;
    padding: var(--sl-spacing-medium);
    border: 1px solid var(--sl-color-gray-300);
    border-bottom: none;
    border-radius: var(--sl-border-radius-medium) var(--sl-border-radius-medium)
      0 0;
    box-sizing: border-box;

    animation: ao-page-slot-enter 200ms ease both;
  }

  ao-canvas {
    animation: ao-view-enter 200ms ease both;
  }

  @keyframes ao-page-slot-enter {
    from {
      transform: scale(0.985) translateY(5px);
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
    .page-container,
    .page-container slot {
      animation: none;
    }
  }

  .spacer {
    flex: 1;
  }
`;
