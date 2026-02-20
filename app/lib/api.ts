import { useAuth } from './AuthContext';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
        // THE FIX IS HERE: Declare errorData with a specific, safe type.
        let errorData: { error?: string; message?: string } = {};
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: `HTTP error! status: ${response.status}` };
        }
      throw new Error(errorData.error || errorData.message || 'An unknown error occurred');
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint:string, body: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Hook to use the API client in components
export const useApi = () => {
  return new ApiClient();
};

export default ApiClient;
