"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Client, ComplianceTask, TaskPriority, TaskStatus } from "@/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const priorities: TaskPriority[] = ["Low", "Medium", "High"];

interface TaskFormState {
  title: string;
  description: string;
  category: string;
  due_date: string;
  priority: TaskPriority;
}

const initialFormState: TaskFormState = {
  title: "",
  description: "",
  category: "",
  due_date: "",
  priority: "Medium",
};

interface ClientFormState {
  company_name: string;
  country: string;
  entity_type: string;
}

const initialClientFormState: ClientFormState = {
  company_name: "",
  country: "",
  entity_type: "",
};

function isOverdue(task: ComplianceTask) {
  if (task.status === "Completed") {
    return false;
  }

  return new Date(task.due_date).getTime() < new Date().getTime();
}

function toDateInputValue(date: string) {
  return date.slice(0, 10);
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [formState, setFormState] = useState<TaskFormState>(initialFormState);
  const [clientFormState, setClientFormState] = useState<ClientFormState>(initialClientFormState);
  const [loading, setLoading] = useState(true);
  const [savingClient, setSavingClient] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const response = await fetch("/api/clients", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load clients");
        }

        const data = (await response.json()) as { clients: Client[] };
        setClients(data.clients);

        if (data.clients.length > 0) {
          setSelectedClientId(data.clients[0].id);
        }
      } catch {
        setError("Failed to load clients.");
      } finally {
        setLoading(false);
      }
    }

    void loadClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setTasks([]);
      return;
    }

    async function loadTasks() {
      try {
        const response = await fetch(`/api/clients/${selectedClientId}/tasks`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load tasks");
        }

        const data = (await response.json()) as { tasks: ComplianceTask[] };
        setTasks(data.tasks);
      } catch {
        setError("Failed to load tasks.");
      }
    }

    void loadTasks();
  }, [selectedClientId]);

  const categories = useMemo(() => {
    const values = new Set(tasks.map((task) => task.category));
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatches = statusFilter === "All" || task.status === statusFilter;
      const categoryMatches = categoryFilter === "All" || task.category === categoryFilter;
      return statusMatches && categoryMatches;
    });
  }, [tasks, statusFilter, categoryFilter]);

  const summary = useMemo(() => {
    const pending = tasks.filter((task) => task.status !== "Completed").length;
    const overdue = tasks.filter((task) => isOverdue(task)).length;

    return {
      total: tasks.length,
      pending,
      overdue,
    };
  }, [tasks]);

  async function refreshTasks() {
    if (!selectedClientId) {
      return;
    }

    const response = await fetch(`/api/clients/${selectedClientId}/tasks`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to refresh tasks");
    }

    const data = (await response.json()) as { tasks: ComplianceTask[] };
    setTasks(data.tasks);
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClientId) {
      return;
    }

    setError("");
    setSavingTask(true);

    try {
      const response = await fetch(`/api/clients/${selectedClientId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          category: formState.category,
          due_date: formState.due_date,
          priority: formState.priority,
          status: "Pending",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to create task");
      }

      setFormState(initialFormState);
      await refreshTasks();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Failed to add task.");
      }
    } finally {
      setSavingTask(false);
    }
  }

  async function handleSubmitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSavingClient(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientFormState),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to create client");
      }

      const payload = (await response.json()) as { client: Client };
      setClients((previousClients) => [...previousClients, payload.client]);
      setSelectedClientId(payload.client.id);
      setClientFormState(initialClientFormState);
    } catch (clientError) {
      if (clientError instanceof Error) {
        setError(clientError.message);
      } else {
        setError("Failed to create client.");
      }
    } finally {
      setSavingClient(false);
    }
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to update status");
      }

      setTasks((previousTasks) =>
        previousTasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
    } catch (statusError) {
      if (statusError instanceof Error) {
        setError(statusError.message);
      } else {
        setError("Failed to update task status.");
      }
    }
  }

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Compliance Task Tracker</h1>
        <p className="text-sm text-zinc-600">Track tasks by client, status, and due date.</p>
      </header>

      {loading ? <p className="text-sm text-zinc-600">Loading...</p> : null}

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <section className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
              <CardDescription>Select a client to view tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {clients.map((client) => {
                const active = selectedClientId === client.id;
                return (
                  <Button
                    key={client.id}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="h-auto w-full justify-start py-2 text-left"
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <span>
                      <span className="block text-sm font-medium">{client.company_name}</span>
                      <span className={`block text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                        {client.country} · {client.entity_type}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Client</CardTitle>
              <CardDescription>Create a new client dynamically.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitClient} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    required
                    value={clientFormState.company_name}
                    onChange={(event) =>
                      setClientFormState((previous) => ({
                        ...previous,
                        company_name: event.target.value,
                      }))
                    }
                    placeholder="Northstar Finance"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    required
                    value={clientFormState.country}
                    onChange={(event) =>
                      setClientFormState((previous) => ({ ...previous, country: event.target.value }))
                    }
                    placeholder="India"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entity_type">Entity Type</Label>
                  <Input
                    id="entity_type"
                    required
                    value={clientFormState.entity_type}
                    onChange={(event) =>
                      setClientFormState((previous) => ({
                        ...previous,
                        entity_type: event.target.value,
                      }))
                    }
                    placeholder="Private Limited"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={savingClient}>
                  {savingClient ? "Adding..." : "Add Client"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <Card>
            <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{selectedClient?.company_name ?? "Tasks"}</h2>
                <p className="text-sm text-zinc-600">Manage compliance tasks for the selected client.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-72">
                <div className="rounded-md border border-zinc-200 px-3 py-2 bg-zinc-50">
                  <p className="font-semibold text-zinc-900">{summary.total}</p>
                  <p className="text-zinc-500">Total</p>
                </div>
                <div className="rounded-md border border-zinc-200 px-3 py-2 bg-zinc-50">
                  <p className="font-semibold text-zinc-900">{summary.pending}</p>
                  <p className="text-zinc-500">Pending</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <p className="font-semibold text-red-700">{summary.overdue}</p>
                  <p className="text-zinc-500">Overdue</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status_filter">Filter by status</Label>
                <DropdownSelect
                  id="status_filter"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: "All", label: "All" },
                    ...statuses.map((status) => ({ value: status, label: status })),
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category_filter">Filter by category</Label>
                <DropdownSelect
                  id="category_filter"
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={[
                    { value: "All", label: "All" },
                    ...categories.map((category) => ({ value: category, label: category })),
                  ]}
                />
              </div>
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
              <CardDescription>Overdue pending tasks are highlighted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-zinc-500">No tasks found for this filter.</p>
              ) : (
                filteredTasks
                  .slice()
                  .sort(
                    (left, right) =>
                      new Date(left.due_date).getTime() - new Date(right.due_date).getTime(),
                  )
                  .map((task) => {
                    const overdue = isOverdue(task);

                    return (
                      <Card
                        key={task.id}
                        className={`rounded-lg border p-3 ${
                          overdue
                            ? "border-red-300 bg-red-50"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-900">{task.title}</p>
                            <p className="mt-1 text-sm text-zinc-600">{task.description || "No description"}</p>
                            <p className="mt-2 text-xs text-zinc-500">
                              {task.category} · Priority: {task.priority} · Due: {toDateInputValue(task.due_date)}
                            </p>
                          </div>

                          <div className="min-w-40 space-y-1.5">
                            <Label className="text-xs">Status</Label>
                            <DropdownSelect
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                              options={statuses.map((status) => ({ value: status, label: status }))}
                            />
                            {overdue ? (
                              <Badge variant="overdue">Overdue</Badge>
                            ) : task.status === "Completed" ? (
                              <Badge variant="success">Completed</Badge>
                            ) : (
                              <Badge>Open</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Task</CardTitle>
              <CardDescription>Create a new compliance task for selected client.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTask} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="task_title">Title</Label>
                    <Input
                      id="task_title"
                      required
                      value={formState.title}
                      onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))}
                      placeholder="e.g. Corporate tax filing"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="task_description">Description</Label>
                    <Textarea
                      id="task_description"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, description: event.target.value }))
                      }
                      placeholder="Optional details"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task_category">Category</Label>
                    <Input
                      id="task_category"
                      required
                      value={formState.category}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, category: event.target.value }))
                      }
                      placeholder="Tax"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task_due_date">Due Date</Label>
                    <Input
                      id="task_due_date"
                      required
                      type="date"
                      value={formState.due_date}
                      onChange={(event) =>
                        setFormState((previous) => ({ ...previous, due_date: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task_priority">Priority</Label>
                    <DropdownSelect
                      id="task_priority"
                      value={formState.priority}
                      onValueChange={(value) =>
                        setFormState((previous) => ({
                          ...previous,
                          priority: value as TaskPriority,
                        }))
                      }
                      options={priorities.map((priority) => ({ value: priority, label: priority }))}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={!selectedClientId || savingTask}>
                  {savingTask ? "Adding..." : "Add Task"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
