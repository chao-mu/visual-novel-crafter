import type { ParsedScript } from "./parseScript";
import { INDENT } from "./renpy";

import { type ToCodeArgs, isSayStatement, isTimelineStart } from "./statements";

export const scriptToCode = (script: ParsedScript): string => {
  const characters = new Set<string>();
  for (const { statement } of script.body) {
    if (isSayStatement(statement)) {
      characters.add(statement.characterVarName);
    }
  }

  const characterDefs = [...characters]
    .map((c) => `define ${c} = Character("${c}")`)
    .join("\n");

  const timelineLabels = script.body.flatMap(({ statement }) => {
    if (isTimelineStart(statement)) {
      return statement.label;
    }

    return [];
  });

  const toCodeArgs: ToCodeArgs = {
    statements: script.body.map(({ statement }) => statement),
    characters: [...characters],
    timelineLabels,
    firstTimeline: timelineLabels[0],
  };

  const attributesByTag = new Map<string, Set<string>>();
  for (const { statement } of script.body) {
    if ("tag" in statement && "attributes" in statement) {
      const attribs = attributesByTag.get(statement.tag) ?? new Set();
      for (const a of statement.attributes) {
        attribs.add(a);
      }

      attributesByTag.set(statement.tag, attribs);
    }
  }

  const body = script.body
    .flatMap(({ statement, lineInfo }) => {
      const indentLevel = statement.topLevel ? 0 : lineInfo.level + 1;
      const indent = INDENT.repeat(indentLevel);

      return [
        indent + "# " + JSON.stringify(lineInfo),
        indent + "# " + JSON.stringify(statement),
        statement
          .toCode(toCodeArgs)
          .split("\n")
          .map((l) => indent + l)
          .join("\n"),
      ];
    })
    .join("\n");

  return [characterDefs, body].join("\n\n");
};
