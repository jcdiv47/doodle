import type { ReactNode } from "react";

const keywordSets: Record<string, Set<string>> = {
  javascript: new Set([
    "as",
    "async",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "if",
    "import",
    "in",
    "interface",
    "let",
    "new",
    "null",
    "of",
    "private",
    "protected",
    "public",
    "readonly",
    "return",
    "switch",
    "throw",
    "true",
    "try",
    "type",
    "undefined",
    "var",
    "while",
  ]),
  typescript: new Set([
    "as",
    "async",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "interface",
    "let",
    "namespace",
    "new",
    "null",
    "of",
    "private",
    "protected",
    "public",
    "readonly",
    "return",
    "switch",
    "throw",
    "true",
    "try",
    "type",
    "undefined",
    "var",
    "while",
  ]),
  json: new Set(["true", "false", "null"]),
  bash: new Set([
    "cd",
    "cat",
    "curl",
    "do",
    "done",
    "echo",
    "else",
    "esac",
    "export",
    "fi",
    "for",
    "git",
    "if",
    "in",
    "ls",
    "npm",
    "node",
    "rg",
    "sudo",
    "then",
    "while",
  ]),
  python: new Set([
    "and",
    "as",
    "assert",
    "async",
    "await",
    "class",
    "def",
    "elif",
    "else",
    "except",
    "False",
    "finally",
    "for",
    "from",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "True",
    "try",
    "while",
    "with",
    "yield",
  ]),
};

function normalizeLanguage(language: string | undefined) {
  const lang = (language ?? "").trim().toLowerCase();
  if (!lang) return "javascript";
  if (lang === "js" || lang === "jsx") return "javascript";
  if (lang === "ts" || lang === "tsx") return "typescript";
  if (lang === "sh" || lang === "zsh" || lang === "shell") return "bash";
  if (lang === "py") return "python";
  return lang;
}

function highlightCodeLine(line: string, language: string, key: string) {
  const normalized = normalizeLanguage(language);
  const keywords = keywordSets[normalized] ?? keywordSets.javascript;
  const tokenRegex =
    /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b/gm;

  const tokens: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[0];
    const tokenStart = match.index;
    if (tokenStart > lastIndex) {
      tokens.push(
        <span key={`${key}-plain-${tokenStart}`}>
          {line.slice(lastIndex, tokenStart)}
        </span>,
      );
    }

    if (/^(\/\/|\/\*|#)/.test(token)) {
      tokens.push(
        <span key={`${key}-comment-${tokenStart}`} className="md-token-comment">
          {token}
        </span>,
      );
    } else if (/^['"`]/.test(token)) {
      tokens.push(
        <span key={`${key}-string-${tokenStart}`} className="md-token-string">
          {token}
        </span>,
      );
    } else if (/^\d/.test(token)) {
      tokens.push(
        <span key={`${key}-number-${tokenStart}`} className="md-token-number">
          {token}
        </span>,
      );
    } else if (keywords.has(token)) {
      tokens.push(
        <span key={`${key}-keyword-${tokenStart}`} className="md-token-keyword">
          {token}
        </span>,
      );
    } else {
      tokens.push(<span key={`${key}-word-${tokenStart}`}>{token}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push(<span key={`${key}-tail`}>{line.slice(lastIndex)}</span>);
  }

  if (tokens.length === 0) {
    return <span>&nbsp;</span>;
  }
  return tokens;
}

function renderTextWithTags(
  text: string,
  keyPrefix: string,
  onTagClick?: (tag: string) => void,
) {
  const tagRegex = /(^|[^A-Za-z0-9_-])#([A-Za-z0-9_-]+)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const leading = match[1];
    const tagValue = match[2].toLowerCase();
    const start = match.index;
    const hashIndex = start + leading.length;

    if (start > cursor) {
      nodes.push(
        <span key={`${keyPrefix}-plain-${cursor}`}>
          {text.slice(cursor, start)}
        </span>,
      );
    }

    if (leading) {
      nodes.push(
        <span key={`${keyPrefix}-leading-${start}`}>{leading}</span>,
      );
    }

    if (onTagClick) {
      nodes.push(
        <button
          key={`${keyPrefix}-tag-${hashIndex}`}
          type="button"
          className="md-tag"
          onClick={() => onTagClick(tagValue)}
        >
          #{tagValue}
        </button>,
      );
    } else {
      nodes.push(
        <span key={`${keyPrefix}-tag-${hashIndex}`} className="md-tag">
          #{tagValue}
        </span>,
      );
    }

    cursor = start + fullMatch.length;
  }

  if (cursor < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-tail-${cursor}`}>{text.slice(cursor)}</span>,
    );
  }

  return nodes.length > 0 ? nodes : [<span key={`${keyPrefix}-text`}>{text}</span>];
}

function renderInline(
  text: string,
  keyPrefix: string,
  onTagClick?: (tag: string) => void,
) {
  const regex = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(
        ...renderTextWithTags(
          text.slice(lastIndex, start),
          `${keyPrefix}-text-${start}`,
          onTagClick,
        ),
      );
    }

    if (/^`/.test(token)) {
      nodes.push(
        <code key={`${keyPrefix}-code-${start}`} className="md-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (/^\[\S/.test(token)) {
      const parts = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (parts) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${start}`}
            href={parts[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="md-link"
          >
            {parts[1]}
          </a>,
        );
      } else {
        nodes.push(<span key={`${keyPrefix}-fallback-${start}`}>{token}</span>);
      }
    } else if (/^\*\*/.test(token)) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${start}`}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={`${keyPrefix}-em-${start}`}>{token.slice(1, -1)}</em>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...renderTextWithTags(
        text.slice(lastIndex),
        `${keyPrefix}-tail`,
        onTagClick,
      ),
    );
  }

  return nodes;
}

function isBlockStart(line: string) {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

export function MarkdownRenderer({
  content,
  onTagClick,
}: {
  content: string;
  onTagClick?: (tag: string) => void;
}) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const codeStart = line.match(/^```([\w-]+)?\s*$/);
    if (codeStart) {
      const language = codeStart[1] ?? "text";
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }

      blocks.push(
        <div key={`block-${key++}`} className="md-code-wrap">
          <div className="md-code-lang">{language}</div>
          <pre className="md-code-block">
            <code>
              {codeLines.map((codeLine, lineIndex) => (
                <div key={`code-${lineIndex}`}>
                  {highlightCodeLine(codeLine, language, `line-${lineIndex}`)}
                </div>
              ))}
            </code>
          </pre>
        </div>,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const className =
        level === 1
          ? "md-h1"
          : level === 2
            ? "md-h2"
            : level === 3
              ? "md-h3"
              : "md-h4";

      blocks.push(
        <div key={`block-${key++}`} className={className}>
          {renderInline(text, `heading-${key}`, onTagClick)}
        </div>,
      );
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }

      blocks.push(
        <blockquote key={`block-${key++}`} className="md-blockquote">
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-${quoteIndex}`}>
              {renderInline(quoteLine, `quote-${quoteIndex}`, onTagClick)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={`block-${key++}`} className="md-list">
          {items.map((item, itemIndex) => (
            <li key={`ul-${itemIndex}`}>
              {renderInline(item, `ul-${itemIndex}`, onTagClick)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={`block-${key++}`} className="md-list md-list-ordered">
          {items.map((item, itemIndex) => (
            <li key={`ol-${itemIndex}`}>
              {renderInline(item, `ol-${itemIndex}`, onTagClick)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBlockStart(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      <p key={`block-${key++}`} className="md-paragraph">
        {renderInline(paragraphLines.join(" "), `p-${key}`, onTagClick)}
      </p>,
    );
  }

  return <div className="memo-markdown">{blocks}</div>;
}
