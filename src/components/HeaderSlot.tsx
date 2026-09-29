import { useContext } from "react";
import { createPortal } from "react-dom";
import { HeaderSlotContext } from "@/lib/header-slot";

/**
 * The header is rendered once by LangLayout (outside the page transition), so a
 * page can't pass it props. A page that needs its own header action (the demo's
 * assistant toggle) renders it through <HeaderActions>, a portal into the
 * header's action slot, so it keeps the page's state and handlers.
 */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  return slot ? createPortal(children, slot) : null;
}
