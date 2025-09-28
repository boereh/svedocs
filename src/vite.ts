import { isAbsolute, resolve } from "path";
import { createServer, type Plugin } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { glob } from "glob";
import type { UserConfig, SiteConfig } from ".";
import { defu } from "defu";
import { readdir } from "node:fs/promises";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { compile } from "mdsvex";
import type { Options as SvelteOptions } from "@sveltejs/vite-plugin-svelte";

export const SOURCE_DIR = resolve(fileURLToPath(import.meta.url), "..");
export const HTML_HEAD_ID = "<!--%belt.head%-->";
export const HTML_BODY_ID = "<!--%belt.body%-->";
export const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script defer type="module" src="${SOURCE_DIR}/client.mjs"></script>
    </head>
    <body>
        <div id="__svedocs"></div>
    </body>
</html>`;

export function svedocs(config: UserConfig) {
  const svelte_options = defu<SvelteOptions, [SvelteOptions]>(config.svelte, {
    configFile: false,
    preprocess: [vitePreprocess()],
  });

  const svedocs_plugin: Plugin = {
    name: "vite-plugin-svedocs",
    enforce: "pre",
    load(id, options) {
      if (id === "$app") {
        return `export const config = ${JSON.stringify(config)}`;
      }
    },
    resolveId(source, importer, options) {
      if (source === "$app") return "$app";
    },
    async transform(code, id, options) {
      if (id.endsWith("layout.mjs")) {
        console.log(code);
      }

      if (id.endsWith(".md")) {
        const result = await compile(code);
        if (!result) return "";

        return `export const code = \`${result.code.slice()}\`;
                export const data = ${JSON.stringify(result.data || {})};
                export const map = "${result.map}";
        `;
      }
    },
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          let html = HTML_TEMPLATE;
          html = await server.transformIndexHtml(
            req.url!,
            html,
            req.originalUrl!,
          );

          res.end(html);
        });
      };
    },
  };

  return [svelte(svelte_options), svedocs_plugin];
}

export const DYNAMIC_ROUTE_REGEX = /\[(\w+)\]/g;

export async function resolveRoutes(config: SiteConfig) {
  const globs = await glob("**/*.md", {
    cwd: config.routes_dir,
    ignore: config.routes_exclude,
  });

  for (const filepath of globs) {
    const full_file_path = resolve(config.routes_dir, filepath);
    // let path = filepath.replaceAll(/\[\.\.\.([\w]+)\]/g, "**:$1");
    // path = path.replaceAll(/\[([\w]+)\]/g, ":$1");
    let path = filepath.replaceAll(/(\/)?(index)?\.md$/g, "");

    if (!path.startsWith("/")) path = `/${path}`;

    DYNAMIC_ROUTE_REGEX.lastIndex = 0;
    if (DYNAMIC_ROUTE_REGEX.test(filepath)) {
    }

    config.routes[path] = full_file_path;
  }
}

async function resolveConfig(cwd: string) {
  const files = await readdir(cwd);

  let ext = "";

  if (files.includes(`svedocs.config.ts`)) ext = "ts";
  else if (files.includes(`svedocs.config.mts`)) ext = "mts";
  else if (files.includes(`svedocs.config.js`)) ext = "js";
  else if (files.includes(`svedocs.config.mjs`)) ext = "mjs";

  assert.notEqual(ext, "", "No config file found");

  const config_file = await import(resolve(cwd, `svedocs.config.${ext}`));

  const config: SiteConfig = defu(
    config_file.default as UserConfig,
    {
      title: "svedocs",
      title_template: ":title | svedocs",
      base: "",
      description: "documentation for the rest of us",
      head: {},
      lang: "en-us",
      out_dir: "dist",
      routes: {},
      routes_dir: ".",
      routes_exclude: [],
      mdsvex: {},
      svelte: {},
      vite: {},
    } as SiteConfig,
  );

  if (!isAbsolute(config.routes_dir)) {
    config.routes_dir = resolve(cwd, config.routes_dir);
  }

  return config;
}
