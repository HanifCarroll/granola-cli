# granola-cli

CLI for accessing [Granola](https://granola.ai) meeting notes and transcripts from the terminal.

## Requirements

- [Bun](https://bun.sh) runtime
- Granola app installed with local cache

## Installation

```bash
# Clone the repo
git clone https://github.com/HanifCarroll/granola-cli.git
cd granola-cli

# Create symlink to your PATH
ln -s "$(pwd)/granola.ts" ~/.local/bin/granola
```

## Usage

```bash
# List recent meetings (shows IDs for use with context command)
granola list [--limit N]

# Show meeting summary by title search
granola show <title>

# Show full transcript
granola transcript <title>

# Search across all meeting content
granola search <query>

# Dump all meetings for AI context (~210KB for summaries)
granola dump [--limit N] [--transcripts]

# Load specific meetings by ID (for selective AI context)
granola context <id> [id2] [id3]... [--transcripts]
```

## AI Context Loading

The `dump` and `context` commands are designed for loading meeting history into AI assistants:

```bash
# Load all meeting summaries
granola dump

# Load recent meetings with full transcripts
granola dump --limit 10 --transcripts

# Search, then load specific meetings by ID
granola search "project"
granola context 26f3f793 90209d18 --transcripts
```

## How it works

Granola stores all meeting data locally in a cache file, and this CLI reads directly from that cache—no API calls or network requests required.

### Cache Location

```
~/Library/Application Support/Granola/cache-v3.json
```

### Cache Structure

The cache contains a nested JSON structure with three main data stores:

- **`documents`** - Meeting metadata including title, creation date, and notes (as markdown or ProseMirror format)
- **`transcripts`** - Full meeting transcripts with speaker attribution and timestamps
- **`documentPanels`** - Panel content in ProseMirror document format (used when `notes_markdown` isn't available)

### Data Flow

```
Granola App → cache-v3.json → granola-cli → Terminal/AI Assistant
```

1. The Granola desktop app syncs meeting data to the local cache
2. This CLI reads and parses the cache file on each command
3. Meetings are sorted by date and formatted for display or AI context

### Benefits of Cache-Based Approach

- **Offline access** - Works without internet once meetings are synced
- **Fast** - No API latency, just local file reads
- **Private** - Data never leaves your machine
- **AI-friendly** - Output formats designed for loading into AI assistants

### Note on Data Freshness

The cache updates when the Granola app syncs. If you don't see recent meetings, open Granola to trigger a sync.

## License

MIT
