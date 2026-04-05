import { app as i, BrowserWindow as w, ipcMain as s, shell as _, dialog as h } from "electron";
import { dirname as v, join as t } from "path";
import { execFile as E } from "child_process";
import { fileURLToPath as V } from "url";
const x = V(import.meta.url), f = v(x);
process.env.DIST = t(f, "../dist");
process.env.VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
let e;
const u = t(process.cwd(), "backend/nutzip.exe");
function R() {
  e = new w({
    width: 1e3,
    height: 700,
    frame: !1,
    transparent: !0,
    backgroundColor: "#00000000",
    icon: t(f, "../assets/nut-icon.png"),
    // Placeholder icon for production
    webPreferences: {
      preload: t(f, "preload.js"),
      nodeIntegration: !0,
      contextIsolation: !1,
      sandbox: !1
    }
  }), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(t(process.env.DIST, "index.html")), s.on("window-control", (o, n) => {
    switch (n) {
      case "minimize":
        e == null || e.minimize();
        break;
      case "maximize":
        e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
        break;
      case "close":
        e == null || e.close();
        break;
    }
  }), s.on("open-in-folder", (o, n) => {
    _.showItemInFolder(n);
  }), s.on("open-external", (o, n) => {
    _.openExternal(n);
  }), s.handle("select-file", async () => {
    const { filePaths: o } = await h.showOpenDialog({
      properties: ["openFile", "multiSelections"]
    });
    return o;
  }), s.handle("select-folder", async () => {
    const { filePaths: o } = await h.showOpenDialog({
      properties: ["openDirectory"]
    });
    return o[0];
  }), s.handle("compress-file", async (o, { inputs: n, output: a, format: l, level: c }) => new Promise((p, r) => {
    const d = ["compress", a, l, c.toString(), n.length.toString(), ...n];
    E(u, d, (m, g, D) => {
      if (m) {
        r(m);
        return;
      }
      p(g);
    });
  })), s.handle("decompress-file", async (o, { input: n, output: a, format: l }) => new Promise((c, p) => {
    E(u, ["decompress", n, a, l], (r, d, m) => {
      if (r) {
        p(r);
        return;
      }
      c(d);
    });
  }));
}
i.whenReady().then(R);
i.on("window-all-closed", () => {
  process.platform !== "darwin" && (i.quit(), e = null);
});
i.on("activate", () => {
  w.getAllWindows().length === 0 && R();
});
