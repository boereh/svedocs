import { defineBuildConfig } from "obuild/config";
import { dependencies } from "./package.json" with { type: "json" };
import svelte from "rollup-plugin-svelte";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: [
        "src/cli.ts",
        "src/index.ts",
        "src/client.ts",
        "src/theme-svelte/layout.svelte",
        // "src/server.ts",
        // "src/config.ts",
      ],
      minify: "dce-only",
      dts: true,
      rolldown: {
        plugins: [svelte()],
        external: [...Object.keys(dependencies), "$app"],
      },
    },
  ],
});
