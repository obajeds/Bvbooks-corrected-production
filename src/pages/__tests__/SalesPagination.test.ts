import { describe, it, expect } from "vitest";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

const ITEMS_PER_PAGE = 20;

// Replicate the filtering + pagination logic from Sales.tsx
function filterAndPaginate(
  sales: Array<{ invoice_number: string; customer?: { name?: string } | null; payment_method: string; created_at: string }>,
  searchTerm: string,
  paymentFilter: string,
  dateFilter: string,
  currentPage: number
) {
  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === "all" || sale.payment_method === paymentFilter;
    const saleDate = new Date(sale.created_at);
    const now = new Date();
    const matchesDate =
      dateFilter === "today" ? saleDate >= startOfDay(now) :
      dateFilter === "week" ? saleDate >= startOfWeek(now, { weekStartsOn: 1 }) :
      dateFilter === "month" ? saleDate >= startOfMonth(now) : true;
    return matchesSearch && matchesPayment && matchesDate;
  });

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return { filteredSales, paginatedSales, totalPages, startIndex };
}

// Generate mock sales
function generateSales(count: number, overrides: Partial<{ payment_method: string; created_at: string; invoice_number: string }> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sale-${i}`,
    invoice_number: overrides.invoice_number || `INV-${String(i + 1).padStart(4, "0")}`,
    customer: i % 3 === 0 ? { name: `Customer ${i}` } : null,
    payment_method: overrides.payment_method || (i % 2 === 0 ? "cash" : "transfer"),
    created_at: overrides.created_at || new Date().toISOString(),
    total_amount: 1000 + i * 100,
  }));
}

describe("Sales Pagination Logic", () => {
  it("paginates 50 sales into 3 pages of 20/20/10", () => {
    const sales = generateSales(50);
    const result = filterAndPaginate(sales, "", "all", "all", 1);

    expect(result.filteredSales).toHaveLength(50);
    expect(result.totalPages).toBe(3);
    expect(result.paginatedSales).toHaveLength(20);
  });

  it("page 2 returns items 21-40", () => {
    const sales = generateSales(50);
    const result = filterAndPaginate(sales, "", "all", "all", 2);

    expect(result.startIndex).toBe(20);
    expect(result.paginatedSales).toHaveLength(20);
    expect(result.paginatedSales[0].invoice_number).toBe("INV-0021");
  });

  it("page 3 returns remaining 10 items", () => {
    const sales = generateSales(50);
    const result = filterAndPaginate(sales, "", "all", "all", 3);

    expect(result.startIndex).toBe(40);
    expect(result.paginatedSales).toHaveLength(10);
  });

  it("fewer than 20 sales shows 1 page, no pagination needed", () => {
    const sales = generateSales(5);
    const result = filterAndPaginate(sales, "", "all", "all", 1);

    expect(result.totalPages).toBe(1);
    expect(result.paginatedSales).toHaveLength(5);
  });

  it("exactly 20 sales shows 1 page", () => {
    const sales = generateSales(20);
    const result = filterAndPaginate(sales, "", "all", "all", 1);

    expect(result.totalPages).toBe(1);
    expect(result.paginatedSales).toHaveLength(20);
  });

  it("21 sales shows 2 pages", () => {
    const sales = generateSales(21);
    const result = filterAndPaginate(sales, "", "all", "all", 1);

    expect(result.totalPages).toBe(2);
    expect(result.paginatedSales).toHaveLength(20);

    const page2 = filterAndPaginate(sales, "", "all", "all", 2);
    expect(page2.paginatedSales).toHaveLength(1);
  });

  it("payment filter reduces results and pagination adjusts", () => {
    const sales = generateSales(50); // even=cash, odd=transfer
    const result = filterAndPaginate(sales, "", "cash", "all", 1);

    // 25 cash sales (indices 0,2,4,...48)
    expect(result.filteredSales).toHaveLength(25);
    expect(result.totalPages).toBe(2);
    expect(result.paginatedSales).toHaveLength(20);
  });

  it("search filter reduces results", () => {
    const sales = generateSales(50);
    const result = filterAndPaginate(sales, "INV-0001", "all", "all", 1);

    // Matches INV-0001, INV-00010, etc.
    expect(result.filteredSales.length).toBeGreaterThanOrEqual(1);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("date filter 'today' includes today's sales", () => {
    const sales = generateSales(10); // all created now = today
    const result = filterAndPaginate(sales, "", "all", "today", 1);

    expect(result.filteredSales).toHaveLength(10);
  });

  it("date filter 'today' excludes old sales", () => {
    const oldSales = generateSales(10, { created_at: "2024-01-01T10:00:00Z" });
    const result = filterAndPaginate(oldSales, "", "all", "today", 1);

    expect(result.filteredSales).toHaveLength(0);
    expect(result.totalPages).toBe(0);
    expect(result.paginatedSales).toHaveLength(0);
  });

  it("empty sales returns 0 pages", () => {
    const result = filterAndPaginate([], "", "all", "all", 1);

    expect(result.filteredSales).toHaveLength(0);
    expect(result.totalPages).toBe(0);
    expect(result.paginatedSales).toHaveLength(0);
  });

  it("out-of-bounds page returns empty slice", () => {
    const sales = generateSales(10);
    const result = filterAndPaginate(sales, "", "all", "all", 5);

    expect(result.paginatedSales).toHaveLength(0);
  });

  it("combined filters: search + payment + date", () => {
    const todaySales = generateSales(30);
    const oldSales = generateSales(20, { created_at: "2024-06-01T10:00:00Z" });
    const all = [...todaySales, ...oldSales];

    // Today + cash + search for "INV"
    const result = filterAndPaginate(all, "INV", "cash", "today", 1);

    // Only today's cash sales matching "INV" (15 cash from today's 30)
    expect(result.filteredSales).toHaveLength(15);
    expect(result.totalPages).toBe(1);
    expect(result.paginatedSales).toHaveLength(15);
  });
});
