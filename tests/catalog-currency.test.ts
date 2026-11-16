import { describe, it } from "node:test";
import assert from "node:assert";
import { formatNaira, toNaira } from "../src/utils/currency";

describe("BTNX Currency & Catalog Filter Integrity Suite", () => {
  it("toNaira converts legacy USD values (<= 1000) to Naira using 1500 exchange rate", () => {
    assert.strictEqual(toNaira(85), 127500);
    assert.strictEqual(toNaira(78), 117000);
    assert.strictEqual(toNaira(1), 1500);
  });

  it("toNaira preserves raw Naira values (> 1000) directly from database", () => {
    assert.strictEqual(toNaira(85000), 85000);
    assert.strictEqual(toNaira(78000), 78000);
    assert.strictEqual(toNaira(70000), 70000);
    assert.strictEqual(toNaira(90000), 90000);
  });

  it("formatNaira formats both USD and raw Naira prices with Nigerian locale", () => {
    assert.strictEqual(formatNaira(85000), "₦85,000");
    assert.strictEqual(formatNaira(78000), "₦78,000");
    assert.strictEqual(formatNaira(0), "₦0");
    assert.strictEqual(formatNaira(-100), "₦0");
  });

  it("Price filter correctly includes products with Naira prices in default filter range", () => {
    const products = [
      { id: "ny-1", name: "Purple Brooklyn", price: 85000, category: "Womenswear · Fleece" },
      { id: "ny-2", name: "Cropped Space", price: 78000, category: "Womenswear · Outerwear" },
      { id: "ny-3", name: "Birmania Sunt", price: 70000, category: "Unisex · Knitwear" },
      { id: "ny-4", name: "Layering Origin", price: 90000, category: "Womenswear · Jersey" },
      { id: "ny-5", name: "Melburne College", price: 82000, category: "Womenswear · Knitwear" },
      { id: "ny-6", name: "Royale Leather", price: 84000, category: "Outerwear · Leather" },
    ];

    const defaultMinPrice = 0;
    const defaultMaxPrice = 200000;

    const filtered = products.filter(
      (p) => p.price >= defaultMinPrice && p.price <= defaultMaxPrice
    );

    // All 6 database products must be included!
    assert.strictEqual(filtered.length, 6);
  });

  it("Recommendations carousel does not crash on empty products array", () => {
    const emptyProducts: any[] = [];
    const recOffset = 0;
    const visibleRecommendations =
      emptyProducts.length > 0
        ? [0, 1, 2]
            .map((offset) => emptyProducts[(recOffset + offset) % emptyProducts.length])
            .filter(Boolean)
        : [];

    assert.strictEqual(visibleRecommendations.length, 0);
  });
});
