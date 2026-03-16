// FIX 9: Error boundary component
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium text-destructive">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{this.state.error?.message ?? 'An unexpected error occurred'}</p>
            <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
