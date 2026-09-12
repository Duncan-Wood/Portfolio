import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AppTree } from "./app-tree";

const container = document.getElementById("root");
const tree = <AppTree router={BrowserRouter} />;

const wasPrerendered = container.firstElementChild !== null;

if (wasPrerendered) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
