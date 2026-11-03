import { createRoot } from 'react-dom/client'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/global.css'
import './styles/panels.css'
import './styles/detail.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
