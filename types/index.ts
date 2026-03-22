export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Client {
  id: string;
  company_name: string;
  country: string;
  entity_type: string;
}

export interface ComplianceTask {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
}

export interface DatabaseShape {
  clients: Client[];
  tasks: ComplianceTask[];
}
