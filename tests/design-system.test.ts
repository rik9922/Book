import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MEMORIA_TOKENS,
  calculateRelativeLuminance,
  calculateContrastRatio,
  VERIFIED_CONTRASTS,
} from "@memory-capsule/contracts";

describe("Memoria Living Archive — Design System & Contrast Verification Suite", () => {
  test("1. Canonical Design Tokens Integrity", () => {
    assert.equal(MEMORIA_TOKENS.brand.name, "Memoria");
    assert.equal(MEMORIA_TOKENS.brand.identity, "Living Archive");
    assert.equal(MEMORIA_TOKENS.brand.themeMode, "light_only");

    // Colors
    assert.equal(MEMORIA_TOKENS.colors.brand.ink.hex, "#20242C");
    assert.equal(MEMORIA_TOKENS.colors.brand.ivory.hex, "#F7F4EE");
    assert.equal(MEMORIA_TOKENS.colors.brand.plum.hex, "#76556F");
    assert.equal(MEMORIA_TOKENS.colors.brand.sageSoft.hex, "#849483");
    assert.equal(MEMORIA_TOKENS.colors.brand.sageFunc.hex, "#5F735E");
    assert.equal(MEMORIA_TOKENS.colors.borders.subtle.hex, "#E7E2DA");
    assert.equal(MEMORIA_TOKENS.colors.borders.strong.hex, "#8D857A");
  });

  test("2. Mathematical WCAG 2.2 AA Contrast Compliance", () => {
    const ivory = MEMORIA_TOKENS.colors.surfaces.canvas.hex;

    // Deep Ink vs Warm Ivory (Target >= 7:1 for AAA)
    const inkRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.brand.ink.hex, ivory);
    assert.ok(inkRatio >= 7.0, `Deep Ink ratio ${inkRatio} must be >= 7.0 (AAA)`);

    // Primary Text vs Warm Ivory (Target >= 7:1 for AAA)
    const textPrimaryRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.text.primary.hex, ivory);
    assert.ok(textPrimaryRatio >= 7.0, `Primary Text ratio ${textPrimaryRatio} must be >= 7.0 (AAA)`);

    // Secondary Text vs Warm Ivory (Target >= 4.5:1 for AA)
    const textSecondaryRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.text.secondary.hex, ivory);
    assert.ok(textSecondaryRatio >= 4.5, `Secondary Text ratio ${textSecondaryRatio} must be >= 4.5 (AA)`);

    // White text on Muted Plum Button (Target >= 4.5:1 for AA)
    const plumActionRatio = calculateContrastRatio("#FFFFFF", MEMORIA_TOKENS.colors.brand.plum.hex);
    assert.ok(plumActionRatio >= 4.5, `Plum Action text ratio ${plumActionRatio} must be >= 4.5 (AA)`);

    // Functional Sage vs Warm Ivory (Target >= 4.5:1 for AA)
    const sageFuncRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.brand.sageFunc.hex, ivory);
    assert.ok(sageFuncRatio >= 4.5, `Functional Sage ratio ${sageFuncRatio} must be >= 4.5 (AA)`);

    // Strong Control Border vs Warm Ivory (Target >= 3:1 for UI component boundaries)
    const borderStrongRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.borders.strong.hex, ivory);
    assert.ok(borderStrongRatio >= 3.0, `Strong Border ratio ${borderStrongRatio} must be >= 3.0 (AA UI non-text)`);

    // Semantic Operational Colors
    const successRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.semantic.success.text, ivory);
    assert.ok(successRatio >= 4.5, `Success color ratio ${successRatio} must be >= 4.5 (AA)`);

    const warningRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.semantic.warning.text, ivory);
    assert.ok(warningRatio >= 4.5, `Warning color ratio ${warningRatio} must be >= 4.5 (AA)`);

    const errorRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.semantic.error.text, ivory);
    assert.ok(errorRatio >= 4.5, `Error color ratio ${errorRatio} must be >= 4.5 (AA)`);

    const infoRatio = calculateContrastRatio(MEMORIA_TOKENS.colors.semantic.info.text, ivory);
    assert.ok(infoRatio >= 4.5, `Info color ratio ${infoRatio} must be >= 4.5 (AA)`);
  });

  test("3. Light-Mode Only Enforcement Verification", () => {
    // Web globals.css
    const globalsCss = fs.readFileSync(path.resolve("apps/web/src/app/globals.css"), "utf-8");
    assert.ok(globalsCss.includes("color-scheme: light;"), "globals.css must specify color-scheme: light");
    assert.ok(globalsCss.includes("@media (prefers-color-scheme: dark)"), "globals.css must override dark prefers-color-scheme");

    // Web RootLayout
    const rootLayout = fs.readFileSync(path.resolve("apps/web/src/app/layout.tsx"), "utf-8");
    assert.ok(rootLayout.includes('style={{ colorScheme: "light" }}') || rootLayout.includes('colorScheme: "light"'), "RootLayout must force light color-scheme");
    assert.ok(!rootLayout.includes('className="dark"'), "RootLayout must not have dark className");

    // iOS MemoriaApp.swift
    const iosApp = fs.readFileSync(path.resolve("apps/ios/Memoria/App/MemoriaApp.swift"), "utf-8");
    assert.ok(iosApp.includes(".preferredColorScheme(.light)"), "MemoriaApp.swift must enforce .preferredColorScheme(.light)");
    assert.ok(!iosApp.includes(".preferredColorScheme(.dark)"), "MemoriaApp.swift must not have .preferredColorScheme(.dark)");
  });

  test("4. Cross-Platform Token Consistency", () => {
    // Verify JSON tokens file exists
    const jsonPath = path.resolve("packages/contracts/src/design-tokens.json");
    assert.ok(fs.existsSync(jsonPath), "design-tokens.json must exist");
    const jsonTokens = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    assert.equal(jsonTokens.color.brand.plum.value, "#76556F");
    assert.equal(jsonTokens.color.brand.ivory.value, "#F7F4EE");

    // Verify iOS MemoriaTheme.swift exists
    const swiftThemePath = path.resolve("apps/ios/Memoria/Sources/Memoria/Theme/MemoriaTheme.swift");
    assert.ok(fs.existsSync(swiftThemePath), "MemoriaTheme.swift must exist");
    const swiftCode = fs.readFileSync(swiftThemePath, "utf-8");
    assert.ok(swiftCode.includes("0x76556F"), "MemoriaTheme.swift must define plum 0x76556F");
    assert.ok(swiftCode.includes("0xF7F4EE"), "MemoriaTheme.swift must define ivory 0xF7F4EE");
    assert.ok(swiftCode.includes("0x20242C"), "MemoriaTheme.swift must define ink 0x20242C");
    assert.ok(swiftCode.includes("0x5F735E"), "MemoriaTheme.swift must define sageFunc 0x5F735E");
  });
});

