import type { docs_v1 } from "googleapis";

export class ParseError extends Error {}

export type Document = docs_v1.Schema$Document;
export type Paragraph = docs_v1.Schema$Paragraph;

export type Character = {
  id: string;
  tag: string;
  charVar: string;
  nameVar: string;
};
