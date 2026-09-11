/**
 * Email processing logic ported from Python process_emails.py
 * Converts Outlook CSV rows to cleaned markdown format
 */

const SAFELINK_RE = /<https?:\/\/[^>]*safelinks\.protection\.outlook\.com[^>]*>/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const EXCHANGE_DN_RE = /\/[Oo]=EXCHANGELABS\/\S*/g;
const BLANK_LINES_RE = /\n{3,}/g;
const SENT_DATE_RE = /Sent:\s*\w+,\s*(\w+ \d{1,2}, \d{4})/i;

const SIGNATURE_PATTERNS = [
  /^david bartlinski$/i,
  /^technical information specialist$/i,
  /^department of veterans affairs$/i,
  /^office of research (&|and) development communications$/i,
  /^vha discovery, education,? and affiliate networks$/i,
  /^george h\.? fallon federal building$/i,
  /^31 hopkins plaza.*baltimore, md 21201$/i,
  /^cell:\s*\+?1?[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}$/i,
  /^https?:\/\/www\.research\.va\.gov\/?$/i,
  /^sent from my (iphone|ipad|android|galaxy|mobile device)\.?$/i,
  /^get outlook for (ios|android)$/i,
];

function stripSignatureLines(text) {
  return text
    .split("\n")
    .filter(line => !SIGNATURE_PATTERNS.some(p => p.test(line.trim())))
    .join("\n");
}

function truncateQuotedHistory(text) {
  const quoteBlockStartRe = /\n\s*From:.*?\n\s*Sent:.*?\n(?:\s*To:.*?\n)?(?:\s*Cc:.*?\n)?\s*Subject:.*?\n/i;
  const match = quoteBlockStartRe.exec(text);
  if (!match) return text;
  
  const newContent = text.substring(0, match.index).trim();
  const note = "*(quoted prior message(s) in this thread omitted — see their own dated entries)*";
  return newContent ? `${newContent}\n\n${note}` : note;
}

function cleanBody(text) {
  if (!text) return "";
  
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  cleaned = cleaned.replace(SAFELINK_RE, "");
  cleaned = cleaned.replace(EXCHANGE_DN_RE, "");
  cleaned = cleaned.replace(EMAIL_RE, "[redacted-email]");
  cleaned = stripSignatureLines(cleaned);
  cleaned = truncateQuotedHistory(cleaned);
  cleaned = cleaned
    .split("\n")
    .map(line => (line.trim() ? line : ""))
    .join("\n");
  cleaned = cleaned.replace(BLANK_LINES_RE, "\n\n");
  
  return cleaned.trim();
}

function redactName(name) {
  return (name || "").replace(EMAIL_RE, "[redacted-email]").trim();
}

function parseDate(row) {
  // Try ReceivedTime column first
  const received = row.ReceivedTime || row["ReceivedTime"] || "";
  if (received) {
    const formats = ["%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M:%S %p"];
    for (const fmt of formats) {
      try {
        const date = parseCustomDate(received.trim(), fmt);
        if (date) return date;
      } catch (e) {
        // Try next format
      }
    }
  }

  // Fallback: parse from Body
  const body = row.Body || "";
  const match = SENT_DATE_RE.exec(body);
  if (match) {
    try {
      return new Date(match[1]);
    } catch (e) {
      // Fallback failed
    }
  }
  return null;
}

function parseCustomDate(dateStr, format) {
  // Simple date parser for basic formats
  if (format === "%Y-%m-%d %H:%M:%S" || format === "%m/%d/%Y %H:%M:%S") {
    return new Date(dateStr);
  }
  return null;
}

function buildEmailRecord(row) {
  const date = parseDate(row);
  const fromName = redactName(row.SenderName || row["From: (Name)"] || "");
  const toName = redactName(row.ToNames || row["To: (Name)"] || "");
  const ccName = redactName(row.CcNames || row["CC: (Name)"] || "");

  return {
    date,
    subject: (row.Subject || "(no subject)").trim(),
    from: fromName,
    to: toName,
    cc: ccName,
    body: cleanBody(row.Body || ""),
  };
}

function renderEmail(record) {
  const header = record.date
    ? `### ${record.date.toISOString().split("T")[0]} — ${record.subject}`
    : `### (undated) — ${record.subject}`;

  const metaParts = [
    record.from ? `**From:** ${record.from}` : null,
    record.to ? `**To:** ${record.to}` : null,
    record.cc ? `**Cc:** ${record.cc}` : null,
  ].filter(Boolean);

  const meta = metaParts.join("  \n");
  const body = record.body || "*(empty body)*";

  return [header, meta, "", body, "\n---\n"].filter(Boolean).join("\n");
}

function buildMarkdown(records, startDate, endDate, includeUndated) {
  const dated = [];
  let undated = [];
  let outOfRange = 0;

  for (const record of records) {
    if (!record.date) {
      undated.push(record);
    } else if (
      (startDate && record.date < startDate) ||
      (endDate && record.date > endDate)
    ) {
      outOfRange++;
    } else {
      dated.push(record);
    }
  }

  dated.sort((a, b) => a.date - b.date);

  const months = {};
  for (const record of dated) {
    const key = record.date.toISOString().substring(0, 7); // YYYY-MM
    if (!months[key]) months[key] = [];
    months[key].push(record);
  }

  const output = ["# Email Archive — Organized for Review\n"];
  for (const monthKey of Object.keys(months).sort()) {
    const date = new Date(monthKey + "-01");
    const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    output.push(`## ${monthKey} (${label})\n`);
    for (const record of months[monthKey]) {
      output.push(renderEmail(record));
    }
  }

  if (undated && includeUndated) {
    output.push("## Undated (needs manual review)\n");
    for (const record of undated) {
      output.push(renderEmail(record));
    }
  }

  const markdown = output.join("\n");
  const stats = {
    total: dated.length + undated.length + outOfRange,
    included: dated.length + (includeUndated ? undated.length : 0),
    dated: dated.length,
    undated: undated.length,
    out_of_range: outOfRange,
  };

  return { markdown, stats };
}

export { buildEmailRecord, buildMarkdown };
