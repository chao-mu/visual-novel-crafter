"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import utilStyles from "@/styles/util.module.css";
import { SubmitButton } from "@/app/_components/submit-button";

import type { docs_v1 } from "googleapis";

type ToCodeArgs = {
  timelineLabels: string[];
  characters: string[];
  firstTimeline?: string;
  statements: Statement[];
};

type Document = docs_v1.Schema$Document;
type Paragraph = docs_v1.Schema$Paragraph;

type Form = {
  url: string;
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

type ParserArgs = {
  p: Paragraph;
  doc: Document;
  line: string;
  level: number;
  index: number;
};

const INDENT = " ".repeat(4);

const toRenpyString = (text: string) => JSON.stringify(text);

type CodeGenerator = {
  kind: string;
  toCode: (args: ToCodeArgs) => string;
  topLevel?: boolean;
};

type ParserFunc<T extends CodeGenerator> = (args: ParserArgs) => T | null;

type Comment = {
  kind: "comment";
  text: string;
} & CodeGenerator;

type MenuItem = {
  kind: "menu-item";
  option: string;
} & CodeGenerator;

type TimelineStart = {
  kind: "timeline-label";
  title: string;
  label: string;
} & CodeGenerator;

type TimelinesStart = {
  kind: "start";
} & CodeGenerator;

type SceneStatement = {
  kind: "scene";
  tag: string;
  attributes: string[];
} & CodeGenerator;

type InputStatement = {
  kind: "input";
  variable: string;
  prompt: string;
} & CodeGenerator;

type Assignment = {
  kind: "assignment";
  variable: string;
  value: string;
  operator?: string;
} & CodeGenerator;

type JumpStatement = {
  kind: "jump";
  destination: string;
} & CodeGenerator;

type MenuStart = {
  kind: "menu-start";
  index: number;
  label: string;
} & CodeGenerator;

type ShowStatement = {
  kind: "show";
  tag: string;
  attributes: string[];
} & CodeGenerator;

type SayStatement = {
  kind: "say";
  speaker: string;
  alias?: string;
  text: string;
  action?: string;
  attributes: string[];
  characterVarName: string;
} & CodeGenerator;

type RepeatMenuStatement = {
  kind: "repeat-menu";
} & CodeGenerator;

type Statement =
  | Comment
  | MenuItem
  | TimelineStart
  | TimelinesStart
  | SceneStatement
  | Assignment
  | JumpStatement
  | MenuStart
  | ShowStatement
  | SayStatement
  | RepeatMenuStatement
  | InputStatement;

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

const parseMenuItem: ParserFunc<MenuItem> = ({ line, level, p }) => {
  if (!p.bullet || level % 2 === 0) {
    return null;
  }

  const option = line;

  return {
    option,
    kind: "menu-item",

    toCode: () => toRenpyString(option) + ":",
  };
};

const parseTimelineStart: ParserFunc<TimelineStart> = ({ line, p }) => {
  if (getHeadingLevel(p) !== 2) {
    return null;
  }

  const title = line;
  const label = toLabelName(title);

  return {
    title,
    label,
    topLevel: true,
    kind: "timeline-label",
    toCode: () => `label ${label}:`,
  };
};

const isTimelineStart = (statement: Statement): statement is TimelineStart =>
  statement.kind === "timeline-label";

const isMenuStart = (statement: Statement): statement is MenuStart =>
  statement.kind === "menu-start";

const parseTimelinesStart: ParserFunc<TimelinesStart> = ({ line, p }) => {
  if (getHeadingLevel(p) !== 1) {
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

  const [, tag, ...attributes] = line.split(" ");

  return {
    tag: tag ?? "",
    attributes: attributes ?? [],
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
    toCode: () => `jump ${toLabelName(dest)}`,
  };
};

const parseMenuStart: ParserFunc<MenuStart> = ({ line, index }) => {
  if (!/^Menu\s*:/i.test(line)) {
    return null;
  }

  const label = toLabelName(`menu_${index}`);
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

  const [, tag, ...attributes] = line.split(" ");

  if (!tag) {
    throw new ParseError("No tag found");
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
  const tokens = speakerSection.replaceAll(/(\(.+?\)|\[.+?\])/g, "").split(" ");
  const speaker = tokens[0] ?? "anon";
  const attributes = tokens.slice(1);

  const characterVarName = toCharacterName(speaker);

  return {
    attributes,
    alias,
    characterVarName,
    text,
    action,
    speaker: speaker ?? "anon",
    kind: "say",
    toCode: () => {
      const aliasStr = alias ?? action;
      const cmd = aliasStr ? toRenpyString(aliasStr) : characterVarName;

      /*
      const aliasStr = toRenpyString(alias ?? action ?? "");
      if (characterVarName && (alias ?? action)) {
        cmd = `${characterVarName} as ${aliasStr}`;
      } else if (characterVarName) {
        cmd = characterVarName;
      } else {
        cmd = aliasStr;
      }
      */
      return [cmd, ...attributes, toRenpyString(textSection)].join(" ");
    },
  };
};

function isSayStatement(statement: Statement): statement is SayStatement {
  return statement.kind === "say";
}

class ParseError extends Error {}

type LineInfo = {
  level: number;
  line: string;
  parser: string;
};

type ParsedScript = {
  errors: {
    error: string;
    lineInfo?: LineInfo;
  }[];
  body: {
    statement: Statement;
    lineInfo: LineInfo;
  }[];
};

function parseScript(doc: Document): ParsedScript {
  const timelinesHeader = "Timelines";

  const script: ParsedScript = {
    errors: [],
    body: [],
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
      p,
      doc,
      line,
      level: getBulletLevel(p),
      index: statementIndex++,
    };

    const parsers: ParserFunc<Statement>[] = [
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

  return script;
}

const scriptToCode = (script: ParsedScript): string => {
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

const toCharacterName = (text: string) => toVarName(text, "chr");
const toLabelName = (text: string) => toVarName(text, "label");

const toVarName = (text: string, prefix: string): string =>
  `${prefix}_` +
  text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z\d]/g, "X");

export function ImportStory() {
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<Form>();

  const loadScript = api.script.loadScript.useMutation({
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });

  const onSubmit = handleSubmit(({ url }, e) => {
    e?.preventDefault();
    loadScript.mutate({ url });
  });

  const script = loadScript.data ? parseScript(loadScript.data) : null;

  let output = "...";
  if (script) {
    const { errors } = script;
    if (errors.length > 0) {
      output = JSON.stringify(errors, null, 2);
    } else {
      output = scriptToCode(script);
    }
  }

  const downloadUrl = window.URL.createObjectURL(
    new Blob([output], { type: "text/plain" }),
  );

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <input
        id="url"
        type="text"
        placeholder="Google Docs URL"
        {...register("url")}
      />
      <SubmitButton isLoading={loadScript.isLoading} />
      <p className={formStyles["submission-error"]}>
        {loadScript.error?.message}
      </p>
      <a href={downloadUrl} download="script.rpy">
        Download
      </a>
      <pre className={utilStyles.code}>{output}</pre>
    </form>
  );
}
