import type { Options as SvelteOptions } from "@sveltejs/vite-plugin-svelte";
import type { UserConfig as ViteUserConfig } from "vite";
import type { MdsvexCompileOptions } from "mdsvex";
import { getContext } from "svelte";
import type { VitePluginConfig } from "unocss/vite";

export type SiteConfig = Required<UserConfig> & {
  routes: Record<string, string>;
};

export type UserConfig = {
  title?: string;
  title_template?: string;
  description?: string;
  head?: Record<string, Array<Record<string, string>>>;
  lang?: string;
  base?: string;
  routes_dir?: string;
  routes_exclude?: string[];
  out_dir?: string;
  svelte?: SvelteOptions;
  vite?: ViteUserConfig;
  unocss?: VitePluginConfig;
  mdsvex?: MdsvexCompileOptions;
  layout?: MdsvexCompileOptions["layout"];
};

export const defineConfig = (cfg: UserConfig) => cfg;

export const SITE_CONFIG_KEY = Symbol("site-config");
export const useSiteConfig = () => getContext<SiteConfig>(SITE_CONFIG_KEY);
