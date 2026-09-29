import { createContext } from "react";

/** The header's action slot element, provided by LangLayout (see components/HeaderSlot). */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);
