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
      fill: "#e4e4e7",
      stroke: "#131316",
      strokeWidth: 3,
      strokeStyle: "solid",
    },
  },
  {
    id: "subtopic",
    style: {
      shape: "ellipse",
      fill: "#cffafe",
      stroke: "#0891b2",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "detail",
    style: {
      shape: "rectangle",
      fill: "#ffffff",
      stroke: "#131316",
      strokeWidth: 1,
      strokeStyle: "dotted",
    },
  },
  {
    id: "term",
    style: {
      shape: "diamond",
      fill: "#fef9c3",
      stroke: "#ea580c",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-a",
    style: {
      shape: "rectangle",
      fill: "#dbeafe",
      stroke: "#2563eb",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-b",
    style: {
      shape: "rectangle",
      fill: "#dcfce7",
      stroke: "#16a34a",
      strokeWidth: 2,
      strokeStyle: "solid",
    },
  },
  {
    id: "topic-c",
    style: {
      shape: "rectangle",
      fill: "#ffedd5",
      stroke: "#ea580c",
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
      fill: "#fce7f3",
      stroke: "#db2777",
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
