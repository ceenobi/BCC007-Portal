/**
 * DOM test setup — only activates in browser-environment test files.
 * Node-environment files skip matcher extension since there is no document.
 */
import * as jestDom from "@testing-library/jest-dom/vitest";
import { expect } from "vitest";

if (typeof document !== "undefined") {
  expect.extend(jestDom);
}

export {};
