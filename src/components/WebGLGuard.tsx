import { Component, ReactNode } from 'react';

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

export const WebGLFallback = () => (
  <div role="alert" style={{ padding: 16, border: '1px solid #f59e0b', borderRadius: 8, color: '#fbbf24' }}>
    <b>3D view unavailable.</b> Your browser or device has WebGL disabled or unsupported, so the rotatable box can't be drawn.
    Try enabling hardware acceleration, updating your browser, or using Chrome/Safari/Firefox. The sliders, numbers and graphs below still work.
  </div>
);

export class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown) { console.warn('Recovered from render error:', e); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}
