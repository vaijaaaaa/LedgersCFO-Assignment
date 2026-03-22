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
const clientsKey = "compliance:clients";
const tasksKey = "compliance:tasks";

const defaultDatabase: DatabaseShape = {
  clients: [],
  tasks: [],
};

interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}

function resolveKvCredentials() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  return {
    url,
    token,
  };
}

function ensureKvEnvAliases() {
  if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
    process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL;
  }

  if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
    process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  }
}

function isKvConfigured() {
  const { url, token } = resolveKvCredentials();
  return Boolean(url && token);
}

async function getKvClient(): Promise<KvClient> {
  ensureKvEnvAliases();

  const dynamicImport = new Function("modulePath", "return import(modulePath)") as (
    modulePath: string,
  ) => Promise<{ kv: KvClient }>;
  const module = await dynamicImport("@vercel/kv");
  return module.kv as KvClient;
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

async function readDatabase(): Promise<DatabaseShape> {
  if (isKvConfigured()) {
    const kv = await getKvClient();
    const [kvClients, kvTasks] = await Promise.all([
      kv.get<Client[]>(clientsKey),
      kv.get<ComplianceTask[]>(tasksKey),
    ]);

    const hasClients = Array.isArray(kvClients);
    const hasTasks = Array.isArray(kvTasks);

    if (hasClients && hasTasks) {
      return {
        clients: kvClients,
        tasks: kvTasks,
      };
    }

    const seedData = await readSeedDatabase();
    const hydratedData: DatabaseShape = {
      clients: hasClients ? kvClients : seedData.clients,
      tasks: hasTasks ? kvTasks : seedData.tasks,
    };

    if (!hasClients) {
      await kv.set(clientsKey, hydratedData.clients);
    }

    if (!hasTasks) {
      await kv.set(tasksKey, hydratedData.tasks);
    }

    return hydratedData;
  }

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

async function writeDatabase(data: DatabaseShape) {
  if (isKvConfigured()) {
    const kv = await getKvClient();
    await Promise.all([kv.set(clientsKey, data.clients), kv.set(tasksKey, data.tasks)]);
    return;
  }

  await ensureDatabaseExists();
  await fs.writeFile(databaseFilePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getClients(): Promise<Client[]> {
  const data = await readDatabase();
  return data.clients;
}

interface CreateClientInput {
  company_name: string;
  country: string;
  entity_type: string;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const data = await readDatabase();

  const client: Client = {
    id: randomUUID(),
    company_name: input.company_name,
    country: input.country,
    entity_type: input.entity_type,
  };

  data.clients.push(client);
  await writeDatabase(data);
  return client;
}

export async function getTasksByClient(clientId: string): Promise<ComplianceTask[]> {
  const data = await readDatabase();
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
  const data = await readDatabase();

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

  data.tasks.push(task);
  await writeDatabase(data);
  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<ComplianceTask | null> {
  const data = await readDatabase();
  const target = data.tasks.find((task) => task.id === taskId);

  if (!target) {
    return null;
  }

  target.status = status;
  await writeDatabase(data);
  return target;
}
