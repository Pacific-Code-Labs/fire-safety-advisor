import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// FCR-003: the shared design-system's token defaults. Imported BEFORE index.css so this
// site's index.css (the live light/dark values of the same token names) wins the cascade.
import "@pacific-code-labs/sokol-design-system/styles";
import "./index.css";
// FCR-080: apply the active DXP brand theme (themes.json → DS theme engine) + favicon.
import { initBrand } from "./lib/brand-theme";
import { initContent, refreshContent } from "./repositories/content.repository";

// Load the published documents from the public API before the first render. The cached copy (or
// bundled JSON) remains available if the API is unavailable. No CMS content is baked in by CI.
initContent();
const root = createRoot(document.getElementById("root")!);
root.render(
  <main className="container min-h-screen animate-pulse py-8" aria-busy="true">
    <div className="mb-16 flex items-center justify-between">
      <div className="h-9 w-28 rounded bg-muted" />
      <div className="h-9 w-44 rounded bg-muted" />
    </div>
    <div className="mx-auto max-w-3xl space-y-5 pt-12">
      <div className="mx-auto h-12 w-3/4 rounded bg-muted" />
      <div className="mx-auto h-6 w-full rounded bg-muted" />
      <div className="mx-auto h-6 w-2/3 rounded bg-muted" />
    </div>
  </main>,
);

async function boot() {
  try {
    await refreshContent();
  } catch {
    // Keep the cached or bundled content if the public API cannot be reached.
  }
  initBrand();
  root.render(<App />);
}

void boot();
