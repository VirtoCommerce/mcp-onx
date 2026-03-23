# Backend Integrations

This directory contains backend-specific capability definitions for the MCP server.

## Structure

Each backend has its own directory containing:

```
backends/
├── README.md                    # This file
└── [your-backend]/              # Your backend
    └── CAPABILITIES.md          # Capability manifest
```

## Adding a New Backend

1. Create a new directory under `backends/` with your backend name
2. Create a `CAPABILITIES.md` file following this structure:

```markdown
# [Backend Name] Backend Capabilities

## Canonical Tool List
[List all supported methods]

### Actions (Write Operations)
[Methods that modify state]

### Queries (Read Operations)
[Methods that retrieve data]

## Usage Rules for Claude
[Backend-specific usage guidelines]

## Error Documentation
[Links to error handling documentation]
```

3. Update the "Backend Integrations" table in the root `CLAUDE.md`

## Principles

All backend integrations must follow the generic MCP adapter principles defined in [CLAUDE.md](../CLAUDE.md):

- Backend-agnostic behavior
- No business logic in the adapter
- Transparent error propagation
