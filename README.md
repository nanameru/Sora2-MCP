# Sora2 MCP

The Universal MCP Server exposes tools for OpenAI's Sora API, enabling programmatic creation, management, and remixing of AI-generated videos. Designed for prompt-first usage in MCP-compatible clients.

## Installation

### Prerequisites
- Node.js 18+
- Set `SORA2_MCP_API_KEY` (or `OPENAI_API_KEY`) in your environment

### Get an API key
- Obtain your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Ensure your account has access to the Sora API (currently in limited beta)
- For more information, see the [Sora API documentation](https://platform.openai.com/docs/guides/video)

### Build locally
```bash
cd /path/to/sora2-mcp
npm i
npm run build
```

## Setup: Claude Code (CLI)

Use this one-liner (replace with your real values):

```bash
claude mcp add "Sora2 MCP" -s user -e SORA2_MCP_API_KEY="sk-your-real-key" -- npx sora2-mcp
```

To remove:

```bash
claude mcp remove "Sora2 MCP"
```

## Setup: Cursor

**Note:** This repository does not include `.cursor/mcp.json`. Configure Cursor via its UI settings, or create `.cursor/mcp.json` in your client workspace (do not commit it here):

```json
{
  "mcpServers": {
    "sora2-mcp": {
      "command": "npx",
      "args": ["sora2-mcp"],
      "env": {
        "SORA2_MCP_API_KEY": "sk-your-real-key"
      },
      "autoStart": true
    }
  }
}
```

## Other Clients and Agents

<details>
<summary>VS Code</summary>

Install via CLI:

```bash
code --add-mcp '{"name":"sora2-mcp","command":"npx","args":["sora2-mcp"],"env":{"SORA2_MCP_API_KEY":"sk-your-real-key"}}'
```

Or configure in your VS Code settings under MCP servers.

</details>

<details>
<summary>VS Code Insiders</summary>

Similar to VS Code, use the Insiders binary:

```bash
code-insiders --add-mcp '{"name":"sora2-mcp","command":"npx","args":["sora2-mcp"],"env":{"SORA2_MCP_API_KEY":"sk-your-real-key"}}'
```

</details>

<details>
<summary>Claude Desktop</summary>

Add to your Claude Desktop MCP configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sora2-mcp": {
      "command": "npx",
      "args": ["sora2-mcp"],
      "env": {
        "SORA2_MCP_API_KEY": "sk-your-real-key"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

</details>

<details>
<summary>LM Studio</summary>

In LM Studio's MCP settings:

- **Command:** `npx`
- **Args:** `["sora2-mcp"]`
- **Environment Variables:**
  - `SORA2_MCP_API_KEY` = `sk-your-real-key`

</details>

<details>
<summary>Goose</summary>

Configure in Goose's MCP settings:

- **Type:** STDIO
- **Command:** `npx`
- **Args:** `sora2-mcp`
- **Enabled:** `true`

Add environment variable `SORA2_MCP_API_KEY` in your shell or Goose config.

</details>

<details>
<summary>opencode</summary>

Example `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sora2-mcp": {
      "type": "local",
      "command": ["npx", "sora2-mcp"],
      "env": {
        "SORA2_MCP_API_KEY": "sk-your-real-key"
      },
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary>Qodo Gen</summary>

Add a new MCP server in Qodo Gen settings and paste the standard JSON config:

```json
{
  "name": "sora2-mcp",
  "command": "npx",
  "args": ["sora2-mcp"],
  "env": {
    "SORA2_MCP_API_KEY": "sk-your-real-key"
  }
}
```

</details>

<details>
<summary>Windsurf</summary>

Configure in Windsurf's MCP settings. Reuse the standard config above with command `npx` and args `["sora2-mcp"]`.

</details>

## Setup: Codex (TOML)

Add the following to your Codex TOML configuration.

**Example (Serena reference):**

```toml
[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "codex"]
```

**This server (minimal):**

```toml
[mcp_servers.sora2-mcp]
command = "npx"
args = ["sora2-mcp"]
# Optional environment variables:
# SORA2_MCP_API_KEY = "sk-your-real-key"
# MCP_NAME = "sora2-mcp"
```

## Configuration (Env)

- **`SORA2_MCP_API_KEY`** (or **`OPENAI_API_KEY`**): Your OpenAI API key with Sora access
- **`MCP_NAME`**: Server name override (default: `sora2-mcp`)

## Available Tools

### `create_video`
Start a new video generation job with Sora. Returns a job object with status. Poll `get_video_status` or use webhooks to monitor completion.

- **Inputs:**
  - `prompt` (string, **required**): Text description of the video. Be specific about shot type, subject, action, setting, and lighting for best results.
  - `model` (string, optional): Model to use. `"sora-2"` (faster for iteration) or `"sora-2-pro"` (higher quality for production). Default: `"sora-2"`
  - `size` (string, optional): Video resolution. Options: `"1280x720"`, `"1920x1080"`, `"720x1280"`, `"1080x1920"`. Default: `"1280x720"`
  - `seconds` (string, optional): Video duration. Options: `"4"`, `"8"`, `"12"`. Default: `"8"`
  - `input_reference` (string, optional): Base64-encoded image (JPEG, PNG, or WebP) to use as the first frame. Must match target resolution.
  
- **Outputs:** JSON object with `id`, `status` (`queued`, `in_progress`, `completed`, `failed`), `progress`, and other metadata.

### `get_video_status`
Retrieve the current status and progress of a video generation job.

- **Inputs:**
  - `video_id` (string, **required**): The video job ID returned from `create_video`
  
- **Outputs:** JSON object with `status`, `progress` percentage, and metadata.

### `download_video`
Download the completed video file (MP4), thumbnail (WebP), or spritesheet (JPEG). Only works when status is `completed`. Returns base64-encoded binary data.

- **Inputs:**
  - `video_id` (string, **required**): The video job ID
  - `variant` (string, optional): What to download. Options: `"video"` (MP4), `"thumbnail"` (WebP), `"spritesheet"` (JPEG). Default: `"video"`
  
- **Outputs:** JSON object with `video_id`, `variant`, `size_bytes`, `data_base64`, and usage notes.

### `list_videos`
List all video jobs with pagination support. Returns metadata for enumeration, dashboards, or housekeeping.

- **Inputs:**
  - `limit` (number, optional): Number of videos to return. Default: 10, Max: 100
  - `after` (string, optional): Cursor for pagination to fetch the next page
  - `order` (string, optional): Sort order by creation date. Options: `"asc"`, `"desc"`. Default: `"desc"`
  
- **Outputs:** JSON object with `data` array of video objects and pagination metadata.

### `delete_video`
Delete a video from OpenAI's storage. This action is permanent.

- **Inputs:**
  - `video_id` (string, **required**): The video job ID to delete
  
- **Outputs:** Confirmation JSON object.

### `remix_video`
Create a new video by remixing an existing completed video with targeted adjustments. Preserves structure and composition while applying modifications.

- **Inputs:**
  - `video_id` (string, **required**): The ID of the completed video to use as the base
  - `prompt` (string, **required**): Description of the change to apply. Keep it focused on a single, well-defined adjustment for best results.
  
- **Outputs:** JSON object with new job `id` and `status`.

For detailed input/output schemas, see `src/index.ts`.

## Example Invocation (MCP Tool Call)

```json
{
  "name": "create_video",
  "arguments": {
    "prompt": "Wide tracking shot of a teal coupe driving through a desert highway, heat ripples visible, hard sun overhead.",
    "model": "sora-2-pro",
    "size": "1280x720",
    "seconds": "8"
  }
}
```

**Response:**

```json
{
  "id": "video_68d7512d07848190b3e45da0ecbebcde004da08e1e0678d5",
  "object": "video",
  "created_at": 1758941485,
  "status": "queued",
  "model": "sora-2-pro",
  "progress": 0,
  "seconds": "8",
  "size": "1280x720"
}
```

Then poll with:

```json
{
  "name": "get_video_status",
  "arguments": {
    "video_id": "video_68d7512d07848190b3e45da0ecbebcde004da08e1e0678d5"
  }
}
```

Once `status` is `"completed"`, download with:

```json
{
  "name": "download_video",
  "arguments": {
    "video_id": "video_68d7512d07848190b3e45da0ecbebcde004da08e1e0678d5",
    "variant": "video"
  }
}
```

## Troubleshooting

- **401 authentication errors:** Check that `SORA2_MCP_API_KEY` (or `OPENAI_API_KEY`) is set correctly and that your account has Sora API access.
- **Ensure Node 18+:** Run `node -v` to verify your Node.js version.
- **Local runs:** After building with `npm run build`, test locally with `npx .` or `node build/index.js` in the project directory.
- **Inspect publish artifacts:** Run `npm pack --dry-run` to see what files will be published.
- **Video generation takes time:** Depending on model and resolution, rendering may take several minutes. Use polling or webhooks to monitor progress efficiently.
- **Download URLs expire:** Video download URLs are valid for a maximum of 24 hours. Save files promptly to your own storage.
- **Content restrictions:** The API enforces guardrails (no copyrighted characters, no real people, etc.). Ensure prompts and inputs comply.

## References

- [MCP SDK Documentation](https://modelcontextprotocol.io/docs/sdks)
- [MCP Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)
- [MCP Server Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/index)
- [OpenAI Sora API Guide](https://platform.openai.com/docs/guides/video)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/videos)

## Name Consistency & Troubleshooting

- **Always use CANONICAL_ID (`sora2-mcp`) for identifiers and keys.**
- **Use CANONICAL_DISPLAY (`Sora2 MCP`) only for UI labels.**
- **Do not mix different names across clients.**

### Consistency Matrix

| Context                       | Value         |
|-------------------------------|---------------|
| npm package name              | `sora2-mcp`   |
| Binary name                   | `sora2-mcp`   |
| MCP server name (SDK metadata)| `sora2-mcp`   |
| Env default `MCP_NAME`        | `sora2-mcp`   |
| Client registry key           | `sora2-mcp`   |
| UI label                      | `Sora2 MCP`   |

### Conflict Cleanup

- Remove any old entries (e.g., legacy display names like `"Sora2"`) from your MCP configuration and re-add with `"sora2-mcp"` as the key.
- Ensure global `.mcp.json` or client registries only use `"sora2-mcp"` for keys.
- **Cursor:** Configure in the UI only. This project does not include `.cursor/mcp.json`.

### Example

**Correct:**

```json
{
  "mcpServers": {
    "sora2-mcp": {
      "command": "npx",
      "args": ["sora2-mcp"]
    }
  }
}
```

**Incorrect:**

```json
{
  "mcpServers": {
    "Sora2": {
      "command": "npx",
      "args": ["sora2-mcp"]
    }
  }
}
```

Using inconsistent keys like `"Sora2"` will conflict with `"sora2-mcp"`.

---

## License

MIT
