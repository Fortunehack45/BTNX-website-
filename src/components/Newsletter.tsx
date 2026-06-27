import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Check } from "lucide-react";

interface NewsletterProps {
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function Newsletter({ onAddToast }: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      onAddToast("Please provide a valid email address.", "error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubscribed(true);
      onAddToast(`Welcome to the BTNX newsletter: ${email}!`, "success");
    }, 1200);
  };

  return (
    <section id="newsletter" className="relative w-full bg-slate-950 overflow-hidden select-none">
      
      {/* Background Frame with Vignette Overlay */}
      <div className="absolute inset-0 select-none">
        <img
          src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1800"
          alt="Streetwear high-fashion city models"
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
          id="newsletter-bg-img"
        />
        {/* Soft dark vignette overlay from left to right to prioritize text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/30" />
      </div>

      {/* Content Container aligned inside standard max-w-7xl page borders */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-[450px] sm:h-[500px] md:h-[550px] lg:h-[600px] flex items-center justify-start">
        
        <div className="max-w-2xl text-left flex flex-col items-start">
          <AnimatePresence mode="wait">
            {!isSubscribed ? (
              <motion.div
                key="newsletter-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-start text-left"
              >
                {/* Title */}
                <h2 
                  className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-extrabold text-white leading-[1.05] tracking-widest uppercase mb-4"
                  id="newsletter-heading"
                >
                  STAY UP TO DATE BY <br /> JOINING OUR NEWSLETTER
                </h2>

                {/* Description */}
                <p 
                  className="font-sans text-sm sm:text-base text-slate-300 font-light tracking-wide max-w-xl mb-8 leading-relaxed"
                  id="newsletter-desc"
                >
                  Get The Latest Collection From BTNX, And Collect Lots Of Discount Vouchers
                </p>

                {/* Email Form */}
                <form 
                  onSubmit={handleSubmit} 
                  className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md sm:bg-white/10 sm:backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg"
                  id="newsletter-email-form"
                >
                  <div className="relative flex-1 w-full sm:w-auto">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-white/15 sm:bg-transparent text-white placeholder-slate-300 text-sm py-3.5 pl-12 pr-4 rounded-full outline-none border border-white/20 sm:border-transparent focus:bg-black/20 focus:border-white/20 sm:focus:border-transparent transition-all font-medium"
                      required
                    />
                    <Mail className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs tracking-widest rounded-full uppercase shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? "JOINING..." : "JOIN NOW"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="newsletter-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="bg-white/10 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-white/15 max-w-md text-center shadow-2xl"
              >
                <div className="mx-auto w-16 h-16 bg-white text-slate-900 rounded-full flex items-center justify-center mb-6 shadow-md">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-display text-3xl font-extrabold text-white uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                  <span className="font-bold">Subscribed!</span>
                </h3>
                <p className="font-sans text-sm text-slate-200 font-light leading-relaxed mb-6">
                  You are now on the official BTNX VVIP list. Check your inbox for your first voucher details.
                </p>
                <button
                  onClick={() => {
                    setIsSubscribed(false);
                    setEmail("");
                  }}
                  className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs tracking-widest rounded-full uppercase transition-colors"
                >
                  Subscribe another email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
