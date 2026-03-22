import { NextRequest, NextResponse } from "next/server";
import { createClient, getClients } from "@/lib/data-store";
import { hasNonEmptyText } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error("Failed to load clients", error);
    const message = error instanceof Error ? error.message : "Failed to load clients.";
    return NextResponse.json({ error: "Failed to load clients.", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !hasNonEmptyText(body.company_name) ||
      !hasNonEmptyText(body.country) ||
      !hasNonEmptyText(body.entity_type)
    ) {
      return NextResponse.json(
        { error: "Validation failed. company_name, country, and entity_type are required." },
        { status: 400 },
      );
    }

    const client = await createClient({
      company_name: body.company_name.trim(),
      country: body.country.trim(),
      entity_type: body.entity_type.trim(),
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Failed to create client", error);
    const message = error instanceof Error ? error.message : "Failed to create client.";
    return NextResponse.json({ error: "Failed to create client.", detail: message }, { status: 500 });
  }
}
