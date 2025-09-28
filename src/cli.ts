import { defineCommand, runMain } from "citty";
import {
  name,
  description,
  version,
} from "../package.json" with { type: "json" };
import { isAbsolute, resolve } from "path";
import { createServer } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { glob } from "glob";
import type { UserConfig, SiteConfig } from ".";
import { defu } from "defu";
import { readdir } from "node:fs/promises";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import type { PreprocessorGroup } from "svelte/compiler";
import unocss from "unocss/vite";
import {
  presetWind3,
  transformerCompileClass,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export const SOURCE_DIR = resolve(fileURLToPath(import.meta.url), "..");
export const HTML_HEAD_ID = "<!--%belt.head%-->";
export const HTML_BODY_ID = "<!--%belt.body%-->";
export const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <div id="__svedocs"></div>
        <script type="module" src="/@fs/${SOURCE_DIR}/client.mjs"></script>
    </body>
</html>`;

const dev_command = defineCommand({
  meta: {
    name: "dev",
    description: "Start the belt development server",
    version,
  },
  args: {
    cwd: {
      description: "Path to the application folder",
      type: "positional",
      default: ".",
    },
  },
  async run({ args }) {
    if (!isAbsolute(args.cwd)) args.cwd = resolve(process.cwd(), args.cwd);

    const config = await resolveConfig(args.cwd);
    await resolveRoutes(config);

    const vite = await createServer({
      optimizeDeps: {
        include: [`${config.routes_dir}/**/*`],
        extensions: ["svelte", "ts", "js", "mjs", "mts"],
      },
      publicDir: resolve(config.routes_dir, "public"),
      plugins: [
        svelte({
          extensions: ["svelte", "md"],
          configFile: false,
          preprocess: [
            vitePreprocess(),
            mdsvex({
              extensions: ["md"],
              layout: config.layout,
            }) as PreprocessorGroup,
          ],
        }),
        unocss(config.unocss),
        {
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
          async transform(code, id, options) {},
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
        },
      ],
    });

    await vite.listen();
    vite.printUrls();
  },
});

export const DYNAMIC_ROUTE_REGEX = /\[(\w+)\]/g;

export async function resolveRoutes(config: SiteConfig) {
  const globs = await glob("**/*.md", {
    cwd: config.routes_dir,
    ignore: config.routes_exclude,
  });

  for (const filepath of globs) {
    const full_file_path = resolve(config.routes_dir, filepath);
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
      unocss: {
        presets: [presetWind3()],
        transformers: [
          transformerCompileClass(),
          transformerVariantGroup(),
          transformerDirectives(),
        ],
      },
      layout: `${SOURCE_DIR}/theme-svelte/layout.mjs`,
    } as SiteConfig,
  );

  if (!isAbsolute(config.routes_dir)) {
    config.routes_dir = resolve(cwd, config.routes_dir);
  }

  return config;
}

runMain({
  meta: {
    name,
    description,
    version,
  },
  subCommands: {
    dev: dev_command,
  },
});
