import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(err) {
    return { error: err }
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
          <AlertTriangle size={28} className="text-amber-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {this.props.label ?? 'Se produjo un error en esta sección'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
