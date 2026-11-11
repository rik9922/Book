"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, CheckCircle2, CreditCard, Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  BookDTO,
  fetchSpaces,
  getBookCatalog,
  getOrderQuote,
  getStoredSession,
  MemorySpaceDTO,
  OrderQuoteDTO,
  PrintCatalogDTO,
  PrintOrderDTO,
} from "@/lib/api";

const FALLBACK_CATALOG: PrintCatalogDTO = {
  currency: "USD",
  pricingPolicy: "zero_markup_pass_through",
  formats: [
    { id: "hardcover_square_8x8", label: 'Square Heirloom 8×8"', dimensionsCm: "20.3 × 20.3 cm", baseCents: 4200 },
    { id: "hardcover_standard_8x10", label: 'Standard Archive 8×10"', dimensionsCm: "20.3 × 25.4 cm", baseCents: 4800 },
    { id: "hardcover_grand_12x12", label: 'Grand Estate 12×12"', dimensionsCm: "30.5 × 30.5 cm", baseCents: 6800 },
  ],
  bindings: [
    { id: "hardcover_linen", label: "Bookcloth Linen Hardcover", surchargeCents: 0 },
    { id: "french_morocco", label: "French-Morocco Vegetable-Tanned Leather", surchargeCents: 2000 },
  ],
  paperStocks: [
    { id: "140gsm_matte", label: "140gsm Acid-Free Archival Matte", surchargeCents: 0 },
    { id: "170gsm_lustre", label: "170gsm Archival Satin Lustre", surchargeCents: 400 },
  ],
};

export default function BillingPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [catalog, setCatalog] = useState<PrintCatalogDTO>(FALLBACK_CATALOG);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [bookId, setBookId] = useState("");

  const [format, setFormat] = useState<BookDTO["format"]>("hardcover_standard_8x10");
  const [binding, setBinding] = useState<"hardcover_linen" | "french_morocco">("hardcover_linen");
  const [paperWeight, setPaperWeight] = useState<"140gsm_matte" | "170gsm_lustre">("140gsm_matte");
  const [quantity, setQuantity] = useState(1);
  const [country, setCountry] = useState("US");
  const [quote, setQuote] = useState<OrderQuoteDTO | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBooksForSpace = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const res = await apiRequest<{ books?: BookDTO[]; items?: BookDTO[] } | BookDTO[]>(
        `/spaces/${targetSpaceId}/books`
      );
      const list = Array.isArray(res) ? res : res.books || res.items || [];
      setBooks(list);
      setBookId(list[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load space books.");
    }
  }, []);

  useEffect(() => {
    getBookCatalog()
      .then((c) => setCatalog(c))
      .catch(() => setCatalog(FALLBACK_CATALOG));

    if (!getStoredSession().accessToken) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    fetchSpaces()
      .then(async (list) => {
        setSpaces(list);
        if (list.length > 0) {
          setSpaceId(list[0].id);
          await loadBooksForSpace(list[0].id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load spaces."));
  }, [loadBooksForSpace]);

  const computeLocalQuote = (): OrderQuoteDTO => {
    const f = catalog.formats.find((x) => x.id === format) || catalog.formats[1];
    const b = catalog.bindings.find((x) => x.id === binding) || catalog.bindings[0];
    const p = catalog.paperStocks.find((x) => x.id === paperWeight) || catalog.paperStocks[0];
    const unitCents = f.baseCents + b.surchargeCents + p.surchargeCents;
    const subtotalCents = unitCents * quantity;
    const isDomestic = country.trim().toUpperCase() === "US";
    const shippingCents = isDomestic ? 900 : 2400;
    return {
      currency: "USD",
      quantity,
      unitCents,
      subtotalCents,
      shippingCents,
      taxCents: 0,
      totalCents: subtotalCents + shippingCents,
      estimatedDays: isDomestic ? "5–7 business days" : "10–14 business days",
    };
  };

  const handleCalculateQuote = async () => {
    setError(null);
    if (!signedIn) {
      setQuote(computeLocalQuote());
      return;
    }
    try {
      const q = await getOrderQuote({ format, binding, paperWeight, quantity, country });
      setQuote(q);
    } catch {
      setQuote(computeLocalQuote());
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !bookId || !recipientName.trim() || !street.trim() || !city.trim() || !postalCode.trim()) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const created = await apiRequest<PrintOrderDTO>("/orders", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          bookId,
          quantity,
          shippingAddress: {
            recipientName: recipientName.trim(),
            line1: street.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            country: country.trim().toUpperCase() || "US",
          },
          printSpec: {
            paperWeight,
            binding,
          },
        }),
      });
      setNotice(`Sandbox print order ${created.id} submitted ($${(created.totalCents / 100).toFixed(2)}).`);
      setRecipientName("");
      setStreet("");
      setCity("");
      setPostalCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order placement failed.");
    }
  };

  const displayQuote = quote || computeLocalQuote();

  return (
    <AppShell
      title="Zero-Markup Print Billing & Estimator"
      subtitle="Transparent at-cost archival printing and international shipping estimates with $0 digital subscription fees."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5">
          <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
            Configure Print Edition &amp; Shipping Quote
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-format" className="block text-xs font-semibold text-[#20242C] mb-1">
                Book Format
              </label>
              <select
                id="bill-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as BookDTO["format"])}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              >
                {catalog.formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} (${(f.baseCents / 100).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bill-binding" className="block text-xs font-semibold text-[#20242C] mb-1">
                Cover Binding
              </label>
              <select
                id="bill-binding"
                value={binding}
                onChange={(e) => setBinding(e.target.value as "hardcover_linen" | "french_morocco")}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              >
                {catalog.bindings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} (+${(b.surchargeCents / 100).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bill-paper" className="block text-xs font-semibold text-[#20242C] mb-1">
                Archival Paper Stock
              </label>
              <select
                id="bill-paper"
                value={paperWeight}
                onChange={(e) => setPaperWeight(e.target.value as "140gsm_matte" | "170gsm_lustre")}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              >
                {catalog.paperStocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (+${(p.surchargeCents / 100).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="bill-qty" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Copies
                </label>
                <input
                  id="bill-qty"
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="bill-country" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Country Code
                </label>
                <input
                  id="bill-country"
                  type="text"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs uppercase"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCalculateQuote}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold"
          >
            <Calculator className="w-4 h-4" aria-hidden="true" />
            Calculate Live Press Quote
          </button>

          <div className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Unit Print Cost ({displayQuote.quantity}×)</span>
              <span className="font-mono">${(displayQuote.subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Carrier Shipping ({displayQuote.estimatedDays})</span>
              <span className="font-mono">${(displayQuote.shippingCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E7E2DA] font-bold text-[#20242C]">
              <span>Total Pass-Through Cost</span>
              <span className="font-mono">${(displayQuote.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
            Sandbox Print Checkout
          </h2>

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="p-3.5 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          {!signedIn ? (
            <div className="space-y-3 text-xs text-[#5C5955]">
              <p>Sign in to select one of your authored editions and submit a sandbox fulfillment order.</p>
              <Link
                href="/auth"
                className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white font-semibold"
              >
                Sign In to Order
              </Link>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-3">
              <div>
                <label htmlFor="order-space" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Memory Space
                </label>
                <select
                  id="order-space"
                  value={spaceId}
                  onChange={(e) => {
                    setSpaceId(e.target.value);
                    loadBooksForSpace(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="order-book" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Book Edition
                </label>
                <select
                  id="order-book"
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                >
                  {books.length === 0 ? (
                    <option value="">No books in space yet</option>
                  ) : (
                    books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (v{b.version})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="ship-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Recipient Name
                </label>
                <input
                  id="ship-name"
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Elena Bennett"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="ship-street" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Street Address
                </label>
                <input
                  id="ship-street"
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="420 Archival Way"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ship-city" className="block text-xs font-semibold text-[#20242C] mb-1">
                    City
                  </label>
                  <input
                    id="ship-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Portland"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="ship-zip" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Postal Code
                  </label>
                  <input
                    id="ship-zip"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="97205"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!bookId}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-40"
                >
                  <Package className="w-4 h-4" aria-hidden="true" />
                  Place Sandbox Print Order
                </button>
                <Link href="/orders" className="text-xs font-medium text-[#76556F] hover:underline">
                  View Orders &amp; Receipts
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
