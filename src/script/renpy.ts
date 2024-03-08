import { type Character } from "./types";

export const INDENT = " ".repeat(4);

export const toAttribute = (text: string) => text.toLowerCase();

export const toTag = (text: string) => text.toLowerCase();

export const toLabelVar = (text: string) => toVarName(text, "label");

export const toRenpyString = (text: string) => JSON.stringify(text);

export const toBareword = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z\d]/g, "X");

export const toVarName = (text: string, prefix: string): string =>
  `${prefix}_` + toBareword(text);

export function toCharacter(speaker: string): Character {
  const tag = toBareword(speaker);
  const charVar = toVarName("chr", tag);
  const nameVar = toVarName("name", charVar);

  return { tag, charVar, nameVar, id: charVar };
}
