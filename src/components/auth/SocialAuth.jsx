import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";

export default function GoogleButton({ onClick, loading, label = "Continue with Google" }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="w-full h-12 font-medium bg-white/5 border-white/15 hover:bg-white/10"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <GoogleIcon className="w-5 h-5 mr-2" />
      )}
      {label}
    </Button>
  );
}

export function AuthDivider({ label = "or" }) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}