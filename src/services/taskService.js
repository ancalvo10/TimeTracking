// services/taskService.js
import { supabase } from '../supabaseClient';

export const fetchTasks = async (userId, userRole) => {
  let query = supabase
    .from('tasks')
    .select(`
      id, title, description, status, created_at, total_time_spent,
      projects(id, name),
      assigned_to(username, id)
    `)
    .order('created_at', { ascending: false });

  if (userRole === 'digitador') {
    query = query.eq('assigned_to', userId);
  } else if (userRole === 'leader') {
    const { data: leaderProjects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('leader_id', userId);
    if (projectError) throw projectError;
    const projectIds = leaderProjects.map(p => p.id);
    query = query.in('project_id', projectIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const addTask = async (newTaskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: newTaskData.title,
      description: newTaskData.description,
      project_id: newTaskData.project_id,
      assigned_to: newTaskData.assigned_to,
      created_by: newTaskData.created_by,
      status: 'pending',
      total_time_spent: 0,
    })
    .select(`
      id, title, description, status, created_at,
      projects(id, name),
      assigned_to(id, username),
      created_by(username)
    `)
    .single();
  if (error) throw error;
  return data;
};

export const updateTask = async (taskToUpdate) => {
  const { error } = await supabase
    .from('tasks')
    .update({
      title: taskToUpdate.title,
      description: taskToUpdate.description,
      project_id: taskToUpdate.project_id,
      assigned_to: taskToUpdate.assigned_to,
      status: taskToUpdate.status,
    })
    .eq('id', taskToUpdate.id);
  if (error) throw error;
};

export const deleteTask = async (taskId) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw error;
};

export const updateTaskStatusAndTotalTime = async (taskId, newStatus, newTotalTimeSpent) => {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: newStatus,
      total_time_spent: newTotalTimeSpent,
    })
    .eq('id', taskId);
  if (error) throw error;
};

export const updateTaskStatus = async (taskId, newStatus) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId);
  if (error) throw error;
};