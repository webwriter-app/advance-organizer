import { css } from "lit";

export const colorPickerStyles = css`
  :host {
    --swatch-size: 1.5em;
    --swatch-padding: var(--sl-spacing-x-small);

    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    /* Two rows of five swatches. */
    max-width: calc(5 * (var(--swatch-size) + 2 * var(--swatch-padding)));
  }

  button {
    display: flex;
    border: none;
    background: none;
    /* Buttons do not inherit the host font size, so the em sizes would not match. */
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
