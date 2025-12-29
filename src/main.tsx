import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import App from './App'
import './index.css'

const options = {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only' as const,
    capture_pageview: false, // We'll manually capture page views for SPA
    capture_pageleave: true,
    autocapture: true,
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PostHogProvider
            apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
            options={options}
        >
            <App />
        </PostHogProvider>
    </StrictMode>,
)
