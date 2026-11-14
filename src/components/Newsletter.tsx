import React, { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ATELIER_BACKDROP } from "../data";
import GalleryImage from "./GalleryImage";

interface NewsletterProps {
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function Newsletter({ onAddToast }: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      onAddToast("Please enter a valid email address.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "newsletters"), {
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      });
      setIsSubscribed(true);
      onAddToast(`Subscribed ${email} to BTNX updates.`, "success");
    } catch (err) {
      onAddToast("Unable to subscribe right now. Please try again.", "error");
      handleFirestoreError(err, OperationType.CREATE, "newsletters");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="newsletter" className="w-full bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200">
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-16 sm:py-22">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm overflow-hidden">
          {/* Atelier Photography Left */}
          <div className="lg:col-span-6 aspect-[16/10] lg:aspect-[4/3] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden">
            <GalleryImage
              src={ATELIER_BACKDROP.image}
              alt={ATELIER_BACKDROP.alt}
              id="newsletter-bg-img"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Editorial Newsletter Form Right */}
          <div className="lg:col-span-6 p-6 sm:p-12 lg:p-14 flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium mb-3">
              Lookbook &amp; Drops
            </span>

            {!isSubscribed ? (
              <div className="max-w-md space-y-5">
                <h2
                  id="newsletter-heading"
                  className="font-display text-3xl sm:text-4xl font-medium text-[#141413] dark:text-[#F3F1EC] leading-[1.08] text-balance"
                >
                  Get early access to new drops and restocks.
                </h2>

                <p id="newsletter-desc" className="text-sm text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                  Sign up for release updates, seasonal lookbooks, and subscriber-only promo codes.
                </p>

                <form onSubmit={handleSubmit} id="newsletter-email-form" className="pt-2">
                  <div className="flex flex-col sm:flex-row border border-[#141413]/85 dark:border-[#2C2A26] focus-within:border-[#141413] dark:focus-within:border-[#F3F1EC] rounded-sm overflow-hidden bg-[#FAF9F7] dark:bg-[#22211E]">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="flex-1 min-h-[44px] px-4 py-3 text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] bg-transparent outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[44px] px-6 py-3 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isSubmitting ? "Joining..." : "Subscribe"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="max-w-md space-y-4">
                <div className="w-10 h-10 border border-[#141413] dark:border-[#F3F1EC] rounded-sm flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#141413] dark:text-[#F3F1EC]" />
                </div>
                <h3 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                  You&rsquo;re on the list
                </h3>
                <p className="text-sm text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                  We&rsquo;ll email you whenever new pieces drop or subscriber promo codes go live.
                </p>
                <button
                  onClick={() => {
                    setIsSubscribed(false);
                    setEmail("");
                  }}
                  className="text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] underline cursor-pointer"
                >
                  Register another address
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
