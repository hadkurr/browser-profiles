const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

function buildApiBase(): string {
  if (domain) {
    const parts = domain.split(".");
    parts[0] = parts[0] + "-8080";
    return "https://" + parts.join(".");
  }
  return "http://localhost:8080";
}

export const API_BASE = buildApiBase();

export async function runPythonScript(
  code: string,
  timeout = 30
): Promise<{ stdout: string; stderr: string; exitCode: number; duration: number }> {
  const res = await fetch(`${API_BASE}/api/script/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, timeout }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Lỗi server");
  }
  return res.json();
}

export async function installPipPackages(
  packages: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number; installed: string[] }> {
  const res = await fetch(`${API_BASE}/api/script/pip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Lỗi server");
  }
  return res.json();
}

export async function getPythonVersion(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/script/python-version`);
    const data = await res.json() as { version?: string };
    return data.version ?? "Không xác định";
  } catch {
    return "Không kết nối được";
  }
}
