import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

const port = Number(process.env.PORT || 4859);
const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/demo/index.html" : url.pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, safe);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, "index.html");
  response.writeHead(200, { "content-type": types.get(extname(file)) || "application/octet-stream" });
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`date-picker demo: http://127.0.0.1:${port}/demo/index.html`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `port ${port} is already in use. Kill the running dev server with \`bun run dev:kill\`, or start with a different PORT: \`PORT=xxxx bun run dev\`.`,
    );
    process.exitCode = 1;
    return;
  }
  throw error;
});
