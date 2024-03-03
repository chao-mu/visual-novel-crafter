import type { ParsedScript } from "./parseScript";
import { INDENT } from "./renpy";

import { Character } from "./types";

import { type ToCodeArgs, isSayStatement, isTimelineStart } from "./statements";

const generateDefineChar = (c: Character) =>
  `define ${c.charVar} = Character("${c.nameVar}", image="${c.tag}")`;

export const scriptToCode = (script: ParsedScript): string => {
  const characters = new Map<string, Character>();
  for (const { statement } of script.body) {
    if (isSayStatement(statement) && statement.character) {
      const char = statement.character;
      characters.set(char.id, char);
    }
  }

  const characterDefs = [...characters.values()]
    .map((c) => generateDefineChar(c))
    .join("\n");

  const timelineLabels = script.body.flatMap(({ statement }) => {
    if (isTimelineStart(statement)) {
      return statement.label;
    }

    return [];
  });

  const toCodeArgs: ToCodeArgs = {
    statements: script.body.map(({ statement }) => statement),
    characters: [...characters.values()],
    timelineLabels,
    firstTimeline: timelineLabels[0],
  };

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
