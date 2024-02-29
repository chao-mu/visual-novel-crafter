export type ToCodeArgs = {
  timelineLabels: string[];
  characters: string[];
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

export type MenuItem = {
  kind: "menu-item";
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

export type Assignment = {
  kind: "assignment";
  variable: string;
  value: string;
  operator?: string;
} & CodeGenerator;

export type JumpStatement = {
  kind: "jump";
  destination: string;
} & CodeGenerator;

export type MenuStart = {
  kind: "menu-start";
  index: number;
  label: string;
} & CodeGenerator;

export type ShowStatement = {
  kind: "show";
  tag: string;
  attributes: string[];
} & CodeGenerator;

export type SayStatement = {
  kind: "say";
  speaker: string;
  alias?: string;
  text: string;
  action?: string;
  attributes: string[];
  characterVar: string;
} & CodeGenerator;

export type RepeatMenuStatement = {
  kind: "repeat-menu";
} & CodeGenerator;

export type Statement =
  | Comment
  | MenuItem
  | TimelineStart
  | TimelinesStart
  | SceneStatement
  | Assignment
  | JumpStatement
  | MenuStart
  | ShowStatement
  | SayStatement
  | RepeatMenuStatement
  | InputStatement;

export const isSayStatement = (
  statement: Statement,
): statement is SayStatement => statement.kind === "say";

export const isTimelineStart = (
  statement: Statement,
): statement is TimelineStart => statement.kind === "timeline-label";

export const isMenuStart = (statement: Statement): statement is MenuStart =>
  statement.kind === "menu-start";
