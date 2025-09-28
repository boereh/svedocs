import { config } from "$app";
import { mount } from "svelte";
import { SITE_CONFIG_KEY } from "svedocs";
import "@unocss/reset/tailwind.css";
import "uno.css";

async function main() {
  const route: string = config.routes[location.pathname];
  if (!route) return;

  // const layout = await import(/* @vite-ignore */ config.layout);
  const content = await import(/* @vite-ignore */ route);

  console.log(content);

  mount(content.default, {
    target: document.querySelector("#__svedocs")!,
    context: new Map([[SITE_CONFIG_KEY, config]]),
    props: {},
  });
}

main();
