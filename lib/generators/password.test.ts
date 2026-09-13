import { describe, expect, it } from "vitest";

import {
  buildPool,
  DEFAULT_PASSWORD_OPTIONS,
  estimateStrength,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
  type PasswordOptions,
} from "@/lib/generators/password";

const ONLY_NUMBERS: PasswordOptions = {
  ...DEFAULT_PASSWORD_OPTIONS,
  uppercase: false,
  lowercase: false,
  numbers: true,
  symbols: false,
};

describe("buildPool", () => {
  it("includes only the selected sets", () => {
    expect(buildPool(ONLY_NUMBERS)).toBe("0123456789");
  });

  it("removes ambiguous characters when requested", () => {
    const pool = buildPool({
      ...DEFAULT_PASSWORD_OPTIONS,
      excludeAmbiguous: true,
    });
    expect(pool).not.toContain("0");
    expect(pool).not.toContain("O");
    expect(pool).not.toContain("l");
  });
});

describe("generatePassword", () => {
  it("honours the requested length", () => {
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 24 })).toHaveLength(
      24,
    );
  });

  it("clamps length to the allowed range", () => {
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 1 })).toHaveLength(
      MIN_LENGTH,
    );
    expect(
      generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: MAX_LENGTH + 10 }),
    ).toHaveLength(MAX_LENGTH);
  });

  it("only uses characters from the chosen pool", () => {
    const password = generatePassword({ ...ONLY_NUMBERS, length: 50 });
    expect(password).toMatch(/^[0-9]+$/);
  });

  it("throws when no character set is selected", () => {
    expect(() =>
      generatePassword({
        ...DEFAULT_PASSWORD_OPTIONS,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
      }),
    ).toThrow();
  });
});

describe("estimateStrength", () => {
  it("rates a long full-charset password highly", () => {
    expect(
      estimateStrength({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 }).label,
    ).toBe("excellent");
  });

  it("rates a short numeric pin as weak", () => {
    expect(estimateStrength({ ...ONLY_NUMBERS, length: 4 }).label).toBe("weak");
  });
});
