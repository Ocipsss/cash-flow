import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// Import & Register Service Worker PWA
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createApp(App).mount('#app')
