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

Reads from Granola's local cache file at `~/Library/Application Support/Granola/cache-v3.json`.

## License

MIT
