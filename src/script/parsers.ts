import { ParseError, Character } from "./types";

import type {
  Statement,
  RepeatBranchStatement,
  Comment,
  BranchItem,
  TimelineStart,
  TimelinesStart,
  SceneStatement,
  InputStatement,
  NumericAssignment,
  JumpStatement,
  BranchStart,
  ShowStatement,
  SayStatement,
} from "./statements";

import { isBranchStart } from "./statements";

import {
  toRenpyString,
  toLabelVar,
  toCharacter,
  INDENT,
  toBareword,
} from "./renpy";

const supportedImageLocations = ["center", "left", "right"];

export type ParserArgs = {
  line: string;
  level: number;
  index: number;
  headingLevel: number | null;
  isBullet: boolean;
};

export type ParserFunc<T extends Statement> = (args: ParserArgs) => T | null;

function shiftN<T>(arr: T[], n?: number): T[] {
  if (!n) {
    n = arr.length;
  }

  const res: T[] = [];
  for (let i = 0; i < n; i++) {
    const el = arr.shift();
    if (el !== undefined) {
      res.push(el);
    }
  }

  return res;
}

const tokenizeBarewords = (text: string): string[] =>
  text.split(" ").map(toBareword);

const parseRepeatBranchStatement: ParserFunc<RepeatBranchStatement> = ({
  line,
  index,
}) => {
  if (line.toLowerCase() != "repeat branch") {
    return null;
  }

  return {
    kind: "repeat-branch",
    toCode: ({ statements }) => {
      const lastBranch = statements
        .reverse()
        .find((s) => isBranchStart(s) && s.index < index);

      if (!lastBranch || !isBranchStart(lastBranch)) {
        throw new ParseError("No previous branch found");
      }

      return `jump ${lastBranch.label}`;
    },
  };
};

const parseComment: ParserFunc<Comment> = ({ line }) => {
  if (!line.startsWith("[")) {
    return null;
  }

  const text = line;

  return {
    text,
    kind: "comment",
    toCode: () => `# ${text}`,
  };
};

const parseBranchItem: ParserFunc<BranchItem> = ({ line, level, isBullet }) => {
  if (!isBullet || level % 2 === 0) {
    return null;
  }

  const option = line;

  return {
    option,
    kind: "branch-item",

    toCode: () => toRenpyString(option) + ":",
  };
};

const parseTimelineStart: ParserFunc<TimelineStart> = ({
  line,
  headingLevel,
}) => {
  if (headingLevel !== 2) {
    return null;
  }

  const title = line;
  const label = toLabelVar(title);

  return {
    title,
    label,
    topLevel: true,
    kind: "timeline-label",
    toCode: () => `label ${label}:`,
  };
};

const parseTimelinesStart: ParserFunc<TimelinesStart> = ({
  line,
  headingLevel,
}) => {
  if (headingLevel !== 1) {
    return null;
  }

  if (line !== "Timelines") {
    return null;
  }

  return {
    kind: "start",
    topLevel: true,
    toCode: ({ firstTimeline }) => {
      const body = firstTimeline ? `jump ${firstTimeline}` : "pass";

      return ["label start:", `${INDENT}${body}`].join("\n");
    },
  };
};

const parseSceneStatement: ParserFunc<SceneStatement> = ({ line }) => {
  if (!/^scene[\s$]/i.test(line)) {
    return null;
  }

  const [, tag, ...attributes] = tokenizeBarewords(line);
  if (!tag) {
    throw new ParseError("Scene statement missing tag");
  }

  return {
    tag: tag,
    attributes: attributes,
    kind: "scene",
    toCode: () => `scene ${tag} ${attributes.join(" ")}`,
  };
};

const parseInputStatement: ParserFunc<InputStatement> = ({ line }) => {
  const m = line.match(/^\$(\w+) = input (.*?)$/);
  if (!m) {
    return null;
  }

  const [, variable, prompt] = m;
  if (!variable) {
    throw new ParseError("No variable name found");
  }

  if (!/^\w+$/.test(variable)) {
    throw new ParseError("Invalid variable name: " + variable);
  }

  if (!prompt) {
    throw new ParseError("No prompt found");
  }

  return {
    prompt,
    variable,
    kind: "input",
    toCode: () =>
      `$${variable} = renpy.input(${toRenpyString(prompt)}).strip()`,
  };
};

const parseNumericAssignment: ParserFunc<NumericAssignment> = ({ line }) => {
  if (!line.startsWith("$")) {
    return null;
  }

  const m = line.replaceAll(" ", "").match(/^\$(\w+)([-+])?=(.+)$/);
  if (!m) {
    return null;
  }

  const [, variable, operator, value] = m;

  if (!variable) {
    throw new ParseError("No variable name found");
  }

  if (!value) {
    throw new ParseError("No value found");
  }

  const numericValue = Number(value);
  if (isNaN(numericValue)) {
    throw new ParseError("Expected a numeric value in assignment");
  }

  return {
    variable,
    operator,
    value: numericValue,
    kind: "numeric-assignment",
    toCode: () => `$${variable} ${operator ?? ""}= ${value}`,
  };
};

const parseJumpStatement: ParserFunc<JumpStatement> = ({ line }) => {
  if (!/^jump[\s$]/i.test(line)) {
    return null;
  }

  const [, ...tokens] = line.split(" ");
  const destination = tokens.join(" ");
  if (!tokens) {
    throw new ParseError("No jump destination specified");
  }

  return {
    destination,
    kind: "jump",
    toCode: () => `jump ${toLabelVar(destination)}`,
  };
};

const parseBranchStart: ParserFunc<BranchStart> = ({ line, index }) => {
  if (!/^Branch\s*:/i.test(line)) {
    return null;
  }

  const label = toLabelVar(`menu_${index}`);
  const optionsVar = "options";

  return {
    label,
    index,
    kind: "branch-start",
    toCode: () =>
      [`$${optionsVar} = []`, `menu ${label}:`, `${INDENT}set options`].join(
        "\n",
      ),
  };
};

const parseShowStatement: ParserFunc<ShowStatement> = ({ line }) => {
  const tokens = line.toLowerCase().split(" ");

  const command = tokens.shift();
  if (command != "show") {
    return null;
  }

  const tag = tokens.shift();
  if (!tag) {
    throw new ParseError("Show statement missing tag");
  }

  const attribsEnd = tokens.findIndex((tok) => ["with", "at"].includes(tok));
  const attributes =
    attribsEnd == -1 ? shiftN(tokens) : shiftN(tokens, attribsEnd);

  let atArg: string | undefined;
  let withArg: string | undefined;
  while (tokens.length > 0) {
    const [keyword, arg] = shiftN(tokens, 2);

    if (!arg) {
      throw new ParseError(
        `Show statement has the "${keyword}" with no argument`,
      );
    }

    if (keyword == "with") {
      withArg = arg;
    } else if (keyword == "at") {
      atArg = arg;
    } else {
      throw new ParseError(`Show statement has unknown keyword ${keyword}`);
    }
  }

  if (atArg && !supportedImageLocations.includes(atArg)) {
    throw new ParseError(
      `Show statement has invalid location specified: ${atArg}. Must be one of ${supportedImageLocations.join(", ")}`,
    );
  }

  return {
    tag,
    attributes,
    kind: "show",
    toCode: () => {
      let code = `show ${tag} ${attributes.join(" ")}`;
      if (atArg) {
        code += ` at ${atArg}`;
      }

      if (withArg) {
        code += ` with ${withArg}`;
      }

      return code;
    },
  };
};

const parseSayStatement: ParserFunc<SayStatement> = ({ line }) => {
  if (!/.+:.+/.test(line)) {
    return null;
  }

  const [speakerSection, textSection] = line.split(":", 2).map((s) => s.trim());
  if (!speakerSection) {
    throw new ParseError("No speaker portion found");
  }

  if (!textSection) {
    throw new ParseError("No text portion found");
  }

  const text = textSection.trim();
  const alias = speakerSection.match(/\((.+?)\)/)?.[1];
  const action = speakerSection.match(/\[(.+?)\]/)?.[1];
  const [tag, ...attributes] = tokenizeBarewords(
    speakerSection.replaceAll(/(\(.+?\)|\[.+?\])/g, ""),
  );

  let character: undefined | Character;
  if (tag) {
    character = toCharacter(tag);
  }

  return {
    character,
    attributes,
    alias,
    text,
    action,
    tag,
    kind: "say",
    toCode: () => {
      const code = [];
      const aliasStr = alias ?? action;

      if (character) {
        code.push(
          [character.charVar, ...attributes, toRenpyString(textSection)].join(
            " ",
          ),
        );

        if (aliasStr) {
          code.push(`$${character.nameVar} = ${toRenpyString(aliasStr)}`);
        }
      } else if (aliasStr) {
        code.push(`${toRenpyString(aliasStr)} ${toRenpyString(text)}`);
      } else {
        code.push(toRenpyString(text));
      }

      return code.join("\n");
    },
  };
};

/*
export function isNumericAssignment(
  stmt: Statement,
): stmt is ReturnType<typeof parseNumericAssignment> {
  return stmt.kind === "numeric-assignment";
}
*/

export const parsers: ParserFunc<Statement>[] = [
  parseComment,
  parseBranchItem,
  parseTimelineStart,
  parseTimelinesStart,
  parseSceneStatement,
  parseInputStatement,
  parseNumericAssignment,
  parseJumpStatement,
  parseRepeatBranchStatement,
  parseBranchStart,
  parseShowStatement,
  parseSayStatement,
];
