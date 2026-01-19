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
# List recent meetings
granola list [--limit N]

# Show meeting summary by title search
granola show <title>

# Show full transcript
granola transcript <title>

# Search across all meeting content
granola search <query>
```

## How it works

Reads from Granola's local cache file at `~/Library/Application Support/Granola/cache-v3.json`.

## License

MIT
