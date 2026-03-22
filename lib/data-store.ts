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
const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const defaultDatabase: DatabaseShape = {
  clients: [],
  tasks: [],
};

interface SupabaseAdminClient {
  from: (table: string) => {
    select: (columns?: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      eq: (column: string, value: string) => {
        order: (orderColumn: string, options?: { ascending?: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      single: () => Promise<{ data: unknown | null; error: { message: string } | null }>;
    };
    insert: (value: unknown | unknown[]) => {
      select: (columns?: string) => {
        single: () => Promise<{ data: unknown | null; error: { message: string } | null }>;
      };
    };
    update: (value: unknown) => {
      eq: (column: string, matchValue: string) => {
        select: (columns?: string) => {
          single: () => Promise<{ data: unknown | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

async function getSupabaseClient(): Promise<SupabaseAdminClient> {
  const dynamicImport = new Function("modulePath", "return import(modulePath)") as (
    modulePath: string,
  ) => Promise<{ createClient: (url: string, key: string, options: unknown) => SupabaseAdminClient }>;
  const module = await dynamicImport("@supabase/supabase-js");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }

  return module.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
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

async function readSeedDatabase(): Promise<DatabaseShape> {
  try {
    const raw = await fs.readFile(databaseFilePath, "utf-8");
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
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseClient();
    const result = await supabase.from("clients").select("*").order("company_name", { ascending: true });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []) as Client[];
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

  if (isSupabaseConfigured) {
    const supabase = await getSupabaseClient();
    const result = await supabase.from("clients").insert(client).select("*").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data as Client;
  }

  const data = await readLocalDatabase();
  data.clients.push(client);
  await writeLocalDatabase(data);
  return client;
}

export async function getTasksByClient(clientId: string): Promise<ComplianceTask[]> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseClient();
    const result = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .order("due_date", { ascending: true });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data ?? []) as ComplianceTask[];
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

  if (isSupabaseConfigured) {
    const supabase = await getSupabaseClient();
    const result = await supabase.from("tasks").insert(task).select("*").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data as ComplianceTask;
  }

  const data = await readLocalDatabase();
  data.tasks.push(task);
  await writeLocalDatabase(data);
  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<ComplianceTask | null> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseClient();
    const result = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .select("*")
      .single();

    if (result.error) {
      if (result.error.message.toLowerCase().includes("no rows")) {
        return null;
      }
      throw new Error(result.error.message);
    }

    return result.data as ComplianceTask;
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
