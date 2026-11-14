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
    <div className="fixed bottom-20 lg:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 z-[70] flex flex-col gap-2.5 sm:max-w-sm sm:w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.16 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-md backdrop-blur-xl shadow-lg ${
              toast.type === "error"
                ? "bg-rose-50/92 border-rose-200 text-rose-900 dark:bg-[#2A1719]/92 dark:border-rose-900/60 dark:text-rose-200"
                : toast.type === "success"
                ? "bg-[#141413]/88 border-white/15 text-[#FAF9F7] dark:bg-[#F3F1EC]/92 dark:border-black/10 dark:text-[#141413]"
                : "m3-haze-surface border-[#E6E2DA]/90 text-[#141413] dark:border-[#2C2A26]/90 dark:text-[#F3F1EC]"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === "success" && <Check className="w-4 h-4 text-[#C69B62] dark:text-[#966830]" />}
              {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              {toast.type === "info" && <AlertCircle className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />}
            </div>

            <div className="flex-1 text-xs leading-relaxed font-medium">{toast.message}</div>

            <button
              onClick={() => onClose(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
