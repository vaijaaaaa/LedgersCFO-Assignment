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

async function ensureDatabaseExists() {
  await fs.mkdir(dataDirectoryPath, { recursive: true });

  try {
    await fs.access(databaseFilePath);
  } catch {
    await fs.writeFile(databaseFilePath, JSON.stringify(defaultDatabase, null, 2), "utf-8");
  }
}

async function readDatabase(): Promise<DatabaseShape> {
  await ensureDatabaseExists();
  const raw = await fs.readFile(databaseFilePath, "utf-8");

  try {
    const parsed = JSON.parse(raw) as DatabaseShape;
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return defaultDatabase;
  }
}

async function writeDatabase(data: DatabaseShape) {
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
