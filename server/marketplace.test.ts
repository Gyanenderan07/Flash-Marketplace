import { describe, expect, it } from "vitest";
import { approvalRequired, cartSubtotal, unitPriceForQuantity } from "../shared/marketplace";

describe("marketplace business rules", () => {
  it("selects the correct B2B volume tier", () => {
    expect(unitPriceForQuantity(1499, 1)).toBe(1499);
    expect(unitPriceForQuantity(1499, 10)).toBe(1304);
    expect(unitPriceForQuantity(1499, 50)).toBe(1169);
  });

  it("calculates a multi-seller cart subtotal", () => {
    expect(cartSubtotal([{ unitPrice: 1304, quantity: 10 }, { unitPrice: 42, quantity: 100 }])).toBe(17240);
  });

  it("flags orders over the approval threshold", () => {
    expect(approvalRequired(50000)).toBe(false);
    expect(approvalRequired(50001)).toBe(true);
  });
});
