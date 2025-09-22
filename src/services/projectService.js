// services/projectService.js
import { supabase } from '../supabaseClient';

export const fetchProjects = async (userId, userRole) => {
  let query = supabase
    .from('projects')
    .select(`
      id, name, description, created_at,
      created_by(username),
      leader_id(username)
    `)
    .order('created_at', { ascending: false });

  if (userRole === 'leader') {
    query = query.eq('leader_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const addProject = async (newProjectData) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: newProjectData.name,
      description: newProjectData.description,
      created_by: newProjectData.created_by,
      leader_id: newProjectData.leader_id,
    })
    .select(`
      id, name, description, created_at,
      created_by(username),
      leader_id(username)
    `)
    .single();
  if (error) throw error;
  return data;
};

export const updateProject = async (projectToUpdate) => {
  const { error } = await supabase
    .from('projects')
    .update({
      name: projectToUpdate.name,
      description: projectToUpdate.description,
      leader_id: projectToUpdate.leader_id,
    })
    .eq('id', projectToUpdate.id);
  if (error) throw error;
};

export const deleteProject = async (projectId) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
};