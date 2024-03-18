import pathlib from "path";

export type LayerInfo = {
  category: string;
  attribute: string;
  name: string;
  path: string;
};

export type Result<T> =
  | { success: false; error: string }
  | { success: true; data: T };

export function isValidName(name: string) {
  return !!parseName(name);
}

export function parseName(name: string) {
  const [, category, attribute] = /^(.*?)\s+-\s+(.*)$/.exec(name) ?? [];

  if (!category || !attribute) {
    return null;
  }

  return { category, attribute };
}

export function parsePath(path: string) {
  const name = pathlib.basename(path, pathlib.extname(path));
  const parseResult = parseName(name);
  if (parseResult === null) {
    throw new Error(`Unable to parse name. Got ${name}`);
  }

  return { ...parseResult, path, name };
}
