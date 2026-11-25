import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
    line-height: 1.5;
    color: var(--ww-text-color, inherit);
    font-family: var(--ww-font-family, inherit);
  }

  ::slotted(img),
  ::slotted(video),
  ::slotted(svg) {
    max-width: 100%;
    height: auto;
  }

  @media print {
    :host {
      outline: none !important;
    }
  }
`;
