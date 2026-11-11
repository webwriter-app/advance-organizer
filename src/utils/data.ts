const selector = ':scope > script[type="application/json"][slot="data"]:not([src])';

export function readData<T>(host: HTMLElement): Partial<T> {
  const text = host.querySelector(selector)?.textContent;
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function stableJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? "null" : stableJSON(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJSON(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function writeData<T extends object>(host: HTMLElement, value: T) {
  const current = host.querySelector(selector);
  let next: Record<string, unknown> = value;
  if (current) {
    try {
      const existing = JSON.parse(current.textContent ?? "");
      if (existing && typeof existing === "object" && !Array.isArray(existing)) {
        next = { ...existing, ...value };
      }
      if (stableJSON(existing) === stableJSON(next)) return;
    } catch {
      // Replace invalid data with the current valid authored state.
    }
  }
  const text = JSON.stringify(next).replace(/</g, "\\u003c");
  const block = current ?? host.ownerDocument.createElement("script");
  if (!current) {
    block.setAttribute("type", "application/json");
    block.setAttribute("slot", "data");
  }
  block.textContent = text;
  if (!current) host.append(block);
}
