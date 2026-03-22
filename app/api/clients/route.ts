import { NextRequest, NextResponse } from "next/server";
import { createClient, getClients } from "@/lib/data-store";
import { hasNonEmptyText } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ clients }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to load clients." }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
