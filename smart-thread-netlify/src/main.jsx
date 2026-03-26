import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#07070a', color: '#e4e4e8', padding: 40, fontFamily: 'system-ui' }
      },
        React.createElement('h1', { style: { fontSize: 20, marginBottom: 12 } }, 'Something went wrong'),
        React.createElement('pre', { style: { fontSize: 12, color: '#d4553a', maxWidth: 600, overflow: 'auto', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, whiteSpace: 'pre-wrap' } },
          this.state.error?.message || 'Unknown error'
        ),
        React.createElement('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 16 } }, 'Try clearing your browser data for this site and refreshing.'),
        React.createElement('button', {
          onClick: () => { localStorage.clear(); window.location.reload(); },
          style: { marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#d4553a', color: '#fff', fontSize: 13, cursor: 'pointer' }
        }, 'Clear data & reload')
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(React.StrictMode, null,
      React.createElement(App)
    )
  )
)
