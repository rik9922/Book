"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Package, Printer, RefreshCw, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  getOrderReceipt,
  getStoredSession,
  listMyOrders,
  OrderReceiptDTO,
  PrintOrderDTO,
} from "@/lib/api";

const ORDER_STAGES = ["submitted", "preflight_passed", "in_production", "shipped", "delivered"] as const;

export default function OrdersPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [orders, setOrders] = useState<PrintOrderDTO[]>([]);
  const [receipt, setReceipt] = useState<OrderReceiptDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!getStoredSession().accessToken) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    try {
      const list = await listMyOrders();
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load print orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!receipt) return;
    const surface = surfaceRef.current;
    surface?.setAttribute("inert", "");
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setReceipt(null);
        openerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      surface?.removeAttribute("inert");
    };
  }, [receipt]);

  const handleOpenReceipt = async (orderId: string, trigger: HTMLButtonElement) => {
    openerRef.current = trigger;
    setError(null);
    try {
      const r = await getOrderReceipt(orderId);
      setReceipt(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load printable receipt.");
    }
  };

  const handleReorder = async (order: PrintOrderDTO) => {
    setError(null);
    setNotice(null);
    try {
      const created = await apiRequest<PrintOrderDTO>("/orders", {
        method: "POST",
        body: JSON.stringify({
          spaceId: order.spaceId,
          bookId: order.bookId,
          quantity: 1,
          shippingAddress: order.shippingAddress || {
            recipientName: "Archive Owner",
            line1: "100 Heirloom Way",
            city: "Portland",
            postalCode: "97205",
            country: "US",
          },
          printSpec: {
            paperWeight: order.printSpec?.paperWeight === "170gsm_lustre" ? "170gsm_lustre" : "140gsm_matte",
            binding: order.printSpec?.binding === "french_morocco" ? "french_morocco" : "hardcover_linen",
          },
        }),
      });
      setOrders((prev) => [created, ...prev]);
      setNotice(`Reordered edition as ${created.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed.");
    }
  };

  return (
    <AppShell
      title="Print Orders & Fulfillment Tracking"
      subtitle="Track frozen heirloom print editions from preflight to delivery, inspect printable receipts, and reorder copies."
    >
      <div ref={surfaceRef}>
        {!signedIn && !loading ? (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to track Print Orders</h2>
            <Link
              href="/auth"
              className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
                {notice}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#5C5955]">{orders.length} historical &amp; active order(s)</p>
              <Link
                href="/billing"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Order New Copy
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
                <Package className="w-6 h-6 mx-auto text-[#8D857A] mb-2" aria-hidden="true" />
                No physical print orders placed yet.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const stageIdx = ORDER_STAGES.indexOf(order.status as (typeof ORDER_STAGES)[number]);
                  return (
                    <article
                      key={order.id}
                      className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#76556F]">
                            {order.id.slice(0, 12)}
                          </span>
                          <h2 className="font-serif text-lg font-bold text-[#20242C]">
                            Book Edition {order.bookId.slice(0, 8)}
                          </h2>
                          <p className="text-xs text-[#5C5955]">
                            Placed {new Date(order.createdAt).toLocaleString()} •{" "}
                            <span className="font-mono font-semibold text-[#20242C]">
                              ${(order.totalCents / 100).toFixed(2)} {order.currency}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleOpenReceipt(order.id, e.currentTarget)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            Proof Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#20242C] text-white text-xs font-medium"
                          >
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            Reorder
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2 pt-2">
                        {ORDER_STAGES.map((stage, i) => {
                          const done = stageIdx >= i;
                          return (
                            <div
                              key={stage}
                              className={`p-2 rounded-lg text-center text-[10px] font-semibold uppercase border ${
                                done
                                  ? "bg-[#EEF2ED] text-[#22593E] border-[#B6DBC7]"
                                  : "bg-[#F7F4EE] text-[#8D857A] border-[#E7E2DA]"
                              }`}
                            >
                              {stage.replace("_", " ")}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {receipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-dialog-title"
          className="fixed inset-0 z-50 bg-[#20242C]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            setReceipt(null);
            openerRef.current?.focus();
          }}
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[11px] font-bold text-[#76556F]">
                  {receipt.receiptNumber}
                </span>
                <h2 id="receipt-dialog-title" className="font-serif text-xl font-bold text-[#20242C]">
                  Archival Press Proof Receipt
                </h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Close receipt"
                onClick={() => {
                  setReceipt(null);
                  openerRef.current?.focus();
                }}
                className="p-2 rounded-xl bg-[#F7F4EE] text-[#20242C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-1.5 text-xs">
              <p>
                <strong>Order ID:</strong> <span className="font-mono">{receipt.orderId}</span>
              </p>
              <p>
                <strong>Status:</strong> {receipt.status}
              </p>
              <p>
                <strong>Total:</strong> ${(receipt.totalCents / 100).toFixed(2)} {receipt.currency}
              </p>
              <p>
                <strong>Issued:</strong> {new Date(receipt.issuedAt).toLocaleString()}
              </p>
              <p className="text-[#5F735E] font-medium pt-1">{receipt.policyNote}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
              >
                Print Proof
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
