import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// FCR-003: the shared design-system's token defaults. Imported BEFORE index.css so this
// site's index.css (the live light/dark values of the same token names) wins the cascade.
import "@pacific-code-labs/sokol-design-system/styles";
import "./index.css";
// FCR-080: apply the active DXP brand theme (themes.json → DS theme engine) + favicon.
import { initBrand } from "./lib/brand-theme";
import { initContent, refreshContent } from "./repositories/content.repository";

// Stale-while-revalidate: render at once from the last published copy this browser saw (or the
// bundled JSON), then fetch the published documents in the background and re-render only when
// they changed. A cold content API never delays the first paint.
initContent();
initBrand();
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
void refreshContent().then((changed) => {
  if (!changed) return;
  initBrand();
  root.render(<App key="published" />);
});
