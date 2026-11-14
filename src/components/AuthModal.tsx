import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";
import {
  modalBackdropVariants,
  modalPanelVariants,
  modalItemVariants,
} from "../utils/motion";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      onClose();
    } catch (error: any) {
      console.error("Auth error:", error);
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setErrorMsg("Invalid email or password.");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMsg("An account with this email already exists.");
      } else {
        setErrorMsg(error.message || "Authentication failed. Please verify your credentials.");
      }
    }
  };

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/45 dark:bg-black/65 backdrop-blur-md"
    >
      <motion.div
        variants={modalPanelVariants}
        onClick={(e) => e.stopPropagation()}
        className="m3-haze-surface border border-[#E6E2DA]/90 dark:border-[#2C2A26]/90 rounded-md w-full max-w-sm p-6 sm:p-8"
      >
        <motion.div
          variants={modalItemVariants}
          className="flex justify-between items-start mb-6 pb-4 border-b border-[#E6E2DA]/80 dark:border-[#2C2A26]/80"
        >
          <div>
            <BrandLogo className="h-5 w-auto text-[#141413] dark:text-[#F3F1EC] mb-2.5" />
            <h2 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
              {isLogin ? "Sign In" : "Create Account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>

        <motion.form variants={modalItemVariants} onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-[#2A1719] dark:text-rose-200 rounded-sm p-3 text-xs">
              {errorMsg}
            </div>
          )}
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-[#22211E]/85 border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
            <input
              type="text"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-[#22211E]/85 border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-[#22211E]/85 border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#141413] hover:bg-[#2B2A28] text-[#FAF9F7] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] py-3.5 text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
          >
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </motion.form>

        <motion.div
          variants={modalItemVariants}
          className="mt-4 pt-4 border-t border-[#E6E2DA]/80 dark:border-[#2C2A26]/80 text-center"
        >
          <button
            type="button"
            onClick={async () => {
              await signInWithGoogle();
              onClose();
            }}
            className="w-full py-3 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white/75 dark:bg-[#22211E]/80 hover:border-[#141413] dark:hover:border-[#F3F1EC] rounded-sm text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] transition-colors cursor-pointer"
          >
            Continue with Google
          </button>
        </motion.div>

        <motion.div variants={modalItemVariants} className="mt-5 text-center text-xs text-[#66625B] dark:text-[#A7A299]">
          {isLogin ? "New to BTNX?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg("");
            }}
            className="font-medium text-[#141413] dark:text-[#F3F1EC] underline cursor-pointer"
          >
            {isLogin ? "Create Account" : "Sign In"}
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
