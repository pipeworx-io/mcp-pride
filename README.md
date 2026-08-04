# mcp-pride

EBI PRIDE Archive MCP — proteomics (mass-spectrometry) data repository.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_projects` | Search EBI PRIDE Archive — the largest public proteomics/mass-spectrometry dataset repository — for projects by keyword (disease, organism, technique, protein, instrument). Returns matching project accessions with title, organisms, diseases, and instruments. Keyless. |
| `get_project` | Get full metadata for one PRIDE Archive proteomics project by accession (e.g. "PXD000001"): title, description, sample-processing and data-processing protocols, organisms, organism parts, diseases, instruments, keywords, and DOI. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "pride": {
      "url": "https://gateway.pipeworx.io/pride/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Pride data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
