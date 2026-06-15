import { Component } from 'react';

/**
 * Wraps a single page section so that if it throws during render/commit, only
 * that section is dropped (rendered as nothing) instead of crashing the whole
 * page tree. Used on the home page where several independent, animated,
 * data-driven sections render side by side.
 */
export default class SectionBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging; never surface a stack to users.
    console.error(`[SectionBoundary:${this.props.name || 'section'}]`, error, info);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
