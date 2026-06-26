import { motion, AnimatePresence } from "motion/react";
import { Check, X, AlertCircle } from "lucide-react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface NotificationProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function Notification({ toasts, onClose }: NotificationProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-white/95 border-emerald-100 text-slate-800"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-900"
                : "bg-slate-900 border-slate-800 text-white"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" && (
                <div className="p-1 rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="w-4 h-4" />
                </div>
              )}
              {toast.type === "error" && (
                <div className="p-1 rounded-full bg-rose-100 text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="p-1 rounded-full bg-slate-800 text-slate-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 text-sm font-medium">
              {toast.message}
            </div>

            <button
              onClick={() => onClose(toast.id)}
              className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
