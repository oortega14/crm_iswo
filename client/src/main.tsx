import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { bootstrapAuth } from '@/lib/authSession'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from '@/stores/auth'
import { ThemeProvider } from '@/components/common/ThemeProvider'
import { Spinner } from '@/components/ui/spinner'
import { Toaster, toast } from '@/components/ui/sonner'
import '@/index.css'

// Create router instance
const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Root component with providers
function App() {
  const auth = useAuthStore()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    let cancelled = false
    bootstrapAuth().finally(() => {
      if (!cancelled) {
        useAuthStore.getState().setLoading(false)
        setBootstrapped(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="crm-iswo-theme">
        <RouterProvider router={router} context={{ auth, queryClient }} />
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Mount app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Listen for session expired events
window.addEventListener('auth:session-expired', ((event: Event) => {
  toast.error((event as CustomEvent).detail.message)
}) as EventListener)
