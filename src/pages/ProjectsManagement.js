import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { FolderPlus, Edit, Trash2, Save, X, Folder } from 'lucide-react';
import { fetchProjects, addProject, updateProject, deleteProject } from '../services/projectService';
import { fetchLeadersAndAdmins } from '../services/userService';
import { getStatusColor, getThemeClass, getBgColor, getCardColor, getTableHeadColor, getTableBodyColor, getTextColor, getInputColor, getButtonColor } from '../utils/themeUtils';


const ProjectsManagement = ({ user, theme }) => {
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState([]); // New state for leaders
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', leader_id: '' });
  const [editingProject, setEditingProject] = useState(null); // Project object being edited

  useEffect(() => {
    loadProjectsAndLeaders();
  }, []);

  const loadProjectsAndLeaders = async () => {
    setLoading(true);
    setError('');
    try {
      const projectsData = await fetchProjects(user.id, user.role);
      setProjects(projectsData);

      const leadersData = await fetchLeadersAndAdmins();
      setLeaders(leadersData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await addProject({ ...newProject, created_by: user.id });
      setProjects((prev) => [data, ...prev]);
      setNewProject({ name: '', description: '', leader_id: '' });
      setShowAddProjectModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingProject) return;

    try {
      await updateProject(editingProject);
      // Update the project in state with the new leader's username
      const updatedLeader = leaders.find(l => l.id === editingProject.leader_id);
      setProjects((prev) =>
        prev.map((project) => (project.id === editingProject.id ? {
          ...editingProject,
          created_by: project.created_by, // Keep original created_by
          leader_id: updatedLeader ? { username: updatedLeader.username } : null // Update leader_id object
        } : project))
      );
      setEditingProject(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proyecto? ¡Esto también eliminará todas las tareas asociadas!')) return;
    setError('');
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-[calc(100vh-80px)] ${getBgColor(theme)}`}>
        <p className={`${getTextColor(theme, 'secondary')} text-lg`}>Cargando proyectos, ¡la burocracia es lenta!</p>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${getBgColor(theme)}`}>
      <motion.h1
        className={`text-4xl font-extrabold mb-8 text-center ${getTextColor(theme, 'title')}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Gestión de Proyectos
      </motion.h1>

      {user.role === 'admin' && ( // Only admin can create projects
        <motion.button
          onClick={() => setShowAddProjectModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 mb-8 mx-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FolderPlus className="w-5 h-5" />
          Crear Nuevo Proyecto
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

      <div className={`${getCardColor(theme)} backdrop-blur-xl border rounded-3xl p-6 shadow-xl`}>
        {projects.length === 0 ? (
          <p className={`text-center py-8 ${getTextColor(theme, 'tertiary')}`}>No hay proyectos registrados. ¡A trabajar!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${getTableHeadColor(theme)}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getTextColor(theme, 'secondary')}`}>
                    Nombre del Proyecto
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getTextColor(theme, 'secondary')}`}>
                    Descripción
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getTextColor(theme, 'secondary')}`}>
                    Líder
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getTextColor(theme, 'secondary')}`}>
                    Creado por
                  </th>
                  {user.role === 'admin' && (
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${getTextColor(theme, 'secondary')}`}>
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`${getTableBodyColor(theme)} divide-y`}>
                <AnimatePresence>
                  {projects.map((project) => (
                    <motion.tr
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProject?.id === project.id ? (
                          <input
                            type="text"
                            value={editingProject.name}
                            onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full ${getInputColor(theme)}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Folder className={`w-4 h-4 ${getTextColor(theme, 'tertiary')}`} />
                            <span className={`font-medium ${getTextColor(theme, 'primary')}`}>{project.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingProject?.id === project.id ? (
                          <textarea
                            value={editingProject.description}
                            onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full h-20 resize-y ${getInputColor(theme)}`}
                          />
                        ) : (
                          <p className={`text-sm line-clamp-2 ${getTextColor(theme, 'secondary')}`}>{project.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProject?.id === project.id ? (
                          <select
                            value={editingProject.leader_id}
                            onChange={(e) => setEditingProject({ ...editingProject, leader_id: e.target.value })}
                            className={`border rounded-md px-2 py-1 w-full ${getInputColor(theme)}`}
                          >
                            <option value="">Selecciona un Líder</option>
                            {leaders.map(leader => (
                              <option key={leader.id} value={leader.id}>{leader.username}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`${getTextColor(theme, 'secondary')}`}>{project.leader_id?.username || 'N/A'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${getTextColor(theme, 'secondary')}`}>{project.created_by.username}</span>
                      </td>
                      {user.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingProject?.id === project.id ? (
                            <div className="flex justify-end gap-2">
                              <motion.button
                                onClick={handleUpdateProject}
                                className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Save className="w-5 h-5" />
                              </motion.button>
                              <motion.button
                                onClick={() => setEditingProject(null)}
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
                                onClick={() => setEditingProject({ ...project, leader_id: project.leader_id?.id || '' })}
                                className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Edit className="w-5 h-5" />
                              </motion.button>
                              <motion.button
                                onClick={() => handleDeleteProject(project.id)}
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
        {showAddProjectModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`${getCardColor(theme)} rounded-3xl p-8 shadow-2xl w-full max-w-md`}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <h2 className={`text-2xl font-bold mb-6 text-center ${getTextColor(theme, 'primary')}`}>Crear Nuevo Proyecto</h2>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label htmlFor="newProjectName" className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    id="newProjectName"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getInputColor(theme)}`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newProjectDescription" className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                    Descripción
                  </label>
                  <textarea
                    id="newProjectDescription"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 resize-y ${getInputColor(theme)}`}
                  />
                </div>
                <div>
                  <label htmlFor="newProjectLeader" className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                    Líder del Proyecto
                  </label>
                  <select
                    id="newProjectLeader"
                    value={newProject.leader_id}
                    onChange={(e) => setNewProject({ ...newProject, leader_id: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${getInputColor(theme)}`}
                  >
                    <option value="">Selecciona un Líder</option>
                    {leaders.map(leader => (
                      <option key={leader.id} value={leader.id}>{leader.username}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                  <motion.button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className={`${getButtonColor(theme, 'secondary')} px-5 py-2 rounded-xl transition-colors duration-200`}
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
                    Crear Proyecto
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

export default ProjectsManagement;