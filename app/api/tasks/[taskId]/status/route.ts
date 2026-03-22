import { NextRequest, NextResponse } from "next/server";
import { updateTaskStatus } from "@/lib/data-store";
import { isValidStatus } from "@/lib/validation";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ taskId: string }>;
}

export async function PATCH(request: NextRequest, context: Context) {
  const { taskId } = await context.params;

  try {
    const body = await request.json();

    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const updatedTask = await updateTaskStatus(taskId, body.status);

    if (!updatedTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ task: updatedTask }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update task status." }, { status: 500 });
  }
}
