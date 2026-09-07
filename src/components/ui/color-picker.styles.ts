import { css } from "lit";

export const colorPickerStyles = css`
  :host {
    --swatch-size: 1.5em;
    --swatch-padding: var(--sl-spacing-x-small);

    display: grid;
    grid-template-columns: repeat(5, max-content);
    justify-content: center;
    width: max-content;
    padding: var(--swatch-padding);
  }

  button {
    display: flex;
    border: none;
    background: none;
    font-size: inherit;
    margin: 0;
    padding: var(--swatch-padding);
    border-radius: var(--sl-border-radius-medium);
    cursor: pointer;
  }

  button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: calc(-1 * var(--sl-focus-ring-width));
  }

  .swatch {
    width: var(--swatch-size);
    height: var(--swatch-size);
    border-radius: var(--sl-border-radius-circle);
  }

  .current .swatch {
    outline: 4px solid var(--sl-color-primary-200);
  }

  .swatch.pale {
    box-shadow: inset 0 0 0 1px var(--sl-color-neutral-300);
  }
`;
