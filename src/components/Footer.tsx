import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <span>© {new Date().getFullYear()} MyCalendarStats</span>
          <span className="text-gray-300">|</span>
          <Link 
            href="/privacy" 
            className="hover:text-[color:var(--primary)] transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-300">|</span>
          <Link 
            href="/terms" 
            className="hover:text-[color:var(--primary)] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

