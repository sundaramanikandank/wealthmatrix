import toast from 'react-hot-toast'

interface FetchOptions extends RequestInit {
  retryCount?: number
  showToast?: boolean
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retryCount = 1, showToast = true, ...fetchOptions } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        const errorMessage = `${response.status}: ${errorText || response.statusText}`
        
        if (showToast) {
          toast.error(`API Error: ${errorMessage}`, {
            id: url, // Prevent duplicate toasts for same URL
          })
        }
        
        throw new Error(errorMessage)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network error')
      
      // If it's a network error and we have retries left
      if (attempt < retryCount) {
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        if (showToast) {
          toast.loading(`Retrying... (${attempt + 1}/${retryCount})`, {
            id: `${url}-retry`,
          })
        }
        continue
      }
      
      // Final attempt failed
      if (showToast) {
        toast.dismiss(`${url}-retry`)
        toast.error(lastError.message || 'Network request failed', {
          id: url,
        })
      }
      
      throw lastError
    }
  }

  throw lastError || new Error('Request failed')
}

export async function fetchJSON<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options)
  return response.json()
}
