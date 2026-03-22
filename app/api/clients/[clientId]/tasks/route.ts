import { NextRequest, NextResponse } from "next/server";
import { createTask, getClients, getTasksByClient } from "@/lib/data-store";
import {
  hasNonEmptyText,
  isValidIsoDate,
  isValidPriority,
  isValidStatus,
} from "@/lib/validation";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ clientId: string }>;
}

export async function GET(_request: NextRequest, context: Context) {
  const { clientId } = await context.params;

  try {
    const tasks = await getTasksByClient(clientId);
    return NextResponse.json({ tasks }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to load tasks." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { clientId } = await context.params;

  try {
    const body = await request.json();
    const clients = await getClients();
    const clientExists = clients.some((client) => client.id === clientId);

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (!hasNonEmptyText(body.title) || !hasNonEmptyText(body.category) || !isValidIsoDate(body.due_date)) {
      return NextResponse.json(
        { error: "Validation failed. Title, category, and due_date are required." },
        { status: 400 },
      );
    }

    if (body.status && !isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    if (body.priority && !isValidPriority(body.priority)) {
      return NextResponse.json({ error: "Invalid priority value." }, { status: 400 });
    }

    const task = await createTask({
      client_id: clientId,
      title: body.title.trim(),
      description: hasNonEmptyText(body.description) ? body.description.trim() : "",
      category: body.category.trim(),
      due_date: body.due_date,
      status: body.status,
      priority: body.priority,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}
