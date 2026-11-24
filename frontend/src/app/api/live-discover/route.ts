import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { getDiscoverPaths, getLiveDiscoverState, toggleFraudRoute } from "@/lib/discover-state";
import type { LiveDiscoverResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CliResult {
  executed: boolean;
  success: boolean;
  output: string[];
}

function runSynapseCli(workingDirectory: string, command: string): Promise<CliResult> {
  if (process.env.NEXUSOPS_RUN_SYNAPSE_CLI !== "true") {
    return Promise.resolve({
      executed: false,
      success: true,
      output: [
        `$ ${command}`,
        "[nexusops] Route source and index registration updated on disk.",
        "[nexusops] Tool catalog registered dynamically in the dashboard.",
        "[nexusops] Set NEXUSOPS_RUN_SYNAPSE_CLI=true to invoke the hosted Synapse CLI from this panel.",
      ],
    });
  }

  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = ["--yes", "@2ndbrainlabs-ai/synapse-cli", "build", "--discover", "--smart-names"];

  return new Promise((resolve) => {
    execFile(
      executable,
      args,
      {
        cwd: workingDirectory,
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 4,
        env: { ...process.env, SYNAPSE_NON_INTERACTIVE: "1" },
      },
      (error, stdout, stderr) => {
        const output = [
          `$ ${command}`,
          ...String(stdout || "")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0),
          ...String(stderr || "")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0),
        ];
        resolve({ executed: true, success: !error, output });
      },
    );
  });
}

export async function GET() {
  try {
    const state = await getLiveDiscoverState();
    const payload: LiveDiscoverResponse = {
      ...state,
      action: "status",
      cliOutput: [`$ ${state.cliCommand}`, `[nexusops] Route state: ${state.active ? "active" : "dormant"}.`],
      cliExecuted: false,
      restartRequired: false,
      message: state.active
        ? "The COD fraud-risk route is active and registered."
        : "The COD fraud-risk route is dormant and ready for live discovery.",
    };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to read discover state." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: unknown };
    const action = body.action === "deactivate" ? "deactivate" : "activate";
    const changed = await toggleFraudRoute(action);
    const { ordersServiceDir } = await getDiscoverPaths();
    const state = await getLiveDiscoverState();
    const cli = await runSynapseCli(ordersServiceDir, state.cliCommand);

    const payload: LiveDiscoverResponse = {
      ...state,
      action,
      cliOutput: [
        `=== ${action === "activate" ? "Activating" : "Deactivating"} GET /api/orders/cod-fraud-risk ===`,
        ...cli.output,
        `[nexusops] orders-mcp tool count: ${state.registeredTools.length}`,
        `[nexusops] Route file changed: ${changed ? "yes" : "no (already in requested state)"}`,
      ],
      cliExecuted: cli.executed,
      restartRequired: true,
      message:
        action === "activate"
          ? "COD fraud-risk route activated and getCodFraudRisk registered. tsx watch will restart System A."
          : "COD fraud-risk route returned to its dormant state and its tool was unregistered.",
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to toggle live discovery." },
      { status: 500 },
    );
  }
}
