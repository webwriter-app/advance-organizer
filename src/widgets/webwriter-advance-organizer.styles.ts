import { css } from "lit";

export const styles = css`
  :host {
    display: block;

    border: 1px solid var(--sl-color-neutral-300);
    border-radius: var(--sl-border-radius-medium);
    box-sizing: border-box;
  }

  .page-container {
    padding: 16px 16px 0 16px;
    box-sizing: border-box;
    background-color: var(--sl-color-gray-100);
  }

  .page-container slot {
    background-color: white;
    display: block;
    padding: 16px;
    border: 1px solid var(--sl-color-gray-300);
    border-bottom: none;
    border-radius: var(--sl-border-radius-medium) var(--sl-border-radius-medium)
      0 0;
  }
`;
