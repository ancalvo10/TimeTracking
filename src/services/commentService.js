// services/commentService.js
import { supabase } from '../supabaseClient';

export const fetchTaskComments = async (taskId) => {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      id, message, created_at, edited_at,
      user_id(username, id)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const addComment = async (commentData) => {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: commentData.task_id,
      user_id: commentData.user_id,
      message: commentData.message,
      // edited_at remains null for new comments
    })
    .select(`
      id, message, created_at, edited_at,
      user_id(username, id)
    `)
    .single();
  if (error) throw error;
  return data;
};

export const updateComment = async (commentId, newMessage) => {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ 
      message: newMessage,
      edited_at: new Date().toISOString() // Set edited_at timestamp when updating
    })
    .eq('id', commentId)
    .select(`
      id, message, created_at, edited_at,
      user_id(username, id)
    `)
    .single();
  if (error) throw error;
  return data;
};

export const deleteComment = async (commentId) => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
};

export const notifyUsersOfNewComment = async (commentData, task, currentUser) => {
  const usersToNotify = new Set();

  // Notify assigned user if not current user
  if (task.assigned_to.id !== currentUser.id) {
    usersToNotify.add(task.assigned_to.id);
  }

  // Notify leader of the project
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('leader_id')
    .eq('id', task.projects.id)
    .single();
  if (!projectError && projectData.leader_id && projectData.leader_id !== currentUser.id) {
    usersToNotify.add(projectData.leader_id);
  }

  // Notify admins
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('id')
    .eq('role_id.name', 'admin');
  if (!adminsError) {
    admins.forEach(admin => {
      if (admin.id !== currentUser.id) usersToNotify.add(admin.id);
    });
  }

  if (usersToNotify.size > 0) {
    // Batch insert notifications
    const notificationsPayload = Array.from(usersToNotify).map(userId => ({
      user_id: userId,
      message: `¡Nuevo comentario en la tarea "${task.title}"!`,
      type: 'info',
    }));

    const { error: batchError } = await supabase
      .from('notifications')
      .insert(notificationsPayload);

    if (batchError) console.error("Error creating batch notifications:", batchError);
  }
};