// Popup UI: connect / disconnect the extension to the backend.

async function refreshStatus(): Promise<void> {
  const s = (await chrome.runtime.sendMessage({ type: "ab:status" })) as { connected: boolean; currentApply: unknown };
  const el = document.getElementById("status");
  if (!el) return;
  if (s?.connected) {
    el.textContent = s.currentApply ? "Running an application..." : "Connected. Waiting for jobs.";
    el.style.color = "#059669";
  } else {
    el.textContent = "Not connected.";
    el.style.color = "#6b7280";
  }
}

document.getElementById("connect")?.addEventListener("click", async () => {
  const baseUrl = (document.getElementById("baseUrl") as HTMLInputElement).value.trim();
  const token = (document.getElementById("token") as HTMLInputElement).value.trim();
  const deviceId = `dev-${Math.random().toString(36).slice(2, 10)}`;
  await chrome.runtime.sendMessage({ type: "ab:connect", cfg: { baseUrl, token, deviceId } });
  await refreshStatus();
});
document.getElementById("disconnect")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "ab:disconnect" });
  await refreshStatus();
});
refreshStatus();
