import { Github } from "lucide-react";

interface ProviderLogoProps {
  provider: string;
  className?: string;
}

export const ProviderLogo = ({ provider, className = "h-5 w-5" }: ProviderLogoProps) => {
  // Use inline SVGs or reliable icon sources
  switch (provider) {
    case "google":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case "microsoft":
      return (
        <svg className={className} viewBox="0 0 23 23" fill="none">
          <path d="M0 0h11v11H0z" fill="#F25022"/>
          <path d="M12 0h11v11H12z" fill="#7FBA00"/>
          <path d="M0 12h11v11H0z" fill="#00A4EF"/>
          <path d="M12 12h11v11H12z" fill="#FFB900"/>
        </svg>
      );
    case "zoho":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.266 5.148a.803.803 0 0 0-.803-.803H3.537a.803.803 0 0 0-.803.803v13.704a.803.803 0 0 0 .803.803h16.926a.803.803 0 0 0 .803-.803V5.148zm-1.605 12.901H4.339V6.751h15.322v11.298z"/>
          <path d="M6.441 11.508l2.235 2.235 4.494-4.494 1.498 1.498-5.992 5.992-3.733-3.733z"/>
        </svg>
      );
    case "github":
      return <Github className={className} />;
    default:
      return <div className={className} />;
  }
};

