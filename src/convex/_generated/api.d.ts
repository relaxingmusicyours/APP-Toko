/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as cash from "../cash.js";
import type * as company from "../company.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as journals from "../journals.js";
import type * as lib_context from "../lib/context.js";
import type * as lib_posting from "../lib/posting.js";
import type * as masters from "../masters.js";
import type * as pos from "../pos.js";
import type * as purchases from "../purchases.js";
import type * as reports from "../reports.js";
import type * as returns from "../returns.js";
import type * as sales from "../sales.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  assets: typeof assets;
  auth: typeof auth;
  cash: typeof cash;
  company: typeof company;
  http: typeof http;
  inventory: typeof inventory;
  journals: typeof journals;
  "lib/context": typeof lib_context;
  "lib/posting": typeof lib_posting;
  masters: typeof masters;
  pos: typeof pos;
  purchases: typeof purchases;
  reports: typeof reports;
  returns: typeof returns;
  sales: typeof sales;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
