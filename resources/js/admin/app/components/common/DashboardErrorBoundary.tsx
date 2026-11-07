import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface Props {
  children: ReactNode;
  roleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error caught by Boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card className="border-destructive/30 bg-card">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Gagal Memuat Dashboard {this.props.roleName || ''}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Terjadi kesalahan teknis saat merender komponen dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-center">
              {this.state.error?.message && (
                <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono text-muted-foreground text-left break-all border border-border">
                  {this.state.error.message}
                </div>
              )}
              <Button onClick={this.handleReset} className="gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Halaman</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;

