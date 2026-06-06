"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassMarkdownViewerProps {
  /** Raw Markdown string. */
  content: string
  className?: string
  style?: React.CSSProperties
}

// ── Inline parsing ────────────────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, [link](url). Order matters (code first).

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Tokenize on the first matching construct, recursing on the remainder.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/
  let remaining = text
  let i = 0

  while (remaining.length > 0) {
    const match = pattern.exec(remaining)
    if (!match) {
      nodes.push(remaining)
      break
    }
    const idx = match.index
    if (idx > 0) nodes.push(remaining.slice(0, idx))
    const token = match[0]
    const key = `${keyPrefix}-${i++}`

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} style={INLINE_CODE}>
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} style={{ color: "var(--prv-text-1)", fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      // [label](url)
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            style={{ color: "var(--prv-accent, rgba(10,132,255,0.9))", textDecoration: "none" }}
          >
            {linkMatch[1]}
          </a>
        )
      } else {
        nodes.push(token)
      }
    }
    remaining = remaining.slice(idx + token.length)
  }

  return nodes
}

const INLINE_CODE: React.CSSProperties = {
  fontFamily: '"SF Mono", monospace',
  fontSize: "0.9em",
  background: "var(--prv-g2)",
  border: "1px solid var(--prv-border-subtle)",
  borderRadius: 5,
  padding: "1px 6px",
  color: "#9EE493",
}

// ── Block parsing ─────────────────────────────────────────────────────────────

function parseBlocks(md: string): React.ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i] ?? ""

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        buf.push(lines[i] ?? "")
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre key={key++} style={BLOCK_CODE}>
          {lang && <div style={BLOCK_CODE_LANG}>{lang}</div>}
          <code>{buf.join("\n")}</code>
        </pre>
      )
      continue
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1]!.length
      const text = h[2] ?? ""
      const style = level === 1 ? H1 : level === 2 ? H2 : H3
      const Tag = `h${level}` as "h1" | "h2" | "h3"
      blocks.push(
        <Tag key={key++} style={style}>
          {parseInline(text, `h${key}`)}
        </Tag>
      )
      i++
      continue
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key++} style={HR} />)
      i++
      continue
    }

    // Blockquote (consecutive > lines)
    if (line.trimStart().startsWith(">")) {
      const buf: string[] = []
      while (i < lines.length && (lines[i] ?? "").trimStart().startsWith(">")) {
        buf.push((lines[i] ?? "").replace(/^\s*>\s?/, ""))
        i++
      }
      blocks.push(
        <blockquote key={key++} style={QUOTE}>
          {parseInline(buf.join(" "), `q${key}`)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""))
        i++
      }
      blocks.push(
        <ul key={key++} style={LIST}>
          {items.map((it, j) => (
            <li key={j} style={LIST_ITEM}>
              {parseInline(it, `ul${key}-${j}`)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""))
        i++
      }
      blocks.push(
        <ol key={key++} style={LIST}>
          {items.map((it, j) => (
            <li key={j} style={LIST_ITEM}>
              {parseInline(it, `ol${key}-${j}`)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Blank line
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph (gather until blank line or a block starter)
    const buf: string[] = []
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,3}\s|>|\s*[-*]\s|\s*\d+\.\s|```|---|\*\*\*|___)/.test(lines[i] ?? "")
    ) {
      buf.push(lines[i] ?? "")
      i++
    }
    blocks.push(
      <p key={key++} style={PARAGRAPH}>
        {parseInline(buf.join(" "), `p${key}`)}
      </p>
    )
  }

  return blocks
}

// ── Styles ────────────────────────────────────────────────────────────────────

const H1: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "var(--prv-text-1)",
  margin: "0 0 12px",
  letterSpacing: "-0.01em",
}
const H2: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "var(--prv-text-1)",
  margin: "24px 0 10px",
}
const H3: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--prv-text-1)",
  margin: "20px 0 8px",
}
const PARAGRAPH: React.CSSProperties = { margin: "0 0 12px" }
const LIST: React.CSSProperties = { margin: "0 0 12px", paddingLeft: 20 }
const LIST_ITEM: React.CSSProperties = { margin: "4px 0" }
const QUOTE: React.CSSProperties = {
  margin: "0 0 12px",
  padding: "8px 16px",
  borderLeft: "3px solid var(--prv-accent, rgba(10,132,255,0.9))",
  background: "var(--prv-g1)",
  borderRadius: "0 10px 10px 0",
  color: "var(--prv-text-3)",
}
const HR: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--prv-border-subtle)",
  margin: "20px 0",
}
const BLOCK_CODE: React.CSSProperties = {
  position: "relative",
  fontFamily: '"SF Mono", monospace',
  fontSize: 12.5,
  lineHeight: 1.6,
  background: "rgba(16,16,18,0.6)",
  border: "1px solid var(--prv-border-subtle)",
  borderRadius: 12,
  padding: "14px 16px",
  margin: "0 0 12px",
  overflowX: "auto",
  color: "var(--prv-text-1)",
}
const BLOCK_CODE_LANG: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--prv-text-4)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassMarkdownViewer({ content, className, style }: GlassMarkdownViewerProps) {
  const blocks = React.useMemo(() => parseBlocks(content), [content])

  return (
    <div
      className={clsx(className)}
      style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: "var(--prv-text-2)",
        ...style,
      }}
    >
      {blocks}
    </div>
  )
}
