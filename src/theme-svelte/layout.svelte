<script lang="ts">
    import type { Snippet } from "svelte";
    import { useSiteConfig } from "..";

    type Props = {
        content: string;
        children?: Snippet;
    };

    const { content, children }: Props = $props();
    const config = useSiteConfig();
</script>

{@render children?.()}

your momma
