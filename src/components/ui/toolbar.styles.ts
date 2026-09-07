import { css } from "lit";

export const toolbarStyles = css`
  :host {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: var(--sl-spacing-x-small);
    gap: var(--sl-spacing-x-small);
    border-bottom: 1px solid var(--sl-color-neutral-300);
  }
`;
