import { ParseError, type Character } from "./types";

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
  toTag,
  toAttribute,
  INDENT,
} from "./renpy";

const supportedImageLocations = ["center", "left", "right"];

export type ParserArgs = {
  line: string;
  level: number;
  index: number;
  headingLevel: number | null;
  isBullet: boolean;
  tokens: string[];
};

export type ParserFunc<T extends Statement> = (args: ParserArgs) => T | null;

const consume = (
  { tokens, skipWhitespace }: { tokens: string[]; skipWhitespace: boolean },
  f: (peek: string) => void,
) => {
  let lastLength = tokens.length;
  while (tokens.length > 0) {
    if (tokens[0] === undefined) {
      return;
    }

    const peek = tokens[0];

    if (skipWhitespace && /^\s*$/.test(peek)) {
      tokens.shift();
    } else {
      f(peek);
    }

    if (lastLength === tokens.length) {
      throw new Error(
        "Logic error. Infinite loop detected while processing tokens: no tokens were consumed in a pass.",
      );
    }

    lastLength = tokens.length;
  }
};

const consumeBareword = (tokens: string[]) => {
  const word = tokens.shift();

  if (word === undefined) {
    throw new Error(
      "Attempted to consume bareword, but that are no tokens left.",
    );
  }

  return word;
};

const consumeTag = (tokens: string[]) => toTag(consumeBareword(tokens));
const consumeAttribute = (tokens: string[]) =>
  toAttribute(consumeBareword(tokens));

function consumeWrapped(startTag: string, endTag: string, tokens: string[]) {
  let action = "";

  if (startTag !== tokens.shift()) {
    throw new ParseError(`Expected ${startTag}.`);
  }

  while (tokens.length > 0) {
    const tok = tokens.shift();
    if (tok === undefined) {
      throw new ParseError(`Found ${startTag} but no ${endTag} followed`);
    }

    if (tok === endTag) {
      return action;
    }

    action += tok;
  }

  throw new Error("Internal logic error");
}

function consumePrefixedBareword(prefix: string, tokens: string[]): string {
  if (tokens.shift() !== prefix) {
    throw new Error(`Internal logic error. Expected ${prefix}`);
  }

  let value: string | undefined;

  consume({ tokens, skipWhitespace: true }, () => {
    value = tokens.shift();

    return false;
  });

  if (value === undefined) {
    throw new ParseError(`Expected token after ${prefix}`);
  }

  return value;
}

function shiftAll<T>(arr: T[]): T[] {
  return shiftN(arr, arr.length);
}

function shiftN<T>(arr: T[], n: number): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) {
    const el = arr.shift();
    if (el !== undefined) {
      res.push(el);
    }
  }

  return res;
}

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

const parseComment: ParserFunc<Comment> = ({ tokens }) => {
  if (tokens[0] !== "[") {
    return null;
  }

  const text = tokens.join();

  return {
    text,
    kind: "comment",
    toCode: () => `# ${text}`,
  };
};

const parseBranchItem: ParserFunc<BranchItem> = ({
  tokens,
  level,
  isBullet,
}) => {
  if (!isBullet || level % 2 === 0) {
    return null;
  }

  const option = tokens.join().trim();

  return {
    option,
    kind: "branch-item",

    toCode: () => toRenpyString(option) + ":",
  };
};

const parseTimelineStart: ParserFunc<TimelineStart> = ({
  tokens,
  headingLevel,
}) => {
  if (headingLevel !== 2) {
    return null;
  }

  const title = tokens.join().trim();
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
  tokens,
  headingLevel,
}) => {
  if (headingLevel !== 1) {
    return null;
  }

  if (tokens.join().toLowerCase().trim() !== "timelines") {
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

const parseSceneStatement: ParserFunc<SceneStatement> = ({ tokens }) => {
  const command = tokens.shift()?.toLowerCase();
  if (command != "scene") {
    return null;
  }

  let tag = "";
  const attributes: string[] = [];
  consume({ tokens, skipWhitespace: true }, () => {
    if (!tag) {
      tag = consumeTag(tokens);
    } else {
      attributes.push(consumeAttribute(tokens));
    }
  });

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

const parseShowStatement: ParserFunc<ShowStatement> = ({ tokens }) => {
  const command = tokens.shift()?.toLowerCase();
  if (command != "show") {
    return null;
  }

  let tag = "";
  const attributes: string[] = [];
  let atArg: string | undefined;
  let withArg: string | undefined;

  consume({ tokens, skipWhitespace: true }, (peek) => {
    if (peek == "with") {
      withArg = consumePrefixedBareword("with", tokens);
    } else if (peek == "at") {
      atArg = consumePrefixedBareword("at", tokens);
    } else if (!tag) {
      tag = consumeTag(tokens);
    } else {
      attributes.push(consumeAttribute(tokens));
    }
  });

  if (atArg !== undefined && !supportedImageLocations.includes(atArg)) {
    throw new ParseError(`Unsupported image location specified: ${atArg}`);
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

const parseSayStatement: ParserFunc<SayStatement> = ({ tokens }) => {
  const speechIndex = tokens.indexOf(":");
  if (speechIndex === -1) {
    return null;
  }

  const consumeSpeech = (tokens: string[]) => {
    if (":" !== tokens.shift()) {
      throw new ParseError(
        "Expected : while consuming action. Internal error.",
      );
    }

    return shiftAll(tokens).join("").trim();
  };

  const consumeAlias = (tokens: string[]) => consumeWrapped("(", ")", tokens);
  const consumeAction = (tokens: string[]) => consumeWrapped("{", "}", tokens);

  let tag: string | undefined;
  const attributes: string[] = [];
  let action: string | undefined;
  let alias: string | undefined;
  let speech = "";

  consume({ tokens, skipWhitespace: true }, (peek) => {
    if (peek === " ") {
      tokens.shift();
    } else if (peek === "(") {
      alias = consumeAlias(tokens);
    } else if (peek === "{") {
      action = consumeAction(tokens);
    } else if (peek === ":") {
      speech = consumeSpeech(tokens);
    } else if (!tag) {
      tag = consumeTag(tokens);
    } else {
      attributes.push(consumeAttribute(tokens));
    }
  });

  if (!speech) {
    throw new ParseError("Say statement encountered without speech portion");
  }

  let character: undefined | Character;
  if (tag) {
    character = toCharacter(tag);
  }

  return {
    character,
    attributes,
    alias,
    text: speech,
    action,
    tag,
    kind: "say",
    toCode: () => {
      const code = [];
      const aliasStr = alias ?? action;

      if (character) {
        code.push(
          [character.charVar, ...attributes, toRenpyString(speech)].join(" "),
        );

        if (aliasStr) {
          code.push(`$${character.nameVar} = ${toRenpyString(aliasStr)}`);
        }
      } else if (aliasStr) {
        code.push(`${toRenpyString(aliasStr)} ${toRenpyString(speech)}`);
      } else {
        code.push(toRenpyString(speech));
      }

      return code.join("\n");
    },
  };
};

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
