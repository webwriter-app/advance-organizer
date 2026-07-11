import { css } from "lit";

export const dragOverlayStyles = css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    inset: 0;
    background-color: var(
      --sl-color-primary-800
    ); /* fallback for old browsers */
    background-color: color-mix(
      in srgb,
      var(--sl-color-primary-800) 80%,
      transparent
    );
    color: var(--sl-color-neutral-0);
    font-size: var(--sl-font-size-large);
    user-select: none;
    pointer-events: none;
    border-radius: 0 0 var(--sl-border-radius-small)
      var(--sl-border-radius-small);

    animation: ao-drag-overlay-enter 200ms ease both;
  }

  @keyframes ao-drag-overlay-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  div {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  .drag-overlay {
    padding: var(--sl-spacing-3x-large);
  }

  .border {
    flex-direction: column;
    gap: var(--sl-spacing-medium);
    border: 8px dashed var(--sl-color-neutral-0);
    border-radius: var(--sl-border-radius-x-large);

    font-weight: var(--sl-font-weight-bold);
    font-size: var(--sl-font-size-x-large);
  }

  sl-icon {
    font-size: 3rem;
  }
`;
