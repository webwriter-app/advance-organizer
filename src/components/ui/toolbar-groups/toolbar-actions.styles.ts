import { css } from "lit";

export const actionsStyles = css`
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
`;
