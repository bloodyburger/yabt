import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export function initPostHog() {
    if (POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            person_profiles: 'identified_only',
            capture_pageview: false, // We'll manually capture page views for SPA
            capture_pageleave: true,
            autocapture: true,
        })
    }
}

export function identifyUser(userId: string, email?: string) {
    if (POSTHOG_KEY) {
        posthog.identify(userId, {
            email: email,
        })
    }
}

export function resetUser() {
    if (POSTHOG_KEY) {
        posthog.reset()
    }
}

export function capturePageView(path: string) {
    if (POSTHOG_KEY) {
        posthog.capture('$pageview', {
            $current_url: window.location.href,
            path: path,
        })
    }
}

export function captureEvent(eventName: string, properties?: Record<string, unknown>) {
    if (POSTHOG_KEY) {
        posthog.capture(eventName, properties)
    }
}

export { posthog }
