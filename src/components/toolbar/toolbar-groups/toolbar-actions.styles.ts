import { css } from "lit";

export const actionsStyles = css`
  :host {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sl-spacing-x-small);
    color: var(--sl-color-neutral-700);
  }

  sl-button-group::part(base) {
    flex-wrap: wrap;
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

  sl-menu-item::part(base) {
    align-items: center;
  }

  .preview {
    display: block;
    flex: none;
    height: 1.5em;
    width: 1.5em;
  }

  sl-menu-item .preview {
    margin-right: var(--sl-spacing-x-small);
  }

  .color-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1em;
  }

  .color-preview sl-icon {
    height: 1.25em;
    width: 1.25em;
  }

  .color-bar {
    width: 1.25em;
    height: 0.25em;
    border-radius: var(--sl-border-radius-small);
  }

  .color-bar.border {
    box-shadow: inset 0 0 0 1px var(--sl-color-neutral-300);
  }

  sl-menu.colors {
    padding: 0;
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

  sl-range {
    margin: 0 var(--sl-spacing-medium);
  }
`;
