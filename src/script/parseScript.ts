import type { docs_v1 } from "googleapis";

import { isTimelineStart, type Statement } from "./statements";

import { parsers } from "./parsers";

import { ParseError } from "./types";

export type Document = docs_v1.Schema$Document;
export type Paragraph = docs_v1.Schema$Paragraph;

export type LineInfo = {
  level: number;
  line: string;
  parser: string;
};

export type ParsedScript = {
  errors: {
    error: string;
    lineInfo?: LineInfo;
  }[];
  body: {
    statement: Statement;
    lineInfo: LineInfo;
  }[];
  metadata: {
    attributesByTag: Record<string, string[]>;
    timelines: Record<string, string>;
  };
};

function tokenize(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  const tokens = [""];
  for (const chr of text.split("")) {
    if (/[\W]/.test(chr)) {
      tokens.push(chr);
      tokens.push("");
    } else {
      tokens[tokens.length - 1] += chr;
    }
  }

  return tokens.filter((tok) => tok !== "");
}

function getText(p: Paragraph) {
  return p.elements
    ?.flatMap((element) => element?.textRun?.content?.trim() ?? [])
    .join(" ");
}

function getBulletLevel(p: Paragraph) {
  if (!p.bullet) {
    return 0;
  }

  return (p.bullet.nestingLevel ?? 0) + 1;
}

function getHeadingLevel(p: Paragraph) {
  const headingType = p.paragraphStyle?.namedStyleType;

  if (!headingType) {
    return null;
  }

  const m = headingType.match(/HEADING_(\d+)/);
  if (!m) {
    return null;
  }

  return Number(m[1]);
}

export function parseScript(doc: Document): ParsedScript {
  const timelinesHeader = "Timelines";

  const script: ParsedScript = {
    errors: [],
    body: [],
    metadata: {
      attributesByTag: {},
    },
  };

  const content = doc.body?.content;
  if (!content) {
    script.errors.push({ error: "No content found in document" });

    return script;
  }

  const paragraphs = content.flatMap((element) => element.paragraph ?? []);

  const timelinesStartAt = paragraphs.findIndex((p) => {
    return getHeadingLevel(p) === 1 && getText(p) === timelinesHeader;
  });

  let statementIndex = 0;
  for (const p of paragraphs.slice(timelinesStartAt)) {
    const line = getText(p)?.replace(/\s+/g, " ").trim();
    if (!line) {
      continue;
    }

    const args = {
      line,
      level: getBulletLevel(p),
      index: statementIndex++,
      isBullet: !!p.bullet,
      headingLevel: getHeadingLevel(p),
    };

    const tokens = tokenize(line);

    let found = false;
    for (const parse of parsers) {
      const lineInfo: LineInfo = {
        level: args.level,
        line: args.line,
        parser: parse.name,
      };

      let statement: Statement | null = null;
      try {
        statement = parse({
          ...args,
          tokens: [...tokens],
        });
      } catch (e) {
        if (e instanceof ParseError) {
          script.errors.push({
            lineInfo,
            error: e.message,
          });
        } else {
          throw e;
        }
      }

      if (!statement) {
        continue;
      }

      script.body.push({
        lineInfo,
        statement,
      });

      found = true;
      break;
    }

    if (!found) {
      script.errors.push({
        error: "Statement type could not be determined.",
        lineInfo: {
          level: args.level,
          line: args.line,
          parser: "unknown",
        },
      });
    }
  }

  const attributesByTag: Record<string, string[]> = {};
  const timelines: Record<string, string> = {};

  for (const { statement } of script.body) {
    if ("tag" in statement && "attributes" in statement) {
      const tag = statement.tag;
      const attribs = new Set<string>([
        ...statement.attributes,
        ...(attributesByTag[tag] ?? []),
      ]);

      attributesByTag[tag] = [...attribs];
    }

    if (isTimelineStart(statement)) {
      timelines[statement.label] = statement.title;
    }
  }

  script.metadata = {
    timelines: timelines,
    attributesByTag: attributesByTag,
  };

  return script;
}
