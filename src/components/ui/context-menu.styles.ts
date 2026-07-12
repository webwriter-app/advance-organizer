import { css } from "lit";

export const contextMenuStyles = css`
  #delete:not(:focus-visible)::part(base) {
    color: var(--sl-color-danger-600);
  }

  sl-menu-item::part(checked-icon) {
    width: 1em;
  }
`;
