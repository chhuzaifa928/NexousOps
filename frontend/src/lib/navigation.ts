export type WorkspaceView = "home" | "orders" | "copilot" | "data" | "discovery";

interface ViewMeta {
  label: string;
  title: string;
  description: string;
}

export const VIEW_META: Record<WorkspaceView, ViewMeta> = {
  home: {
    label: "Home",
    title: "Welcome back, Alex",
    description: "A simple view of what needs attention across your business today.",
  },
  orders: {
    label: "Orders",
    title: "Orders needing attention",
    description: "See delays, stock problems and support risks in plain language.",
  },
  copilot: {
    label: "Copilot",
    title: "Ask NexusOps",
    description: "Get an answer with the evidence behind it, then approve any changes.",
  },
  data: {
    label: "Data",
    title: "Behind the answers",
    description: "See which systems and information the assistant can use.",
  },
  discovery: {
    label: "Discovery",
    title: "Add a new capability",
    description: "Watch NexusOps find a new check and make it available to the assistant.",
  },
};
