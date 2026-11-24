export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSla(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes <= 0) return "Breached";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function statusTone(status: string): string {
  switch (status) {
    case "Delayed":
    case "Critical":
    case "Escalated":
      return "bg-red-50 text-critical border-red-200";
    case "Processing":
    case "High":
    case "Open":
      return "bg-amber-50 text-warning border-amber-200";
    case "In Transit":
    case "Gold":
      return "bg-blue-50 text-cobalt border-blue-200";
    case "Delivered":
    case "Resolved":
    case "VIP":
      return "bg-emerald-50 text-success border-emerald-200";
    default:
      return "bg-limestone text-muted border-hairline";
  }
}

export function tierTone(tier: string): string {
  if (tier === "VIP") return "border-red-200 bg-red-50 text-critical";
  if (tier === "Gold") return "border-blue-200 bg-blue-50 text-cobalt";
  return "border-hairline bg-limestone text-muted";
}

export function stockTone(net: number): string {
  if (net < 0) return "text-critical";
  if (net <= 4) return "text-warning";
  return "text-success";
}
