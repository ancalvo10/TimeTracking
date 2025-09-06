import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { ListPlus, Edit, Trash2, Save, X, ListTodo, User, Folder } from 'lucide-react';

const TasksManagement = ({ user, theme }) => {
  const [tasks, setTasks] = useState([]);
  const [digitadores, setDigitadores] = useState([]); // Changed from usersList to digitadores
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
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          id, title, description, status, created_at,
          projects(id, name),
          assigned_to(id, username),
          created_by(username)
        `)
        .order('created_at', { ascending: false });

      let projectsQuery = supabase
        .from('projects')
        .select('id, name');

      // Filter tasks and projects based on user role
      if (user.role === 'leader') {
        const { data: leaderProjects, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('leader_id', user.id);
        if (projectError) throw projectError;
        const projectIds = leaderProjects.map(p => p.id);

        tasksQuery = tasksQuery.in('project_id', projectIds);
        projectsQuery = projectsQuery.in('id', projectIds);
      } else if (user.role === 'digitador') {
        // Digitadores should not access this page, redirect or show error
        setError("Acceso denegado. Los digitadores no pueden gestionar tareas desde aquí.");
        setLoading(false);
        return;
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;
      setTasks(tasksData);

      const { data: digitadoresData, error: digitadoresError } = await supabase
        .from('users')
        .select('id, username, role_id(name)') // Select role_id and its name
        .eq('role_id.name', 'digitador'); // Filter by role name

      if (digitadoresError) throw digitadoresError;
      setDigitadores(digitadoresData);

      const { data: projectsData, error: projectsError } = await projectsQuery;

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
      // Update the task in state with the new assigned user's username
      const updatedAssignedTo = digitadores.find(d => d.id === editingTask.assigned_to);
      setTasks((prev) =>
        prev.map((task) => (task.id === editingTask.id ? {
          ...editingTask,
          projects: projectsList.find(p => p.id === editingTask.project_id),
          assigned_to: updatedAssignedTo ? { username: updatedAssignedTo.username } : null,
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
      case 'pending': return theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-red-100 text-red-700';
      case 'in_progress': return theme === 'dark' ? 'bg-red-700 text-white' : 'bg-red-500 text-white';
      case 'paused': return theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-yellow-100 text-yellow-700';
      case 'completed': return theme === 'dark' ? 'bg-purple-700 text-white' : 'bg-purple-500 text-white';
      case 'qc': return theme === 'dark' ? 'bg-orange-700 text-white' : 'bg-orange-500 text-white';
      case 'correction': return theme === 'dark' ? 'bg-red-900 text-white' : 'bg-red-700 text-white';
      case 'finalized': return theme === 'dark' ? 'bg-green-700 text-white' : 'bg-green-500 text-white';
      default: return theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-red-100 text-red-700';
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-[calc(100vh-80px)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-red-50'}`}>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-lg`}>Cargando tareas, ¡esto es más lento que un caracol con resaca!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center min-h-[calc(100vh-80px)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-red-50'}`}>
        <p className="text-red-600 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-red-50 text-gray-900'}`}>
      <motion.h1
        className={`text-4xl font-extrabold mb-8 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Gestión de Tareas
      </motion.h1>

      {(user.role === 'admin' || user.role === 'leader') && ( // Only admin and leader can create tasks
        <motion.button
          onClick={() => setShowAddTaskModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 mb-8 mx-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ListPlus className="w-5 h-5" />
          Crear Nueva Tarea
        </motion.button>
      )}

      {error && (
        <motion.p
          className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}

      <div className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-red-200/50'} backdrop-blur-xl border rounded-3xl p-6 shadow-xl`}>
        {tasks.length === 0 ? (
          <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No hay tareas registradas. ¡Hora de asignar trabajo!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
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
                  {(user.role === 'admin' || user.role === 'leader') && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`${theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
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
                            className={`border rounded-md px-2 py-1 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <ListTodo className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{task.title}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.project_id}
                            onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                          >
                            {projectsList.map(project => (
                              <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Folder className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{task.projects?.name || 'N/A'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.assigned_to}
                            onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                          >
                            {digitadores.map(digitador => ( // Use digitadores
                              <option key={digitador.id} value={digitador.id}>{digitador.username}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{task.assigned_to?.username || 'N/A'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTask?.id === task.id ? (
                          <select
                            value={editingTask.status}
                            onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
                      {(user.role === 'admin' || user.role === 'leader') && (
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
                      )}
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
              className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 shadow-2xl w-full max-w-md`}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Crear Nueva Tarea</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label htmlFor="newTaskTitle" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Título de la Tarea
                  </label>
                  <input
                    type="text"
                    id="newTaskTitle"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newTaskDescription" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Descripción
                  </label>
                  <textarea
                    id="newTaskDescription"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 resize-y ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label htmlFor="newTaskProject" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Proyecto
                  </label>
                  <select
                    id="newTaskProject"
                    value={newTask.project_id}
                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    required
                  >
                    <option value="">Selecciona un proyecto</option>
                    {projectsList.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="newTaskAssignedTo" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Asignar a
                  </label>
                  <select
                    id="newTaskAssignedTo"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    required
                  >
                    <option value="">Selecciona un usuario</option>
                    {digitadores.map(digitador => ( // Use digitadores
                      <option key={digitador.id} value={digitador.id}>{digitador.username}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                  <motion.button
                    type="button"
                    onClick={() => setShowAddTaskModal(false)}
                    className={`${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} px-5 py-2 rounded-xl transition-colors duration-200`}
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