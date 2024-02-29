export const INDENT = " ".repeat(4);

export const toCharacterName = (text: string) => toVarName(text, "chr");

export const toLabelName = (text: string) => toVarName(text, "label");

export const toRenpyString = (text: string) => JSON.stringify(text);

export const toVarName = (text: string, prefix: string): string =>
  `${prefix}_` +
  text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z\d]/g, "X");
