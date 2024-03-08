import { type Character } from "./types";

export type ToCodeArgs = {
  timelineLabels: string[];
  characters: Character[];
  firstTimeline?: string;
  statements: Statement[];
};

export type CodeGenerator = {
  kind: string;
  toCode: (args: ToCodeArgs) => string;
  topLevel?: boolean;
};

export type Comment = {
  kind: "comment";
  text: string;
} & CodeGenerator;

export type BranchItem = {
  kind: "branch-item";
  option: string;
} & CodeGenerator;

export type TimelineStart = {
  kind: "timeline-label";
  title: string;
  label: string;
} & CodeGenerator;

export type TimelinesStart = {
  kind: "start";
} & CodeGenerator;

export type SceneStatement = {
  kind: "scene";
  tag: string;
  attributes: string[];
} & CodeGenerator;

export type InputStatement = {
  kind: "input";
  variable: string;
  prompt: string;
} & CodeGenerator;

export type NumericAssignment = {
  kind: "numeric-assignment";
  variable: string;
  value: number;
  operator?: string;
} & CodeGenerator;

export type JumpStatement = {
  kind: "jump";
  destination: string;
} & CodeGenerator;

export type BranchStart = {
  kind: "branch-start";
  index: number;
  label: string;
} & CodeGenerator;

export type ShowStatement = {
  kind: "show";
  tag: string;
  attributes: string[];
} & CodeGenerator;

export type SayStatement = {
  character?: Character;
  kind: "say";
  alias?: string;
  text: string;
  action?: string;
  attributes: string[];
} & CodeGenerator;

export type RepeatBranchStatement = {
  kind: "repeat-branch";
} & CodeGenerator;

export type Statement =
  | Comment
  | BranchItem
  | TimelineStart
  | TimelinesStart
  | SceneStatement
  | NumericAssignment
  | JumpStatement
  | BranchStart
  | ShowStatement
  | SayStatement
  | RepeatBranchStatement
  | InputStatement;

export const isNumericAssignment = (
  statement: Statement,
): statement is NumericAssignment => statement.kind === "numeric-assignment";

export const isSayStatement = (
  statement: Statement,
): statement is SayStatement => statement.kind === "say";

export const isTimelineStart = (
  statement: Statement,
): statement is TimelineStart => statement.kind === "timeline-label";

export const isBranchStart = (statement: Statement): statement is BranchStart =>
  statement.kind === "branch-start";
