import type { docs_v1 } from "googleapis";

import type { Statement } from "./statements";

import { parsers, type ParserArgs } from "./parsers";

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
    attributesByTag: Map<string, Set<string>>;
  };
};

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
      attributesByTag: new Map(),
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

    const args: ParserArgs = {
      line,
      level: getBulletLevel(p),
      index: statementIndex++,
      isBullet: !!p.bullet,
      headingLevel: getHeadingLevel(p),
    };

    let found = false;
    for (const parse of parsers) {
      const lineInfo: LineInfo = {
        level: args.level,
        line: args.line,
        parser: parse.name,
      };

      let statement: Statement | null = null;
      try {
        statement = parse(args);
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

  const attributesByTag = script.metadata.attributesByTag;
  for (const { statement } of script.body) {
    if ("tag" in statement && "attributes" in statement) {
      const attribs = attributesByTag.get(statement.tag) ?? new Set();
      for (const a of statement.attributes) {
        attribs.add(a);
      }

      attributesByTag.set(statement.tag, attribs);
    }
  }

  return script;
}
