import { describe, expect, it } from "vitest";
import type { CustomerRecord } from "@/lib/catalog-types";
import { filterCustomers } from "./customers-view";

const base: CustomerRecord = {
  phone: "",
  name: "",
  email: null,
  notes: "",
  status: "new",
  requestCount: 0,
  lastContactAt: null,
  bestStatus: null,
  sources: [],
  createdAt: "",
  updatedAt: "",
};

const rows: CustomerRecord[] = [
  { ...base, phone: "+233558850667", name: "Ama Osei" },
  { ...base, phone: "+233241234567", name: "Kojo Mensah" },
  { ...base, phone: "+233201119990", name: "Efua" },
];

describe("filterCustomers", () => {
  it("returns everything for an empty or whitespace-only query", () => {
    expect(filterCustomers(rows, "")).toBe(rows);
    expect(filterCustomers(rows, "   ")).toBe(rows);
  });
  it("matches a name contains, case-insensitively", () => {
    expect(filterCustomers(rows, "kojo")).toEqual([rows[1]]);
    expect(filterCustomers(rows, "OSEI")).toEqual([rows[0]]);
  });
  it("matches a phone contains", () => {
    expect(filterCustomers(rows, "5588")).toEqual([rows[0]]);
    expect(filterCustomers(rows, "23324")).toEqual([rows[1]]);
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterCustomers(rows, "zebra")).toEqual([]);
  });
});