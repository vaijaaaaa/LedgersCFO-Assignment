import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Client,
  ComplianceTask,
  DatabaseShape,
  TaskPriority,
  TaskStatus,
} from "@/types";

const dataDirectoryPath = path.join(process.cwd(), "data");
const databaseFilePath = path.join(dataDirectoryPath, "db.json");

const defaultDatabase: DatabaseShape = {
  clients: [],
  tasks: [],
};

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  return {
    url,
    key,
  };
}

function isSupabaseConfigured() {
  const { url, key } = resolveSupabaseConfig();
  return Boolean(url && key);
}

function getSupabaseConfigOrThrow() {
  const { url, key } = resolveSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    url,
    key,
  };
}

async function supabaseRequest<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  const { url, key } = getSupabaseConfigOrThrow();

  const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      throw new Error(data.message);
    }
    throw new Error(`Supabase request failed (${response.status})`);
  }

  return data as T;
}

function normalizeDatabase(value: Partial<DatabaseShape> | null | undefined): DatabaseShape {
  return {
    clients: Array.isArray(value?.clients) ? value.clients : [],
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
  };
}

async function ensureDatabaseExists() {
  await fs.mkdir(dataDirectoryPath, { recursive: true });

  try {
    await fs.access(databaseFilePath);
  } catch {
    await fs.writeFile(databaseFilePath, JSON.stringify(defaultDatabase, null, 2), "utf-8");
  }
}

async function readLocalDatabase(): Promise<DatabaseShape> {
  await ensureDatabaseExists();
  const raw = await fs.readFile(databaseFilePath, "utf-8");

  try {
    return normalizeDatabase(JSON.parse(raw) as DatabaseShape);
  } catch {
    return defaultDatabase;
  }
}

async function writeLocalDatabase(data: DatabaseShape) {
  await ensureDatabaseExists();
  await fs.writeFile(databaseFilePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getClients(): Promise<Client[]> {
  if (isSupabaseConfigured()) {
    const clients = await supabaseRequest<Client[]>("clients?select=*&order=company_name.asc");
    return Array.isArray(clients) ? clients : [];
  }

  const data = await readLocalDatabase();
  return data.clients;
}

interface CreateClientInput {
  company_name: string;
  country: string;
  entity_type: string;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const client: Client = {
    id: randomUUID(),
    company_name: input.company_name,
    country: input.country,
    entity_type: input.entity_type,
  };

  if (isSupabaseConfigured()) {
    const created = await supabaseRequest<Client[]>("clients?select=*", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(client),
    });

    if (!Array.isArray(created) || created.length === 0) {
      throw new Error("Failed to create client.");
    }

    return created[0];
  }

  const data = await readLocalDatabase();
  data.clients.push(client);
  await writeLocalDatabase(data);
  return client;
}

export async function getTasksByClient(clientId: string): Promise<ComplianceTask[]> {
  if (isSupabaseConfigured()) {
    const tasks = await supabaseRequest<ComplianceTask[]>(
      `tasks?select=*&client_id=eq.${encodeURIComponent(clientId)}&order=due_date.asc`,
    );
    return Array.isArray(tasks) ? tasks : [];
  }

  const data = await readLocalDatabase();
  return data.tasks.filter((task) => task.client_id === clientId);
}

interface CreateTaskInput {
  client_id: string;
  title: string;
  description: string;
  category: string;
  due_date: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export async function createTask(input: CreateTaskInput): Promise<ComplianceTask> {
  const task: ComplianceTask = {
    id: randomUUID(),
    client_id: input.client_id,
    title: input.title,
    description: input.description,
    category: input.category,
    due_date: input.due_date,
    status: input.status ?? "Pending",
    priority: input.priority ?? "Medium",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const created = await supabaseRequest<ComplianceTask[]>("tasks?select=*", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(task),
    });

    if (!Array.isArray(created) || created.length === 0) {
      throw new Error("Failed to create task.");
    }

    return created[0];
  }

  const data = await readLocalDatabase();
  data.tasks.push(task);
  await writeLocalDatabase(data);
  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<ComplianceTask | null> {
  if (isSupabaseConfigured()) {
    const updated = await supabaseRequest<ComplianceTask[]>(
      `tasks?id=eq.${encodeURIComponent(taskId)}&select=*`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({ status }),
      },
    );

    if (!Array.isArray(updated) || updated.length === 0) {
      return null;
    }

    return updated[0];
  }

  const data = await readLocalDatabase();
  const target = data.tasks.find((task) => task.id === taskId);

  if (!target) {
    return null;
  }

  target.status = status;
  await writeLocalDatabase(data);
  return target;
}
