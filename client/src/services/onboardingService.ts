import api from './api'
import { AuthResponse } from 'shared/auth'

export const loginWithPi = async (accessToken: string, paymentId?: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/pi', { accessToken, paymentId })
  return response.data
}

export const completeOnboarding = async (profileData: { username: string; interests: string[] }): Promise<void> => {
  await api.put('/users/profile', profileData)
}
