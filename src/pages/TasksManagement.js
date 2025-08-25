import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { ListPlus, Edit, Trash2, Save, X, ListTodo, User, Folder } from 'lucide-react';

const TasksManagement = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', project_id: '', assigned_to: '' });
  const [editingTask, setEditingTask] = useState(null); // Task object being edited

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, created_at,
          projects(id, name),
          assigned_to(id, username),
          created_by(username)
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, role'); // Fetch role to filter normal users

      if (usersError) throw usersError;
      setUsersList(usersData);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name');

      if (projectsError) throw projectsError;
      setProjectsList(projectsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          project_id: newTask.project_id,
          assigned_to: newTask.assigned_to,
          created_by: user.id,
          status: 'pending',
          total_time_spent: 0, // Initialize total_time_spent
        })
        .select(`
          id, title, description, status, created_at,
          projects(id, name),
          assigned_to(id, username),
          created_by(username)
        `)
        .single();

      if (error) throw error;
      setTasks((prev) => [data, ...prev]);
      setNewTask({ title: '', description: '', project_id: '', assigned_to: '' });
      setShowAddTaskModal(false);

      // Send notification to assigned user
      await supabase.from('notifications').insert({
        user_id: data.assigned_to.id,
        message: `¡Se te ha asignado la tarea "${data.title}"!`,
        type: 'info',
      });

    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title,
          description: editingTask.description,
          project_id: editingTask.project_id,
          assigned_to: editingTask.assigned_to,
          status: editingTask.status,
        })
        .eq('id', editingTask.id);

      if (error) throw error;
      setTasks((prev) =>
        prev.map((task) => (task.id === editingTask.id ? {
          ...editingTask,
          projects: projectsList.find(p => p.id === editingTask.project_id),
          assigned_to: usersList.find(u => u.id === editingTask.assigned_to),
          created_by: task.created_by // Keep original created_by
        } : task))
      );
      setEditingTask(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;
    setError('');
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600';
      case 'in_progress': return 'bg-blue-100 text-blue-600';
      case 'paused': return 'bg-yellow-100 text-yellow-600';
      case 'completed': return 'bg-purple-100 text-purple-600';
      case 'qc': return 'bg-orange-100 text-orange-600';
      case 'correction': return 'bg-red-100 text-red-600';
      case 'finalized': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)]">
        <p className="text-gray-600 text-lg">Cargando tareas, ¡esto es más lento que un caracol con resaca!</p>
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
        Gestión de Tareas
      </motion.h1>

      <motion.button
        onClick={() => setShowAddTaskModal(true)}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 mb-8 mx-auto"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ListPlus className="w-5 h-5" />
        Crear Nueva Tarea
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
        {tasks.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No hay tareas registradas. ¡Hora de asignar trabajo!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignado a
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {tasks.map((task) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <input
                            type="text"
                            value={editingTask.title}
                            onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-900 font-medium">{task.title}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.project_id}
                            onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          >
                            {projectsList.map(project => (
                              <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{task.projects?.name || 'N/A'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.assigned_to}
                            onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          >
                            {usersList.filter(u => u.role !== 'admin').map(userOption => (
                              <option key={userOption.id} value={userOption.id}>{userOption.username}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{task.assigned_to?.username || 'N/A'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.status}
                            onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                            className="border border-gray-300 rounded-md px-2 py-1 w-full"
                          >
                            {['pending', 'in_progress', 'paused', 'completed', 'qc', 'correction', 'finalized'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingTask?.id === task.id ? (
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={handleUpdateTask}
                              className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Save className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => setEditingTask(null)}
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
                              onClick={() => setEditingTask({ ...task, project_id: task.projects?.id, assigned_to: task.assigned_to?.id })}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteTask(task.id)}
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
        {showAddTaskModal && (
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Crear Nueva Tarea</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label htmlFor="newTaskTitle" className="block text-gray-700 text-sm font-medium mb-2">
                    Título de la Tarea
                  </label>
                  <input
                    type="text"
                    id="newTaskTitle"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newTaskDescription" className="block text-gray-700 text-sm font-medium mb-2">
                    Descripción
                  </label>
                  <textarea
                    id="newTaskDescription"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 resize-y"
                  />
                </div>
                <div>
                  <label htmlFor="newTaskProject" className="block text-gray-700 text-sm font-medium mb-2">
                    Proyecto
                  </label>
                  <select
                    id="newTaskProject"
                    value={newTask.project_id}
                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  >
                    <option value="">Selecciona un proyecto</option>
                    {projectsList.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="newTaskAssignedTo" className="block text-gray-700 text-sm font-medium mb-2">
                    Asignar a
                  </label>
                  <select
                    id="newTaskAssignedTo"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  >
                    <option value="">Selecciona un usuario</option>
                    {usersList.filter(u => u.role === 'normal').map(userOption => ( // Solo usuarios normales
                      <option key={userOption.id} value={userOption.id}>{userOption.username}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                  <motion.button
                    type="button"
                    onClick={() => setShowAddTaskModal(false)}
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
                    Crear Tarea
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

export default TasksManagement;