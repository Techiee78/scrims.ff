import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

// Catches a crashing page so the shell never turns into a black screen.
export default class ShellErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { message: '' };
  }

  static getDerivedStateFromError(error) {
    return { message: error?.message || 'Something went wrong' };
  }

  componentDidCatch(error) {
    console.error('Page crashed:', error);
  }

  render() {
    if (!this.state.message) return this.props.children;

    return (
      <div className="glass flex flex-col items-center gap-2.5 rounded-[26px] px-6 py-10 text-center">
        <p className="font-display text-sm font-semibold">This page could not load</p>
        <p className="max-w-[260px] text-xs text-muted-foreground">{this.state.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="glass-soft mt-1 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload
        </button>
      </div>
    );
  }
}