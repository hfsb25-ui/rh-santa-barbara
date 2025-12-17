import * as React from "react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onClose?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] UI error caught", { error, errorInfo });
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="rounded-lg border bg-background p-4">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">{this.props.title ?? "Algo deu errado"}</h2>
          <p className="text-sm text-muted-foreground">
            {this.props.description ??
              "Ocorreu um erro inesperado nesta tela. Você pode tentar novamente ou fechar este formulário."}
          </p>
          {this.state.error?.message && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={this.handleTryAgain}>
            Tentar novamente
          </Button>
          {this.props.onClose && (
            <Button type="button" onClick={this.props.onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    );
  }
}
