import { motion } from "motion/react";
import { X, Download, Printer, CheckCircle2, Truck } from "lucide-react";
import { Order } from "../types";
import { formatNaira } from "../utils/currency";
import { downloadOrderInvoice, InvoiceClientInfo } from "../utils/invoice";
import BrandLogo from "./BrandLogo";
import {
  modalBackdropVariants,
  modalPanelVariants,
  modalItemVariants,
} from "../utils/motion";

interface InvoiceModalProps {
  order: Order | null;
  clientInfo?: InvoiceClientInfo;
  onClose: () => void;
  onAddToast?: (message: string, type: "success" | "error" | "info") => void;
}

export default function InvoiceModal({
  order,
  clientInfo,
  onClose,
  onAddToast,
}: InvoiceModalProps) {
  if (!order) return null;

  const invoiceNumber = `INV-${order.id}`;
  const trackingNumber = `TRK-${order.id.replace(/^(KB-|BX-)/, "")}`;
  const computedSubtotal = order.items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );
  const voucherDiscount = Math.max(0, computedSubtotal - order.total);

  const addressLine = [
    clientInfo?.shippingStreet,
    clientInfo?.shippingCity,
    clientInfo?.shippingZip,
    clientInfo?.shippingCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const handleDownload = () => {
    downloadOrderInvoice(order, clientInfo);
    onAddToast?.(`Downloaded ${invoiceNumber}.html.`, "success");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        variants={modalBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 bg-[#141413]/50 dark:bg-black/70 backdrop-blur-md no-print"
      />

      <motion.div
        id="invoice-print-sheet"
        variants={modalPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-md shadow-2xl overflow-hidden my-auto text-[#141413] dark:text-[#F3F1EC]"
      >
          {/* Modal Toolbar */}
          <div className="px-5 sm:px-8 py-4 m3-haze-bar border-b border-[#E6E2DA] dark:border-[#2C2A26] flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62]">
                Client Invoice
              </span>
              <span className="text-[#E6E2DA] dark:text-[#2C2A26]">·</span>
              <span className="font-mono text-xs text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                {invoiceNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="min-h-[38px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white/80 dark:bg-[#22211E]/85 text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-[38px] px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close invoice"
                className="min-h-[38px] min-w-[38px] rounded-sm flex items-center justify-center text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Invoice Document Body */}
          <div className="p-5 sm:p-8 lg:p-10 space-y-7 max-h-[82vh] overflow-y-auto">
            {/* Document Header */}
            <motion.div
              variants={modalItemVariants}
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6"
            >
              <div className="space-y-2">
                <BrandLogo className="h-7 w-auto text-[#141413] dark:text-[#F3F1EC]" />
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                  BTNX Contemporary Atelier · Lagos · London · Tokyo
                  <br />
                  concierge@btnx.studio
                </p>
              </div>

              <div className="sm:text-right space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium">
                  Commercial Receipt
                </p>
                <h2 className="font-mono text-lg font-semibold text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                  {invoiceNumber}
                </h2>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                  Issued {order.date}
                </p>
              </div>
            </motion.div>

            {/* Client & Dispatch Info */}
            <motion.div variants={modalItemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] font-medium block">
                  Billed &amp; Dispatched To
                </span>
                <p className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                  {clientInfo?.name || "BTNX Atelier Client"}
                </p>
                {clientInfo?.email && (
                  <p className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] break-all">
                    {clientInfo.email}
                  </p>
                )}
                {clientInfo?.phone && (
                  <p className="font-mono text-xs text-[#66625B] dark:text-[#A7A299]">
                    {clientInfo.phone}
                  </p>
                )}
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed pt-1">
                  {addressLine || "Express Client Courier · Address Confirmed on File"}
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm space-y-2 text-xs">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] font-medium block">
                  Order &amp; Fulfillment Summary
                </span>
                <div className="flex justify-between gap-2">
                  <span className="text-[#66625B] dark:text-[#A7A299]">Order Reference</span>
                  <span className="font-mono font-medium text-[#141413] dark:text-[#F3F1EC]">{order.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#66625B] dark:text-[#A7A299]">Waybill Tracking</span>
                  <span className="font-mono font-medium text-[#141413] dark:text-[#F3F1EC]">{trackingNumber}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#66625B] dark:text-[#A7A299]">Fulfillment Status</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#966830] dark:text-[#C89B62]">
                    <Truck className="w-3 h-3" />
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#66625B] dark:text-[#A7A299]">Settlement</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#141413] dark:text-[#F3F1EC]">
                    <CheckCircle2 className="w-3 h-3 text-[#966830] dark:text-[#C89B62]" />
                    Paid in Full
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Line Items Table */}
            <motion.div
              variants={modalItemVariants}
              className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm overflow-x-auto"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F7] dark:bg-[#22211E] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                    <th className="py-3 px-4 font-medium">Piece &amp; Specification</th>
                    <th className="py-3 px-3 font-medium text-center">Qty</th>
                    <th className="py-3 px-3 font-medium text-right">Unit</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                  {order.items.map((item, idx) => (
                    <tr key={`${item.product?.id || idx}-${idx}`}>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-sm text-[#141413] dark:text-[#F3F1EC]">
                          {item.product?.name || "BTNX Garment"}
                        </p>
                        <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] mt-0.5">
                          Size {item.size} · {item.color}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#66625B] dark:text-[#A7A299]">
                        {formatNaira(item.product?.price || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                        {formatNaira((item.product?.price || 0) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            {/* Totals Breakdown */}
            <motion.div
              variants={modalItemVariants}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2"
            >
              <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] max-w-xs leading-relaxed">
                This receipt serves as your official proof of purchase for 14-day complimentary exchanges and archival garment care.
              </p>

              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-[#66625B] dark:text-[#A7A299]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                    {formatNaira(computedSubtotal)}
                  </span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-[#966830] dark:text-[#C89B62]">
                    <span>Privilege Discount</span>
                    <span className="font-mono tabular-nums">-{formatNaira(voucherDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#66625B] dark:text-[#A7A299]">
                  <span>Express Courier</span>
                  <span className="text-[#141413] dark:text-[#F3F1EC]">Complimentary</span>
                </div>
                <div className="pt-2.5 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex justify-between items-baseline">
                  <span className="font-medium text-sm text-[#141413] dark:text-[#F3F1EC]">
                    Total Settled
                  </span>
                  <span className="font-mono text-xl font-semibold text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                    {formatNaira(order.total)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
  );
}
