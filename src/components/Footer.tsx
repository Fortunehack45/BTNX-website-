import { Twitter, Facebook, Instagram, Anchor } from "lucide-react";

export default function Footer() {
  const handleSocialClick = (platform: string) => {
    // Just a placeholder click action
    console.log(`Social icon clicked: ${platform}`);
  };

  return (
    <footer className="bg-white border-t border-slate-100 py-16" id="footer-section">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Top Footer Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          
          {/* Brand Logo */}
          <div className="flex-shrink-0">
            <a 
              href="#" 
              className="font-display text-3xl tracking-widest text-slate-900 select-none hover:opacity-80 transition-opacity"
            >
              KLAMBY
            </a>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {["About", "Features", "Product", "Affiliates"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Social Icons */}
          <div className="flex items-center space-x-5 text-slate-400">
            <button
              onClick={() => handleSocialClick("Twitter")}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4 fill-current stroke-0" />
            </button>
            <button
              onClick={() => handleSocialClick("Facebook")}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4 fill-current stroke-0" />
            </button>
            <button
              onClick={() => handleSocialClick("Instagram")}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSocialClick("Pinterest")}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-colors"
              aria-label="Pinterest"
            >
              <Anchor className="w-4 h-4" /> {/* standard icon for branding style */}
            </button>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t border-slate-100" />

        {/* Bottom copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4 text-xs font-semibold text-slate-400 select-none">
          <p>© Copyright 2022, All Rights Reserved</p>
          
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-700 transition-colors">Terms & Conditions</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
