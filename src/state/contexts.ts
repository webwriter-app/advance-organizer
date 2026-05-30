import { createContext } from "@lit/context";
import { SelectionController } from "./selection";
import { DocumentController } from "./document";
import { PageController } from "./page";

export const documentContext = createContext<DocumentController>(
  Symbol("document"),
);
export const selectionContext = createContext<SelectionController>(
  Symbol("selection"),
);
export const pageContext = createContext<PageController>(Symbol("page"));
