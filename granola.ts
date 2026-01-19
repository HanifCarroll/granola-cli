#!/usr/bin/env bun

import { readFileSync } from "fs";
import { homedir } from "os";

const CACHE_PATH = `${homedir()}/Library/Application Support/Granola/cache-v3.json`;

interface Meeting {
  id: string;
  title: string;
  created_at: string;
  summary?: string;
  transcript?: string;
}

// Extract text from ProseMirror-like document structure
function extractTextFromContent(node: any): string {
  if (!node) return "";

  if (typeof node === "string") return node;

  if (node.text) return node.text;

  if (Array.isArray(node)) {
    return node.map(extractTextFromContent).join("");
  }

  if (node.content) {
    const text = extractTextFromContent(node.content);
    // Add appropriate spacing based on node type
    if (node.type === "heading") return `\n## ${text}\n`;
    if (node.type === "paragraph") return `${text}\n`;
    if (node.type === "bulletList" || node.type === "orderedList") return `${text}\n`;
    if (node.type === "listItem") return `- ${text}`;
    return text;
  }

  return "";
}

function loadMeetings(): Meeting[] {
  try {
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const cacheData = JSON.parse(raw);
    const innerCache = JSON.parse(cacheData.cache);
    const state = innerCache.state;

    const documents = state.documents || {};
    const transcripts = state.transcripts || {};
    const panels = state.documentPanels || {};

    const meetings: Meeting[] = [];

    for (const [id, doc] of Object.entries(documents) as [string, any][]) {
      const transcript = transcripts[id];
      const panelData = panels[id];

      // Extract summary - prefer notes_markdown, then panel content
      let summary = "";
      if (doc.notes_markdown) {
        summary = doc.notes_markdown;
      } else if (panelData) {
        // panels are stored as { panelId: panelObject }
        for (const panelId of Object.keys(panelData)) {
          const panel = panelData[panelId];
          if (panel?.content) {
            summary += extractTextFromContent(panel.content) + "\n";
          }
        }
      }

      // Extract transcript text
      let transcriptText = "";
      if (transcript?.transcript) {
        transcriptText = transcript.transcript
          .map((t: any) => `[${t.speaker || "Unknown"}]: ${t.text}`)
          .join("\n");
      }

      meetings.push({
        id,
        title: doc.title || "Untitled",
        created_at: doc.created_at || "",
        summary: summary.trim(),
        transcript: transcriptText,
      });
    }

    // Sort by created_at descending
    meetings.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return meetings;
  } catch (e: any) {
    console.error(`Error loading cache: ${e.message}`);
    process.exit(1);
  }
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return t.includes(q);
}

function findMeeting(meetings: Meeting[], search: string): Meeting | undefined {
  return meetings.find((m) => fuzzyMatch(search, m.title));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Unknown date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.substring(0, 8);
}

function cmdList(limit: number = 10) {
  const meetings = loadMeetings();
  const toShow = meetings.slice(0, limit);

  console.log(`\n📅 Recent Meetings (${toShow.length} of ${meetings.length})\n`);
  console.log("─".repeat(75));

  for (const m of toShow) {
    const date = formatDate(m.created_at);
    const hasTranscript = m.transcript ? "📝" : "  ";
    const hasSummary = m.summary ? "📋" : "  ";
    const sid = shortId(m.id);
    console.log(`${hasTranscript}${hasSummary} [${sid}] ${date.padEnd(20)} ${m.title}`);
  }
  console.log("─".repeat(75));
  console.log("\n📝 = has transcript, 📋 = has summary\n");
}

function cmdShow(search: string) {
  const meetings = loadMeetings();
  const meeting = findMeeting(meetings, search);

  if (!meeting) {
    console.error(`No meeting found matching: "${search}"`);
    process.exit(1);
  }

  console.log(`\n# ${meeting.title}`);
  console.log(`📅 ${formatDate(meeting.created_at)}\n`);
  console.log("─".repeat(60));

  if (meeting.summary) {
    console.log(meeting.summary);
  } else {
    console.log("(No summary available)");
  }
  console.log("");
}

function cmdTranscript(search: string) {
  const meetings = loadMeetings();
  const meeting = findMeeting(meetings, search);

  if (!meeting) {
    console.error(`No meeting found matching: "${search}"`);
    process.exit(1);
  }

  console.log(`\n# Transcript: ${meeting.title}`);
  console.log(`📅 ${formatDate(meeting.created_at)}\n`);
  console.log("─".repeat(60));

  if (meeting.transcript) {
    console.log(meeting.transcript);
  } else {
    console.log("(No transcript available)");
  }
  console.log("");
}

function cmdSearch(query: string) {
  const meetings = loadMeetings();
  const results: { meeting: Meeting; context: string }[] = [];

  for (const m of meetings) {
    const searchText = `${m.title} ${m.summary || ""} ${m.transcript || ""}`;
    if (fuzzyMatch(query, searchText)) {
      // Find context snippet
      const lower = searchText.toLowerCase();
      const idx = lower.indexOf(query.toLowerCase());
      let context = "";
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(searchText.length, idx + query.length + 50);
        context = "..." + searchText.slice(start, end).replace(/\n/g, " ") + "...";
      }
      results.push({ meeting: m, context });
    }
  }

  console.log(`\n🔍 Search results for "${query}" (${results.length} found)\n`);
  console.log("─".repeat(75));

  for (const { meeting, context } of results) {
    const sid = shortId(meeting.id);
    console.log(`\n[${sid}] 📅 ${formatDate(meeting.created_at)} - ${meeting.title}`);
    if (context) {
      console.log(`   ${context}`);
    }
  }
  console.log("");
}

function cmdDump(options: { limit?: number; transcripts?: boolean }) {
  const meetings = loadMeetings();
  const toShow = options.limit ? meetings.slice(0, options.limit) : meetings;

  console.log(`# Granola Meeting Notes`);
  console.log(`\nTotal meetings: ${toShow.length}${options.limit ? ` (of ${meetings.length})` : ""}`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  for (const m of toShow) {
    console.log(`---\n`);
    console.log(`## ${m.title}`);
    console.log(`**Date:** ${formatDate(m.created_at)}\n`);

    if (m.summary) {
      console.log(`### Summary\n`);
      console.log(m.summary);
      console.log("");
    }

    if (options.transcripts && m.transcript) {
      console.log(`### Transcript\n`);
      console.log(m.transcript);
      console.log("");
    }
  }
}

function cmdContext(ids: string[], options: { transcripts?: boolean }) {
  const meetings = loadMeetings();
  const selected: Meeting[] = [];

  for (const id of ids) {
    const match = meetings.find(m => m.id.startsWith(id));
    if (match) {
      selected.push(match);
    } else {
      console.error(`Warning: No meeting found for ID "${id}"`);
    }
  }

  if (selected.length === 0) {
    console.error("No meetings found for provided IDs");
    process.exit(1);
  }

  console.log(`# Selected Meeting Notes`);
  console.log(`\nMeetings: ${selected.length}`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  for (const m of selected) {
    console.log(`---\n`);
    console.log(`## ${m.title}`);
    console.log(`**Date:** ${formatDate(m.created_at)}`);
    console.log(`**ID:** ${shortId(m.id)}\n`);

    if (m.summary) {
      console.log(`### Summary\n`);
      console.log(m.summary);
      console.log("");
    }

    if (options.transcripts && m.transcript) {
      console.log(`### Transcript\n`);
      console.log(m.transcript);
      console.log("");
    } else if (!options.transcripts && m.transcript) {
      console.log(`_Transcript available (${m.transcript.length} chars) - use --transcripts to include_\n`);
    }
  }
}

function printHelp() {
  console.log(`
granola - CLI tool for Granola meeting notes

USAGE:
  granola list [--limit N]       List recent meetings (default 10)
  granola show <search>          Show meeting summary by title search
  granola transcript <search>    Show full transcript
  granola search <query>         Search across all meeting content
  granola dump [options]         Dump all meetings for AI context
    --limit N                    Limit to N most recent meetings
    --transcripts                Include full transcripts (large!)
  granola context <id> [ids...]  Load specific meetings by ID
    --transcripts                Include full transcripts
  granola help                   Show this help message

EXAMPLES:
  granola list --limit 5
  granola show "wedding"
  granola transcript "standup"
  granola search "project deadline"
  granola dump --limit 20
  granola context 26f3f793 90209d18 --transcripts
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "list": {
    let limit = 10;
    const limitIdx = args.indexOf("--limit");
    if (limitIdx !== -1 && args[limitIdx + 1]) {
      limit = parseInt(args[limitIdx + 1], 10) || 10;
    }
    cmdList(limit);
    break;
  }
  case "show": {
    const search = args.slice(1).join(" ");
    if (!search) {
      console.error("Usage: granola show <search>");
      process.exit(1);
    }
    cmdShow(search);
    break;
  }
  case "transcript": {
    const search = args.slice(1).join(" ");
    if (!search) {
      console.error("Usage: granola transcript <search>");
      process.exit(1);
    }
    cmdTranscript(search);
    break;
  }
  case "search": {
    const query = args.slice(1).join(" ");
    if (!query) {
      console.error("Usage: granola search <query>");
      process.exit(1);
    }
    cmdSearch(query);
    break;
  }
  case "dump": {
    let limit: number | undefined;
    const limitIdx = args.indexOf("--limit");
    if (limitIdx !== -1 && args[limitIdx + 1]) {
      limit = parseInt(args[limitIdx + 1], 10) || undefined;
    }
    const transcripts = args.includes("--transcripts");
    cmdDump({ limit, transcripts });
    break;
  }
  case "context": {
    const transcripts = args.includes("--transcripts");
    const ids = args.slice(1).filter(a => !a.startsWith("--"));
    if (ids.length === 0) {
      console.error("Usage: granola context <id> [id2] [id3]... [--transcripts]");
      process.exit(1);
    }
    cmdContext(ids, { transcripts });
    break;
  }
  case "help":
  case "--help":
  case "-h":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
