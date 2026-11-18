import React from 'react';
import { AlertTriangle } from 'lucide-react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="glass w-full max-w-md rounded-[26px] p-6">
        <div className="text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="glass-soft mt-5 rounded-[22px] p-4 text-left text-sm text-muted-foreground">
            <p>If you believe this is an error, you can:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;