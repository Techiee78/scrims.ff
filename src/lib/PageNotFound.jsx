import { useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';


export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);
    const { user, isAuthenticated } = useAuth();

    const isFetched = !!user;
    const authData = { user, isAuthenticated };

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
            <div className="w-full max-w-md">
                <div className="space-y-6 text-center">
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="font-display text-7xl font-light text-primary/30">404</h1>
                        <div className="mx-auto h-0.5 w-16 bg-white/10"></div>
                    </div>

                    {/* Main Message */}
                    <div className="glass space-y-3 rounded-[26px] p-6">
                        <h2 className="font-display text-2xl font-medium text-foreground">
                            Page Not Found
                        </h2>
                        <p className="leading-relaxed text-muted-foreground">
                            The page <span className="font-medium text-foreground">"{pageName}"</span> could not be found in this application.
                        </p>
                    </div>

                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="glass-soft rounded-[22px] border-amber-300/30 p-4">
                            <div className="flex items-start gap-3 text-left">
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-300/15">
                                    <div className="h-2 w-2 rounded-full bg-amber-300"></div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">Admin Note</p>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Home className="h-4 w-4" />
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}