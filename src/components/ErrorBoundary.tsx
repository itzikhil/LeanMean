import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-[480px] mx-auto px-6 py-16 text-center">
          <p className="text-lg font-bold text-terra mb-2">Something went wrong</p>
          <p className="text-sm text-inksoft mb-4">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}
            className="bg-forest text-white font-bold px-6 py-2.5 rounded-xl active:opacity-90">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
