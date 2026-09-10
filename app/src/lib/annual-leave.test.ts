import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annualLeaveDays,
  monthsOfService,
  currentAnniversaryPeriod,
} from "./annual-leave.ts";

const hire = new Date("2020-03-01");

test("未滿 6 個月：0 日", () => {
  assert.equal(annualLeaveDays(hire, new Date("2020-07-31")), 0);
});

test("滿 6 個月未滿 1 年：3 日", () => {
  assert.equal(annualLeaveDays(hire, new Date("2020-09-01")), 3);
  assert.equal(annualLeaveDays(hire, new Date("2021-02-28")), 3);
});

test("滿 1 年未滿 2 年：7 日", () => {
  assert.equal(annualLeaveDays(hire, new Date("2021-03-01")), 7);
});

test("滿 2 年：10 日，滿 3 年：14 日", () => {
  assert.equal(annualLeaveDays(hire, new Date("2022-03-01")), 10);
  assert.equal(annualLeaveDays(hire, new Date("2023-03-01")), 14);
});

test("滿 5 年：15 日", () => {
  assert.equal(annualLeaveDays(hire, new Date("2025-03-01")), 15);
});

test("滿 10 年：16 日，逐年 +1，上限 30", () => {
  assert.equal(annualLeaveDays(hire, new Date("2030-03-01")), 16);
  assert.equal(annualLeaveDays(hire, new Date("2031-03-01")), 17);
  assert.equal(annualLeaveDays(hire, new Date("2044-03-01")), 30);
  assert.equal(annualLeaveDays(hire, new Date("2050-03-01")), 30);
});

test("monthsOfService 邊界", () => {
  assert.equal(monthsOfService(new Date("2024-01-31"), new Date("2024-02-29")), 0);
  assert.equal(monthsOfService(new Date("2024-01-15"), new Date("2024-02-15")), 1);
  assert.equal(monthsOfService(new Date("2024-01-15"), new Date("2024-02-14")), 0);
});

test("currentAnniversaryPeriod：滿 3 年後的年度給 14 日", () => {
  const p = currentAnniversaryPeriod(hire, new Date("2023-06-01"));
  assert.equal(p.grantedDays, 14);
  assert.equal(p.periodStart.getFullYear(), 2023);
  assert.equal(p.periodEnd.getFullYear(), 2024);
});
