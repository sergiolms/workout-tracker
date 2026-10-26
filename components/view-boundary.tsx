'use client';
import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export class ViewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        role="alert"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="font-semibold">No se pudo abrir esta vista</h2>
        <p className="text-sm text-muted-foreground">
          Comprueba la conexión y recarga la app. También puedes cambiar de
          sección desde el menú.
        </p>
        <Button
          className="min-h-12"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Recargar app
        </Button>
      </section>
    );
  }
}
