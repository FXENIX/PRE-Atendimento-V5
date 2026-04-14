import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import {
  createEvolutionServer,
  listEvolutionServers,
  getEvolutionServerWithKey,
  createEvolutionInstance,
  listEvolutionInstances,
  updateInstanceStatus,
} from "../store/evolution-servers";

const router: IRouter = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────

async function evoProxy(
  url: string,
  apiKey: string,
  method = "GET",
  body?: unknown,
  timeoutMs = 15000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = { apikey: apiKey };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const ct = response.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data };
}

function extractToken(data: unknown): string {
  if (typeof data !== "object" || !data) return "";
  const d = data as Record<string, unknown>;
  const inst = d.instance as Record<string, unknown> | undefined;
  return (
    (inst?.token as string) ?? (inst?.apikey as string) ?? (d.token as string) ?? (d.apikey as string) ?? ""
  );
}

function extractJid(data: unknown): string {
  if (typeof data !== "object" || !data) return "";
  const d = data as Record<string, unknown>;
  const inst = d.instance as Record<string, unknown> | undefined;
  return (
    (inst?.ownerJid as string) ?? (inst?.jid as string) ?? (d.ownerJid as string) ?? (d.jid as string) ?? ""
  );
}

// ── Evolution Servers ─────────────────────────────────────────

router.get("/evolution-servers", async (_req, res) => {
  const servers = await listEvolutionServers();
  res.json({ servers });
});

router.post("/evolution-servers", async (req, res) => {
  const { name, apiUrl, apiKey } = req.body as {
    name?: string; apiUrl?: string; apiKey?: string;
  };

  if (!name?.trim()) { res.status(400).json({ message: "Nome do servidor é obrigatório." }); return; }
  if (!apiUrl?.trim()) { res.status(400).json({ message: "URL da Evolution API é obrigatória." }); return; }
  if (!apiKey?.trim()) { res.status(400).json({ message: "API Key é obrigatória." }); return; }

  try { new URL(apiUrl.trim()); } catch {
    res.status(400).json({ message: "URL inválida. Inclua o protocolo (https://)." }); return;
  }

  try {
    const server = await createEvolutionServer(name.trim(), apiUrl.trim(), apiKey.trim());
    res.json({ server });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar servidor.";
    res.status(500).json({ message: msg });
  }
});

// ── Evolution Instances ───────────────────────────────────────

router.get("/evolution-servers/:serverId/instances", async (req, res) => {
  const { serverId } = req.params;
  const instances = await listEvolutionInstances(serverId);
  res.json({ instances });
});

router.post("/evolution-servers/:serverId/instances", async (req, res) => {
  const { serverId } = req.params;
  const { instanceName, integration } = req.body as {
    instanceName?: string; integration?: string;
  };

  if (!instanceName?.trim()) {
    res.status(400).json({ message: "Nome da instância é obrigatório." }); return;
  }

  const server = await getEvolutionServerWithKey(serverId);
  if (!server) {
    res.status(404).json({ message: "Servidor não encontrado." }); return;
  }

  try {
    // 1. Create instance on the Evolution API
    const { ok, status, data } = await evoProxy(
      `${server.apiUrl}/instance/create`,
      server.apiKey,
      "POST",
      {
        instanceName: instanceName.trim(),
        integration: integration ?? "WHATSAPP-BAILEYS",
        qrcode: false,
      },
    );

    if (!ok && status !== 409) {
      const errMsg =
        typeof data === "object" && data !== null
          ? ((data as Record<string, unknown>).message as string) ?? `Erro ${status} na Evolution API.`
          : `Erro ${status} na Evolution API.`;
      res.status(502).json({ message: errMsg }); return;
    }

    // 2. Extract token/jid from response
    const instanceToken = extractToken(data);
    const instanceJid = extractJid(data);
    const instanceStatus = status === 409 ? "existing" : "created";

    // 3. Save to Supabase
    const instance = await createEvolutionInstance(
      serverId,
      instanceName.trim(),
      instanceToken,
      instanceJid,
      instanceStatus,
    );

    res.json({ instance });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    res.status(502).json({ message: msg });
  }
});

router.patch("/evolution-servers/:serverId/instances/:instanceId/status", async (req, res) => {
  const { instanceId } = req.params;
  const { status, instanceJid } = req.body as { status?: string; instanceJid?: string };

  if (!status?.trim()) {
    res.status(400).json({ message: "Status é obrigatório." }); return;
  }

  const updated = await updateInstanceStatus(instanceId, status.trim(), instanceJid);
  if (!updated) {
    res.status(404).json({ message: "Instância não encontrada." }); return;
  }

  res.json({ instance: updated });
});

export default router;
