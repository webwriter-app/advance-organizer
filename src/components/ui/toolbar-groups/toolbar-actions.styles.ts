import { css } from "lit";

export const actionsStyles = css`
  :host {
    display: flex;
    align-items: center;
    gap: var(--sl-spacing-x-small);
    color: var(--sl-color-neutral-700);
  }

  sl-tooltip {
    /* Fix dropdown position when using button with tooltip as dropdown trigger
       See https://github.com/shoelace-style/shoelace/discussions/1961 */
    display: inline-block;
  }

  sl-button::part(label) {
    display: flex;
    align-items: center;
  }

  sl-icon {
    height: 1.5em;
    width: 1.5em;
  }

  sl-button.active::part(base) {
    background-color: var(--sl-color-neutral-200);
    color: var(--sl-color-neutral-1000);
  }

  p {
    margin: 0;
    margin-left: var(--sl-spacing-x-small);
    font-weight: bold;
    font-size: var(--sl-font-size-medium);

    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
