// services/notificationService.js
import { supabase } from '../supabaseClient';

export const fetchNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

export const createNotification = async (userId, message, type) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, message, type })
    .select()
    .single();
  if (error) throw error;
  return data;
};