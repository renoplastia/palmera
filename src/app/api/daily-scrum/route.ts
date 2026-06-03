import { NextRequest, NextResponse } from "next/server";
import { callAI, parseTasksFromResponse, ChatMessage } from "@/lib/ai-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, action } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const aiResponse = await callAI(messages as ChatMessage[]);

    if (action === "extract_tasks") {
      const parsed = parseTasksFromResponse(aiResponse.content);
      if (parsed && parsed.tasks) {
        return NextResponse.json({
          success: true,
          summary: parsed.summary || "",
          tasks: parsed.tasks.map((task: any, idx: number) => ({
            id: `task-${Date.now()}-${idx}`,
            title: task.title || "Tarea sin título",
            description: task.description || "",
            priority: task.priority || "medium",
            module: task.module || undefined,
            estimatedTime: task.estimatedTime || undefined,
            createdAt: new Date().toISOString(),
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      content: aiResponse.content,
    });
  } catch (error: any) {
    console.error("Daily Scrum API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}