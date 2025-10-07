#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.SORA2_MCP_API_KEY || process.env.OPENAI_API_KEY;
const API_BASE = "https://api.openai.com/v1";
const MCP_NAME = process.env.MCP_NAME || "sora2-mcp";

// ログをstderrに出力
function log(message: string, ...args: any[]) {
  console.error(`[${MCP_NAME}]`, message, ...args);
}

// OpenAI API呼び出し用のヘルパー関数
async function callOpenAI(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "SORA2_MCP_API_KEY or OPENAI_API_KEY environment variable is required"
    );
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new McpError(
      ErrorCode.InternalError,
      `OpenAI API error (${response.status}): ${errorText}`
    );
  }

  // バイナリデータの場合はそのまま返す
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("video/") || contentType.includes("image/") || contentType.includes("application/octet-stream")) {
    return response.arrayBuffer();
  }

  return response.json();
}

// FormData用のヘルパー（multipart/form-data）
async function callOpenAIMultipart(
  endpoint: string,
  formData: Record<string, string | Blob>
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "SORA2_MCP_API_KEY or OPENAI_API_KEY environment variable is required"
    );
  }

  const url = `${API_BASE}${endpoint}`;
  const form = new FormData();
  
  for (const [key, value] of Object.entries(formData)) {
    form.append(key, value);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new McpError(
      ErrorCode.InternalError,
      `OpenAI API error (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

// サーバーインスタンスの作成
const server = new Server(
  {
    name: MCP_NAME,
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールの登録
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_video",
        description:
          "Start a new video generation job with Sora. Returns a job object with status. Poll get_video_status or use webhooks to monitor completion.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "Text description of the video to generate. Be specific about shot type, subject, action, setting, and lighting for best results.",
            },
            model: {
              type: "string",
              enum: ["sora-2", "sora-2-pro"],
              description:
                "Model to use. 'sora-2' is faster for iteration; 'sora-2-pro' is higher quality for production.",
              default: "sora-2",
            },
            size: {
              type: "string",
              enum: ["1280x720", "1920x1080", "720x1280", "1080x1920"],
              description: "Video resolution (width x height)",
              default: "1280x720",
            },
            seconds: {
              type: "string",
              enum: ["4", "8", "12"],
              description: "Video duration in seconds",
              default: "8",
            },
            input_reference: {
              type: "string",
              description:
                "Optional: Base64-encoded image to use as the first frame (JPEG, PNG, or WebP). Must match target video resolution.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "get_video_status",
        description:
          "Retrieve the current status and progress of a video generation job. Status values: queued, in_progress, completed, failed.",
        inputSchema: {
          type: "object",
          properties: {
            video_id: {
              type: "string",
              description: "The video job ID returned from create_video",
            },
          },
          required: ["video_id"],
        },
      },
      {
        name: "download_video",
        description:
          "Download the completed video file (MP4), thumbnail (WebP), or spritesheet (JPEG). Only works when status is 'completed'. Returns base64-encoded binary data.",
        inputSchema: {
          type: "object",
          properties: {
            video_id: {
              type: "string",
              description: "The video job ID",
            },
            variant: {
              type: "string",
              enum: ["video", "thumbnail", "spritesheet"],
              description:
                "What to download: 'video' (MP4), 'thumbnail' (WebP), or 'spritesheet' (JPEG)",
              default: "video",
            },
          },
          required: ["video_id"],
        },
      },
      {
        name: "list_videos",
        description:
          "List all video jobs with pagination support. Returns metadata for enumeration, dashboards, or housekeeping.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of videos to return (default 10, max 100)",
              default: 10,
            },
            after: {
              type: "string",
              description:
                "Cursor for pagination. Use this to fetch the next page.",
            },
            order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order by creation date",
              default: "desc",
            },
          },
        },
      },
      {
        name: "delete_video",
        description:
          "Delete a video from OpenAI's storage. This action is permanent.",
        inputSchema: {
          type: "object",
          properties: {
            video_id: {
              type: "string",
              description: "The video job ID to delete",
            },
          },
          required: ["video_id"],
        },
      },
      {
        name: "remix_video",
        description:
          "Create a new video by remixing an existing completed video with targeted adjustments. Preserves structure and composition while applying modifications.",
        inputSchema: {
          type: "object",
          properties: {
            video_id: {
              type: "string",
              description:
                "The ID of the completed video to use as the base for remixing",
            },
            prompt: {
              type: "string",
              description:
                "Description of the change to apply. Keep it focused on a single, well-defined adjustment for best results.",
            },
          },
          required: ["video_id", "prompt"],
        },
      },
    ],
  };
});

// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_video": {
        const { prompt, model, size, seconds, input_reference } = args as {
          prompt: string;
          model?: string;
          size?: string;
          seconds?: string;
          input_reference?: string;
        };

        // FormDataを使用してマルチパートリクエストを送信
        const formData: Record<string, string> = {
          prompt,
          model: model || "sora-2",
          size: size || "1280x720",
          seconds: seconds || "8",
        };

        if (input_reference) {
          formData.input_reference = input_reference;
        }

        const result = await callOpenAIMultipart("/videos", formData);

        log("Video creation job started:", result.id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_video_status": {
        const { video_id } = args as { video_id: string };

        const result = await callOpenAI(`/videos/${video_id}`);

        log("Video status:", result.status, "Progress:", result.progress);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "download_video": {
        const { video_id, variant } = args as {
          video_id: string;
          variant?: string;
        };

        const variantParam = variant || "video";
        const endpoint =
          variantParam === "video"
            ? `/videos/${video_id}/content`
            : `/videos/${video_id}/content?variant=${variantParam}`;

        const binaryData = await callOpenAI(endpoint);

        // バイナリデータをBase64エンコード
        const buffer = Buffer.from(binaryData);
        const base64Data = buffer.toString("base64");

        log(
          `Downloaded ${variantParam} for video ${video_id} (${buffer.length} bytes)`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  video_id,
                  variant: variantParam,
                  size_bytes: buffer.length,
                  data_base64: base64Data,
                  note: "Save this base64 data to a file to use it. For 'video' variant, use .mp4 extension; for 'thumbnail', use .webp; for 'spritesheet', use .jpg.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_videos": {
        const { limit, after, order } = args as {
          limit?: number;
          after?: string;
          order?: string;
        };

        const queryParams = new URLSearchParams();
        if (limit) queryParams.set("limit", String(limit));
        if (after) queryParams.set("after", after);
        if (order) queryParams.set("order", order);

        const endpoint = `/videos${queryParams.toString() ? `?${queryParams}` : ""}`;
        const result = await callOpenAI(endpoint);

        log("Listed videos:", result.data?.length || 0);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "delete_video": {
        const { video_id } = args as { video_id: string };

        const result = await callOpenAI(`/videos/${video_id}`, {
          method: "DELETE",
        });

        log("Deleted video:", video_id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "remix_video": {
        const { video_id, prompt } = args as {
          video_id: string;
          prompt: string;
        };

        const result = await callOpenAI(`/videos/${video_id}/remix`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        log("Video remix job started:", result.id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    log("Error:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// サーバーの起動
async function main() {
  log("Starting server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Server running on stdio");
}

main().catch((error) => {
  log("Fatal error:", error);
  process.exit(1);
});
