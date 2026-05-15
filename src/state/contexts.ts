import { createContext } from "@lit/context";
import { SelectionController } from "./selection";
import { DocumentController } from "./document";

export const documentContext = createContext<DocumentController>(
  Symbol("document"),
);
export const selectionContext = createContext<SelectionController>(
  Symbol("selection"),
);
