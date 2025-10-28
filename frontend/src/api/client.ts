const DEFAULT_API_BASE_URL = "http://localhost:8787";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;

export const buildApiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export async function fetchData<T = unknown>(
  path: string,
  options: RequestInit = {},
  actionDescription: string = "Perform an API request",
): Promise<T> {
  const url = buildApiUrl(path);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorBody: unknown = await response.text();
      try {
        errorBody = JSON.parse(errorBody as string);
      } catch {
        // keep text body as-is
      }

      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        method: options.method || "GET",
        headers: Object.fromEntries(response.headers),
        response: errorBody,
      };

      console.error(`HTTP Error with ${actionDescription}:`, errorDetails);
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to ${actionDescription}:`, {
      message: (error as Error).message,
      stack: (error as Error).stack,
      url,
      method: options.method || "GET",
      body: options.body || null,
    });
    throw error;
  }
}
