export const INDENT = " ".repeat(4);

export const toCharacterVar = (text: string) => toVarName(text, "chr");

export const toCharacterNameVar = (text: string) =>
  toCharacterVar(text) + "_name";

export const toLabelVar = (text: string) => toVarName(text, "label");

export const toRenpyString = (text: string) => JSON.stringify(text);

export const toVarName = (text: string, prefix: string): string =>
  `${prefix}_` +
  text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z\d]/g, "X");
