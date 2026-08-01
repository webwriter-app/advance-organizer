import { css } from "lit";

export const contextMenuStyles = css`
  :host {
    position: absolute;
    inset: 0;
    z-index: 1000;
  }

  sl-popup::part(popup) {
    transform-origin: top left;

    animation: ao-context-menu-enter 120ms ease both;
  }

  sl-popup[data-current-placement$="-end"]::part(popup) {
    transform-origin: top right;
  }

  sl-popup[data-current-placement^="top"]::part(popup) {
    transform-origin: bottom left;
  }

  sl-popup[data-current-placement^="top"][data-current-placement$="-end"]::part(
      popup
    ) {
    transform-origin: bottom right;
  }

  @keyframes ao-context-menu-enter {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    sl-popup::part(popup) {
      animation: none;
    }
  }

  sl-menu {
    max-height: var(--auto-size-available-height, none);
    overflow-y: auto;
  }

  #delete:not(:focus-visible)::part(base) {
    color: var(--sl-color-danger-600);
  }

  sl-menu-item::part(checked-icon) {
    width: 1em;
  }

  .shortcut {
    margin-left: var(--sl-spacing-large);
    color: var(--sl-color-neutral-500);
    font-size: var(--sl-font-size-small);
  }
`;
