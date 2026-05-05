import api from './api'
import { Notification } from 'shared/auth'

export const getNotifications = async (page = 1, limit = 20): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> => {
  const response = await api.get('/notifications', {
    params: { page, limit }
  })
  return response.data
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await api.put(`/notifications/${notificationId}/read`)
}
