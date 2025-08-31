import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { UserPlus, Edit, Trash2, Save, X, User as UserIcon } from 'lucide-react';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]); // New state for roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', operator_number: '', password: '', role_id: '' }); // Use role_id
  const [editingUser, setEditingUser] = useState(null); // User object being edited

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id, username, operator_number,
          role_id(id, name)
        `) // Select role_id and its name
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData);

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*'); // Fetch all roles

      if (rolesError) throw rolesError;
      setRoles(rolesData);
      // Set default new user role to 'digitador' if roles are loaded
      const digitadorRole = rolesData.find(r => r.name === 'digitador');
      if (digitadorRole) {
        setNewUser(prev => ({ ...prev, role_id: digitadorRole.id }));
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: newUser.username,
          operator_number: newUser.operator_number,
          password: newUser.password,
          role_id: newUser.role_id, // Use role_id
        })
        .select(`
          id, username, operator_number,
          role_id(id, name)
        `)
        .single();

      if (error) throw error;
      setUsers((prev) => [data, ...prev]);
      const digitadorRole = roles.find(r => r.name === 'digitador');
      setNewUser({ username: '', operator_number: '', password: '', role_id: digitadorRole ? digitadorRole.id : '' });
      setShowAddUserModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editingUser.username,
          operator_number: editingUser.operator_number,
          role_id: editingUser.role_id, // Use role_id
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      // Update the user in state with the new role's name
      const updatedRole = roles.find(r => r.id === editingUser.role_id);
      setUsers((prev) =>
        prev.map((user) => (user.id === editingUser.id ? {
          ...editingUser,
          role_id: updatedRole ? { id: updatedRole.id, name: updatedRole.name } : null
        } : user))
      );
      setEditingUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? ¡Esto también eliminará sus tareas asignadas y registros de tiempo!')) return;
    setError('');
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)]">
        <p className="text-gray-600 text-lg">Cargando usuarios, ¡no te desesperes!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h1
        className="text-4xl font-extrabold text-gray-900 mb-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Gestión de Usuarios
      </motion.h1>

      <motion.button
        onClick={() => setShowAddUserModal(true)}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 mb-8 mx-auto"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <UserPlus className="w-5 h-5" />
        Agregar Nuevo Usuario
      </motion.button>

      {error && (
        <motion.p
          className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}

      <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-xl">
        {users.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No hay usuarios registrados. ¡Es hora de contratar!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser?.id === user.id ? (
                          <input
                            type="text"
                            value={editingUser.username}
                            onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-900 font-medium">{user.username}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser?.id === user.id ? (
                          <input
                            type="number"
                            value={editingUser.operator_number}
                            onChange={(e) => setEditingUser({ ...editingUser, operator_number: parseInt(e.target.value) || '' })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          />
                        ) : (
                          <span className="text-gray-700">{user.operator_number}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser?.id === user.id ? (
                          <select
                            value={editingUser.role_id}
                            onChange={(e) => setEditingUser({ ...editingUser, role_id: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          >
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role_id?.name === 'admin' ? 'bg-blue-100 text-blue-800' : user.role_id?.name === 'leader' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {user.role_id?.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingUser?.id === user.id ? (
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={handleUpdateUser}
                              className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Save className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <X className="w-5 h-5" />
                            </motion.button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={() => setEditingUser({ ...user, role_id: user.role_id?.id || '' })}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddUserModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Agregar Nuevo Usuario</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label htmlFor="newUsername" className="block text-gray-700 text-sm font-medium mb-2">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    id="newUsername"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newOperatorNumber" className="block text-gray-700 text-sm font-medium mb-2">
                    Número de Operador
                  </label>
                  <input
                    type="number"
                    id="newOperatorNumber"
                    value={newUser.operator_number}
                    onChange={(e) => setNewUser({ ...newUser, operator_number: parseInt(e.target.value) || '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                    min="0"
                    max="9999"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-gray-700 text-sm font-medium mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newRole" className="block text-gray-700 text-sm font-medium mb-2">
                    Rol
                  </label>
                  <select
                    id="newRole"
                    value={newUser.role_id}
                    onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                  <motion.button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-xl hover:bg-gray-300 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Guardar Usuario
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersManagement;