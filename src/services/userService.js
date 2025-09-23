// services/userService.js
import { supabase } from '../supabaseClient';

export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, username, operator_number,
      role_id(id, name)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchRoles = async () => {
  const { data, error } = await supabase
    .from('roles')
    .select('*');
  if (error) throw error;
  return data;
};

export const addUser = async (newUser) => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: newUser.username,
      operator_number: newUser.operator_number,
      password: newUser.password,
      role_id: newUser.role_id,
    })
    .select(`
      id, username, operator_number,
      role_id(id, name)
    `)
    .single();
  if (error) throw error;
  return data;
};

export const updateUser = async (userToUpdate) => {
  const { error } = await supabase
    .from('users')
    .update({
      username: userToUpdate.username,
      operator_number: userToUpdate.operator_number,
      role_id: userToUpdate.role_id,
    })
    .eq('id', userToUpdate.id);
  if (error) throw error;
};

export const deleteUser = async (userId) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  if (error) throw error;
};

export const fetchLeadersAndAdmins = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role_id!inner(name)')
    .or('name.eq.leader,name.eq.admin', { foreignTable: 'role_id' });
  if (error) throw error;
  return data;
};

export const fetchDigitadores = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role_id!inner(name)')
    .eq('role_id.name', 'digitador');
  if (error) throw error;
  return data;
};