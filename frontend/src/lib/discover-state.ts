import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getToolCatalog } from "./tools";
import type { LiveDiscoverState } from "./types";

export const FRAUD_MARKER_START = "/* LIVE_DISCOVER_START";
export const FRAUD_MARKER_END = "LIVE_DISCOVER_END */";
export const DISCOVER_BANNER = "// UNCOMMENT FOR LIVE SYNAPSE --DISCOVER DEMO";

const COMMENTED_INDEX_BLOCK = [
  DISCOVER_BANNER,
  '// import fraudRiskRoutes from "./routes/fraudRisk";',
  '// app.use("/api", fraudRiskRoutes);',
].join("\n");

const ACTIVE_INDEX_BLOCK = [
  DISCOVER_BANNER,
  'import fraudRiskRoutes from "./routes/fraudRisk";',
  'app.use("/api", fraudRiskRoutes);',
].join("\n");

export async function findRepoRoot(): Promise<string> {
  let current = process.cwd();

  for (let depth = 0; depth < 8; depth += 1) {
    const marker = path.join(current, "services", "orders-service", "src", "index.ts");
    try {
      await access(marker);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  throw new Error("Unable to locate the NexusOps repository root.");
}

export async function getDiscoverPaths() {
  const root = await findRepoRoot();
  return {
    root,
    ordersServiceDir: path.join(root, "services", "orders-service"),
    fraudRiskPath: path.join(root, "services", "orders-service", "src", "routes", "fraudRisk.ts"),
    indexPath: path.join(root, "services", "orders-service", "src", "index.ts"),
  };
}

export async function isFraudRouteActive(): Promise<boolean> {
  const { fraudRiskPath, indexPath } = await getDiscoverPaths();
  const [fraudCode, indexCode] = await Promise.all([
    readFile(fraudRiskPath, "utf8"),
    readFile(indexPath, "utf8"),
  ]);

  const routeUnwrapped =
    !fraudCode.includes(FRAUD_MARKER_START) && !fraudCode.includes(FRAUD_MARKER_END);
  const indexUncommented =
    indexCode.includes('import fraudRiskRoutes from "./routes/fraudRisk";') &&
    indexCode.includes('app.use("/api", fraudRiskRoutes);');

  return routeUnwrapped && indexUncommented;
}

export async function toggleFraudRoute(action: "activate" | "deactivate"): Promise<boolean> {
  const { fraudRiskPath, indexPath } = await getDiscoverPaths();
  let fraudCode = await readFile(fraudRiskPath, "utf8");
  let indexCode = await readFile(indexPath, "utf8");
  let changed = false;

  if (action === "activate") {
    if (fraudCode.includes(FRAUD_MARKER_START) && fraudCode.includes(FRAUD_MARKER_END)) {
      fraudCode = fraudCode
        .replace(FRAUD_MARKER_START, "")
        .replace(FRAUD_MARKER_END, "");
      changed = true;
    }
    if (indexCode.includes(COMMENTED_INDEX_BLOCK)) {
      indexCode = indexCode.replace(COMMENTED_INDEX_BLOCK, ACTIVE_INDEX_BLOCK);
      changed = true;
    }
  } else {
    const exportLine = "export default router;";
    const startIndex = fraudCode.indexOf(FRAUD_MARKER_START);
    const endIndex = fraudCode.indexOf(FRAUD_MARKER_END);
    const misplacedExportIndex =
      startIndex >= 0 && endIndex >= 0 ? fraudCode.indexOf(exportLine, startIndex) : -1;

    if (misplacedExportIndex >= 0 && misplacedExportIndex < endIndex) {
      const beforeEnd = fraudCode
        .slice(0, endIndex)
        .replace(exportLine, "")
        .trimEnd();
      const afterEnd = fraudCode.slice(endIndex + FRAUD_MARKER_END.length);
      fraudCode = `${beforeEnd}\n${FRAUD_MARKER_END}\n\n${exportLine}${afterEnd}`;
      changed = true;
    }

    const handlerStart = fraudCode.indexOf("function codFraudRiskHandler");
    const registrationLine = 'router.get("/orders/cod-fraud-risk", codFraudRiskHandler);';
    const registrationIndex = fraudCode.indexOf(registrationLine);
    const blockEnd =
      registrationIndex >= 0 ? registrationIndex + registrationLine.length : fraudCode.length;

    if (
      !fraudCode.includes(FRAUD_MARKER_START) &&
      !fraudCode.includes(FRAUD_MARKER_END) &&
      handlerStart >= 0 &&
      blockEnd > handlerStart
    ) {
      const block = fraudCode.slice(handlerStart, blockEnd).trim();
      const suffix = fraudCode.slice(blockEnd);
      fraudCode = `${fraudCode.slice(0, handlerStart)}${FRAUD_MARKER_START}\n${block}\n${FRAUD_MARKER_END}\n${suffix}`;
      changed = true;
    }
    if (indexCode.includes(ACTIVE_INDEX_BLOCK)) {
      indexCode = indexCode.replace(ACTIVE_INDEX_BLOCK, COMMENTED_INDEX_BLOCK);
      changed = true;
    }
  }

  if (changed) {
    await Promise.all([
      writeFile(fraudRiskPath, fraudCode, "utf8"),
      writeFile(indexPath, indexCode, "utf8"),
    ]);
  }

  return changed;
}

export async function getLiveDiscoverState(): Promise<LiveDiscoverState> {
  const active = await isFraudRouteActive();
  return {
    active,
    routePath: "/api/orders/cod-fraud-risk",
    toolName: "getCodFraudRisk",
    generatedServerId: "orders-mcp",
    transport: {
      transport: "stdio",
      runner: "npx",
      package: "@2ndbrainlabs-ai/synapse-cli",
      serverName: "orders-mcp",
    },
    registeredTools: getToolCatalog(active)
      .filter((tool) => tool.serverKey === "orders")
      .map((tool) => tool.name),
    cliCommand: "npx @2ndbrainlabs-ai/synapse-cli build --discover --smart-names",
  };
}
