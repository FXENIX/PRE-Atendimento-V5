import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { getConfig, getPublicConfig, saveConfig } from "../store/evolution-config";

const router: IRouter = Router();
router.use(requireAuth);

function normalizeEvoUrl(raw: string): { normalized: string; stripped: string | null } {
  const parsed = new URL(raw.trim());
  const origin = parsed.origin;
  const hadPath = parsed.pathname !== "/" && parsed.pathname !== "";
  return {
    normalized: origin,
    stripped: hadPath ? parsed.pathname : null,
  };
}

function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

router.get("/evolution-config", async (req, res) => {
  const userId = req.jwtUser!.id;
  const cfg = await getPublicConfig(userId);
  res.json({ config: cfg ?? null });
});

router.post("/evolution-config", async (req, res) => {
  const userId = req.jwtUser!.id;
  const { url, apiKey } = req.body as {
    url?: string; apiKey?: string;
  };

  if (!url?.trim()) {
    res.status(400).json({ message: "A URL da Evolution API é obrigatória." }); return;
  }

  let parsed: ReturnType<typeof normalizeEvoUrl>;
  try {
    parsed = normalizeEvoUrl(url);
  } catch {
    res.status(400).json({ message: "URL inválida. Inclua o protocolo (https://)." }); return;
  }

  const existing = await getConfig(userId);
  if (!apiKey?.trim() && !existing?.apiKey) {
    res.status(400).json({ message: "API Key é obrigatória na primeira configuração." }); return;
  }

  const instanceName = existing?.instanceName || `inst-${userId.replace(/-/g, "").slice(0, 12)}`;
  const saved = await saveConfig(userId, parsed.normalized, apiKey?.trim() ?? "", instanceName);

  res.json({
    config: saved,
    urlNormalized: parsed.stripped
      ? `Caminho removido da URL: "${parsed.stripped}" — salvo como "${parsed.normalized}"`
      : null,
  });
});

router.put("/evolution-config", async (req, res) => {
  const userId = req.jwtUser!.id;
  const body = req.body as { url?: string; apiKey?: string; instanceName?: string };

  const existing = await getConfig(userId);

  let finalUrl = body.url?.trim() || existing?.url || "";
  let urlWarning: string | null = null;

  if (body.url?.trim()) {
    try {
      const parsed = normalizeEvoUrl(body.url.trim());
      if (parsed.stripped) urlWarning = `Caminho removido da URL: "${parsed.stripped}" — salvo como "${parsed.normalized}"`;
      finalUrl = parsed.normalized;
    } catch {
      res.status(400).json({ message: "URL inválida. Inclua o protocolo (https://)." }); return;
    }
  }

  const finalKey = body.apiKey?.trim() || existing?.apiKey || "";

  const finalInstance = "instanceName" in body
    ? (body.instanceName?.trim() ?? "")
    : (existing?.instanceName ?? "");

  if (!finalUrl || !finalKey) {
    res.status(400).json({ message: "Configure URL e API Key primeiro." }); return;
  }

  const saved = await saveConfig(userId, finalUrl, finalKey, finalInstance);
  res.json({ config: saved, urlWarning });
});

router.post("/evolution-config/test", async (req, res) => {
  const userId = req.jwtUser!.id;
  const cfg = await getConfig(userId);

  if (!cfg) {
    res.status(400).json({ message: "Nenhuma configuração salva. Preencha e salve primeiro." }); return;
  }

  try {
    const response = await fetch(
      buildUrl(cfg.url, `/instance/connectionState/${cfg.instanceName}`),
      {
        method: "GET",
        headers: { apikey: cfg.apiKey },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (response.ok) {
      res.json({ ok: true, message: "Conexão estabelecida com sucesso." });
    } else if (response.status === 404) {
      res.json({ ok: true, message: "Conexão com a Evolution API estabelecida. A instância ainda não foi criada." });
    } else {
      const body = await response.text().catch(() => "");
      res.status(502).json({ ok: false, message: `Servidor respondeu com status ${response.status}.`, detail: body.slice(0, 200) });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    req.log.error({ err }, "Falha ao testar Evolution API");
    res.status(502).json({ ok: false, message: `Falha na conexão: ${msg}` });
  }
});

export default router;
