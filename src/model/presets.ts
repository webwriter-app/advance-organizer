import { msg } from "@lit/localize";
import { NodePresetId, NodeStyle } from "./types";

export type PresetStyle = Required<Omit<NodeStyle, "preset">>;

export interface NodePreset {
  readonly id: NodePresetId;
  readonly style: PresetStyle;
}

export const NODE_PRESETS: readonly NodePreset[] = [
  {
    id: "main-topic",
    style: {
      shape: "rectangle",
      fill: "#e2e8f0",
      stroke: "#334155",
      strokeWidth: 3,
      strokeStyle: "solid",
    },
  },
  {
    id: "subtopic",
    style: {
      shape: "rectangle",
      fill: "#f8fafc",
      stroke: "#64748b",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "detail",
    style: {
      shape: "rectangle",
      fill: "#ffffff",
      stroke: "#94a3b8",
      strokeWidth: 1,
      strokeStyle: "dashed",
    },
  },
  {
    id: "term",
    style: {
      shape: "ellipse",
      fill: "#ffffff",
      stroke: "#475569",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-a",
    style: {
      shape: "rectangle",
      fill: "#e0f2fe",
      stroke: "#0284c7",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-b",
    style: {
      shape: "rectangle",
      fill: "#d1fae5",
      stroke: "#059669",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-c",
    style: {
      shape: "rectangle",
      fill: "#fef3c7",
      stroke: "#d97706",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-d",
    style: {
      shape: "rectangle",
      fill: "#ede9fe",
      stroke: "#7c3aed",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-e",
    style: {
      shape: "rectangle",
      fill: "#ffe4e6",
      stroke: "#e11d48",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
];

export const DEFAULT_PRESET: NodePresetId = "topic-a";

export function presetStyle(id: NodePresetId): NodeStyle {
  const preset = NODE_PRESETS.find((candidate) => candidate.id === id);
  return { ...(preset ?? NODE_PRESETS[0]!).style, preset: id };
}

export function presetLabel(id: NodePresetId): string {
  switch (id) {
    case "main-topic":
      return msg("Main topic");
    case "subtopic":
      return msg("Subtopic");
    case "detail":
      return msg("Detail");
    case "term":
      return msg("Term");
    case "topic-a":
      return msg("Topic A");
    case "topic-b":
      return msg("Topic B");
    case "topic-c":
      return msg("Topic C");
    case "topic-d":
      return msg("Topic D");
    case "topic-e":
      return msg("Topic E");
  }
}
