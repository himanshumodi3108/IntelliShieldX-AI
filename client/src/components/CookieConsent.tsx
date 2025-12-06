import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X, Settings, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type CookiePreference = "rejected" | "necessary" | "accepted" | null;

interface CookieConsentProps {
  onPreferenceChange?: (preference: CookiePreference) => void;
}

const COOKIE_CONSENT_KEY = "IntelliShieldXieldX_cookie_consent";
const COOKIE_PREFERENCES_KEY = "IntelliShieldX_cookie_preferences";

// Global function to open cookie settings from anywhere
export function openCookieSettings() {
  // Dispatch a custom event that the component listens to
  window.dispatchEvent(new CustomEvent("openCookieSettings"));
}

export function CookieConsent({ onPreferenceChange }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreference>(null);
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false,
  });

  // Listen for external requests to open settings (e.g., from Privacy page)
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };
    
    window.addEventListener("openCookieSettings", handleOpenSettings);
    return () => {
      window.removeEventListener("openCookieSettings", handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    // Check if user has already made a choice
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);

    if (savedConsent) {
      setPreferences(savedConsent as CookiePreference);
      if (savedPreferences) {
        try {
          setCookieSettings(JSON.parse(savedPreferences));
        } catch (e) {
          console.error("Error parsing cookie preferences:", e);
        }
      }
    } else {
      // Show banner if no consent has been given
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setCookieSettings(allAccepted);
    setPreferences("accepted");
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(allAccepted));
    setShowBanner(false);
    onPreferenceChange?.("accepted");
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setCookieSettings(necessaryOnly);
    setPreferences("necessary");
    localStorage.setItem(COOKIE_CONSENT_KEY, "necessary");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(necessaryOnly));
    setShowBanner(false);
    onPreferenceChange?.("necessary");
  };

  const handleReject = () => {
    const rejected = {
      necessary: true, // Necessary cookies cannot be rejected
      analytics: false,
      marketing: false,
      functional: false,
    };
    setCookieSettings(rejected);
    setPreferences("rejected");
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(rejected));
    setShowBanner(false);
    onPreferenceChange?.("rejected");
  };

  const handleSaveSettings = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(cookieSettings));
    setPreferences("accepted");
    setShowSettings(false);
    setShowBanner(false);
    onPreferenceChange?.("accepted");
  };

  return (
    <>
      {/* Cookie Banner - Only show if no consent has been given */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
        <Card className="max-w-6xl mx-auto glass border-border/50 shadow-2xl">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20 shrink-0">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">We Value Your Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                    By clicking "Accept All", you consent to our use of cookies. You can also choose to accept only 
                    necessary cookies or customize your preferences.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="cyber"
                    size="sm"
                    onClick={handleAcceptAll}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptNecessary}
                  >
                    Accept Necessary Only
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReject}
                    className="text-muted-foreground"
                  >
                    Reject All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="ml-auto flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Customize
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Learn more in our{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  {" "}and{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setShowBanner(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {/* Cookie Settings Dialog - Always available */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable different types of cookies below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="necessary" className="text-base font-semibold">
                    Necessary Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Essential cookies required for the website to function properly. These cannot be disabled.
                  </p>
                </div>
                <Switch
                  id="necessary"
                  checked={cookieSettings.necessary}
                  disabled
                  className="opacity-50"
                />
              </div>
              <div className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/20">
                <p>Examples: Authentication, security, session management</p>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="analytics" className="text-base font-semibold">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors interact with our website by collecting and reporting information anonymously.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={cookieSettings.analytics}
                  onCheckedChange={(checked) =>
                    setCookieSettings({ ...cookieSettings, analytics: checked })
                  }
                />
              </div>
              <div className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/20">
                <p>Examples: Google Analytics, usage statistics, performance metrics</p>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="marketing" className="text-base font-semibold">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={cookieSettings.marketing}
                  onCheckedChange={(checked) =>
                    setCookieSettings({ ...cookieSettings, marketing: checked })
                  }
                />
              </div>
              <div className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/20">
                <p>Examples: Ad targeting, conversion tracking, remarketing</p>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="functional" className="text-base font-semibold">
                    Functional Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable enhanced functionality and personalization, such as remembering your preferences and settings.
                  </p>
                </div>
                <Switch
                  id="functional"
                  checked={cookieSettings.functional}
                  onCheckedChange={(checked) =>
                    setCookieSettings({ ...cookieSettings, functional: checked })
                  }
                />
              </div>
              <div className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/20">
                <p>Examples: Language preferences, theme settings, chat history</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Link
              to="/privacy"
              className="text-sm text-primary hover:underline"
            >
              Learn more about our cookie policy
            </Link>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button variant="cyber" onClick={handleSaveSettings}>
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Utility function to check cookie consent
export function getCookieConsent(): CookiePreference {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(COOKIE_CONSENT_KEY) as CookiePreference) || null;
}

// Utility function to check if a specific cookie type is allowed
export function isCookieAllowed(type: "analytics" | "marketing" | "functional"): boolean {
  if (typeof window === "undefined") return false;
  
  const consent = getCookieConsent();
  if (consent === "rejected" || consent === "necessary") {
    return false;
  }
  
  if (consent === "accepted") {
    const preferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (preferences) {
      try {
        const prefs = JSON.parse(preferences);
        return prefs[type] === true;
      } catch (e) {
        return false;
      }
    }
    // If accepted but no preferences, default to true
    return true;
  }
  
  return false;
}

