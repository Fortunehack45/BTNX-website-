import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-8 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-50 dark:bg-[#2A1719] border border-rose-200 dark:border-rose-900/60 rounded-sm flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-medium font-display tracking-wide mb-2">
              Application Encountered an Error
            </h2>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] font-mono mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected runtime error occurred."}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] font-medium px-6 py-3 rounded-sm hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] transition-colors text-xs uppercase tracking-[0.14em] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
