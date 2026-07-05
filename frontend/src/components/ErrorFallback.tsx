"use client";

/**
 * Default fallback UI for the root ErrorBoundary.
 *
 * This has to live in its own Client Component: an event handler
 * (onClick) can't be constructed inside a Server Component (layout.tsx)
 * and then passed down as a prop — functions aren't serializable across
 * the server/client boundary. Rendering <ErrorFallback /> as a client
 * component reference sidesteps that entirely.
 */
export default function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory)]">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-[var(--color-walnut)] mb-2">
          Something went wrong
        </h1>
        <p className="text-[var(--color-muted)] mb-4">
          An unexpected error occurred. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[var(--color-ember)] text-white px-6 py-2 rounded-lg"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
