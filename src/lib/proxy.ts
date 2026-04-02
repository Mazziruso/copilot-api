import consola from "consola"
import { getProxyForUrl } from "proxy-from-env"
import { Agent, ProxyAgent, setGlobalDispatcher, type Dispatcher } from "undici"

let proxyEnabled = false

export function isProxyEnabled(): boolean {
  return proxyEnabled
}

/**
 * Get proxy URL for a given target URL using environment variables
 * (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, etc.)
 */
export function getProxyUrl(targetUrl: string): string | undefined {
  const get = getProxyForUrl as unknown as (u: string) => string | undefined
  const raw = get(targetUrl)
  return raw && raw.length > 0 ? raw : undefined
}

/**
 * Proxied fetch that works with Bun runtime.
 * Uses the proxy option supported by Bun's fetch.
 */
export async function proxiedFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  if (!proxyEnabled) {
    return fetch(input, init)
  }

  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
  const proxyUrl = getProxyUrl(url)

  if (!proxyUrl) {
    consola.debug(`HTTP proxy bypass: ${new URL(url).hostname}`)
    return fetch(input, init)
  }

  consola.debug(`HTTP proxy route: ${new URL(url).hostname} via ${proxyUrl}`)

  // Bun supports proxy option in fetch
  if (typeof Bun !== "undefined") {
    return fetch(input, {
      ...init,
      proxy: proxyUrl,
    } as RequestInit)
  }

  // For Node.js, the global dispatcher is already configured
  return fetch(input, init)
}

export function initProxyFromEnv(): void {
  proxyEnabled = true
  consola.debug("Proxy support enabled from environment variables")

  // For Bun, we use proxiedFetch directly - no global dispatcher needed
  if (typeof Bun !== "undefined") {
    consola.debug("Bun runtime detected - using per-request proxy")
    return
  }

  try {
    const direct = new Agent()
    const proxies = new Map<string, ProxyAgent>()

    // We only need a minimal dispatcher that implements `dispatch` at runtime.
    // Typing the object as `Dispatcher` forces TypeScript to require many
    // additional methods. Instead, keep a plain object and cast when passing
    // to `setGlobalDispatcher`.
    const dispatcher = {
      dispatch(
        options: Dispatcher.DispatchOptions,
        handler: Dispatcher.DispatchHandler,
      ) {
        try {
          const origin =
            typeof options.origin === "string" ?
              new URL(options.origin)
            : (options.origin as URL)
          const proxyUrl = getProxyUrl(origin.toString())
          if (!proxyUrl) {
            consola.debug(`HTTP proxy bypass: ${origin.hostname}`)
            return (direct as unknown as Dispatcher).dispatch(options, handler)
          }
          let agent = proxies.get(proxyUrl)
          if (!agent) {
            agent = new ProxyAgent(proxyUrl)
            proxies.set(proxyUrl, agent)
          }
          let label = proxyUrl
          try {
            const u = new URL(proxyUrl)
            label = `${u.protocol}//${u.host}`
          } catch {
            /* noop */
          }
          consola.debug(`HTTP proxy route: ${origin.hostname} via ${label}`)
          return (agent as unknown as Dispatcher).dispatch(options, handler)
        } catch {
          return (direct as unknown as Dispatcher).dispatch(options, handler)
        }
      },
      close() {
        return direct.close()
      },
      destroy() {
        return direct.destroy()
      },
    }

    setGlobalDispatcher(dispatcher as unknown as Dispatcher)
    consola.debug("HTTP proxy configured from environment (per-URL)")
  } catch (err) {
    consola.debug("Proxy setup skipped:", err)
  }
}
