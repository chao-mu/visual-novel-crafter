import { ParseError, Character } from "./types";

import type {
  Statement,
  RepeatMenuStatement,
  Comment,
  MenuItem,
  TimelineStart,
  TimelinesStart,
  SceneStatement,
  InputStatement,
  Assignment,
  JumpStatement,
  MenuStart,
  ShowStatement,
  SayStatement,
} from "./statements";

import { isMenuStart } from "./statements";

import {
  toRenpyString,
  toLabelVar,
  toCharacter,
  INDENT,
  toBareword,
} from "./renpy";

export type ParserArgs = {
  line: string;
  level: number;
  index: number;
  headingLevel: number | null;
  isBullet: boolean;
};

export type ParserFunc<T extends Statement> = (args: ParserArgs) => T | null;

const tokenizeBarewords = (text: string): string[] =>
  text.split(" ").map(toBareword);

const parseRepeatMenuStatement: ParserFunc<RepeatMenuStatement> = ({
  line,
  index,
}) => {
  if (line.toLowerCase() != "repeat menu") {
    return null;
  }

  return {
    kind: "repeat-menu",
    toCode: ({ statements }) => {
      const lastMenu = statements
        .reverse()
        .find((s) => isMenuStart(s) && s.index < index);

      if (!lastMenu || !isMenuStart(lastMenu)) {
        throw new ParseError("No previous menu found");
      }

      return `jump ${lastMenu.label}`;
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

const parseMenuItem: ParserFunc<MenuItem> = ({ line, level, isBullet }) => {
  if (!isBullet || level % 2 === 0) {
    return null;
  }

  const option = line;

  return {
    option,
    kind: "menu-item",

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
    toCode: () => `$${variable} = input(${toRenpyString(prompt)})`,
  };
};

const parseAssignment: ParserFunc<Assignment> = ({ line }) => {
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

  return {
    variable,
    value,
    operator,
    kind: "assignment",
    toCode: () => `$${variable} ${operator ?? ""}= ${value}`,
  };
};

const parseJumpStatement: ParserFunc<JumpStatement> = ({ line }) => {
  if (!/^jump[\s$]/i.test(line)) {
    return null;
  }

  const [, dest] = line.split(" ", 2);
  if (!dest) {
    throw new ParseError("No jump destination specified");
  }

  return {
    destination: dest ?? "",
    kind: "jump",
    toCode: () => `jump ${toLabelVar(dest)}`,
  };
};

const parseMenuStart: ParserFunc<MenuStart> = ({ line, index }) => {
  if (!/^Menu\s*:/i.test(line)) {
    return null;
  }

  const label = toLabelVar(`menu_${index}`);
  const optionsVar = "options";

  return {
    label,
    index,
    kind: "menu-start",
    toCode: () =>
      [`$${optionsVar} = []`, `menu ${label}:`, `${INDENT}set options`].join(
        "\n",
      ),
  };
};

const parseShowStatement: ParserFunc<ShowStatement> = ({ line }) => {
  if (!/^show[\s$]/i.test(line)) {
    return null;
  }

  const [, tag, ...attributes] = tokenizeBarewords(line);

  if (!tag) {
    throw new ParseError("Show statement missing tag");
  }

  return {
    tag,
    attributes,
    kind: "show",
    toCode: () => `show ${tag} ${attributes.join(" ")}`,
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

export const parsers: ParserFunc<Statement>[] = [
  parseComment,
  parseMenuItem,
  parseTimelineStart,
  parseTimelinesStart,
  parseSceneStatement,
  parseInputStatement,
  parseAssignment,
  parseJumpStatement,
  parseRepeatMenuStatement,
  parseMenuStart,
  parseShowStatement,
  parseSayStatement,
];
