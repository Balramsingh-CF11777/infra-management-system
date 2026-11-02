import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ims-card m-4 p-6" role="alert">
        <h2 className="text-[17px] font-semibold text-ims-ink">Something went wrong while loading this section.</h2>
        <p className="mt-2 text-sm text-slate-600">The rest of your session is unchanged. Retry this section.</p>
        <button
          type="button"
          className="mt-4 ims-btn-primary"
          onClick={() => this.setState({ failed: false })}
        >
          Retry
        </button>
      </div>
    );
  }
}
