import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Clock, Play, Pause, CheckCircle, XCircle, Hourglass, AlertCircle, RefreshCcw, Sun, Moon, MessageSquare, Edit, Trash2, Send, Save } from 'lucide-react';
import { fetchTasks, updateTaskStatusAndTotalTime, updateTaskStatus } from '../services/taskService';
import { fetchTaskComments, addComment, updateComment, deleteComment, notifyUsersOfNewComment } from '../services/commentService';
import { formatTime } from '../utils/timeUtils';
import { getStatusColor, getThemeClass, getBgColor, getCardColor, getTableHeadColor, getTableBodyColor, getTextColor, getInputColor, getButtonColor } from '../utils/themeUtils';


const Dashboard = ({ user, theme }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTimer, setActiveTimer] = useState(null); // { taskId, startTime, totalDurationAtStart }
  const [filterStatus, setFilterStatus] = useState('ALL'); // New state for filter
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedTaskComments, setSelectedTaskComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState(null); // { id, message }
  const [currentTaskIdForComments, setCurrentTaskIdForComments] = useState(null); // To store the task ID for comments

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTasks(user.id, user.role);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Timer logic
  useEffect(() => {
    const storedTimer = localStorage.getItem('activeTimer');
    if (storedTimer) {
      const parsedTimer = JSON.parse(storedTimer);
      setActiveTimer(parsedTimer);
    }
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let interval;
    if (activeTimer && activeTimer.startTime) {
      interval = setInterval(() => {
        // Force re-render to update elapsed time
        setActiveTimer(prev => ({ ...prev }));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Supabase Realtime listener for general UI updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        // Re-fetch tasks to update the UI on any task change
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);


  const handleStartTask = async (taskId) => {
    setError('');
    try {
      // Pausar cualquier tarea que esté corriendo para este usuario
      if (activeTimer && activeTimer.taskId !== taskId) {
        await handlePauseTask(activeTimer.taskId);
      }

      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) throw new Error("Task not found.");

      // Only allow starting if status is pending, paused, or correction
      if (!['pending', 'paused', 'correction'].includes(currentTask.status)) {
        setError("Esta tarea no puede ser iniciada en su estado actual.");
        return;
      }

      // Update task status to 'in_progress' or 'correction'
      const newStatus = currentTask.status === 'pending' || currentTask.status === 'paused' ? 'in_progress' : 'correction';
      await updateTaskStatus(taskId, newStatus);

      const timerData = {
        taskId: taskId,
        startTime: new Date().getTime(),
        totalDurationAtStart: currentTask.total_time_spent || 0,
      };
      setActiveTimer(timerData);
      localStorage.setItem('activeTimer', JSON.stringify(timerData));
      loadTasks(); // Refrescar la lista de tareas
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePauseTask = async (taskId) => {
    setError('');
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) throw new Error("Task not found.");

      let newTotalTimeSpent = currentTask.total_time_spent || 0;

      if (activeTimer && activeTimer.taskId === taskId) {
        const elapsedSinceStart = Math.floor((new Date().getTime() - activeTimer.startTime) / 1000);
        newTotalTimeSpent = activeTimer.totalDurationAtStart + elapsedSinceStart;
      }

      await updateTaskStatusAndTotalTime(taskId, 'paused', newTotalTimeSpent);

      setActiveTimer(null);
      localStorage.removeItem('activeTimer');
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setError('');
    try {
      // Pausar la tarea si está activa antes de completarla
      if (activeTimer && activeTimer.taskId === taskId) {
        await handlePauseTask(taskId); // This will save the current time spent
      }

      await updateTaskStatus(taskId, 'completed');

      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminAction = async (taskId, newStatus) => {
    setError('');
    try {
      await updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Hourglass className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'qc': return <AlertCircle className="w-4 h-4" />;
      case 'correction': return <RefreshCcw className="w-4 h-4" />;
      case 'finalized': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getElapsedTime = (task) => {
    let totalSeconds = task.total_time_spent || 0;

    if (activeTimer && activeTimer.taskId === task.id) {
      const elapsedSinceStart = Math.floor((new Date().getTime() - activeTimer.startTime) / 1000);
      totalSeconds = activeTimer.totalDurationAtStart + elapsedSinceStart;
    }

    return formatTime(totalSeconds);
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'ALL') return true;
    return task.status.toUpperCase() === filterStatus;
  });

  const handleOpenComments = async (taskId) => {
    setCurrentTaskIdForComments(taskId);
    try {
      const data = await fetchTaskComments(taskId);
      setSelectedTaskComments(data.map(comment => ({
        ...comment,
        created_at: new Date(comment.created_at).toLocaleString()
      })));
      setShowCommentsModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !currentTaskIdForComments) return;
    try {
      const commentData = {
        task_id: currentTaskIdForComments,
        user_id: user.id,
        message: newCommentText.trim(),
      };
      const data = await addComment(commentData);
      setSelectedTaskComments(prev => [...prev, { ...data, created_at: new Date(data.created_at).toLocaleString() }]);
      setNewCommentText('');

      const task = tasks.find(t => t.id === currentTaskIdForComments);
      if (task) {
        await notifyUsersOfNewComment(commentData, task, user);
      }

    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setNewCommentText(comment.message);
  };

  const handleSaveEditedComment = async () => {
    if (!newCommentText.trim() || !editingComment) return;
    try {
      const data = await updateComment(editingComment.id, newCommentText.trim());
      setSelectedTaskComments(prev => prev.map(comment =>
        comment.id === editingComment.id ? { ...data, created_at: comment.created_at } : comment // Preserve formatted date
      ));
      setEditingComment(null);
      setNewCommentText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) return;
    try {
      await deleteComment(commentId);
      setSelectedTaskComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  };

  const canEditComment = (commentCreatedAt) => {
    const commentTime = new Date(commentCreatedAt).getTime();
    const fiveHours = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    return (new Date().getTime() - commentTime) < fiveHours;
  };

  const canDeleteComment = (comment, user) => {
    // Admin can delete any comment
    if (user.role === 'admin') return true;
    // Author can delete their own comment
    return comment.user_id.id === user.id;
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-[calc(100vh-80px)] ${getBgColor(theme)}`}>
        <p className={`${getTextColor(theme, 'secondary')} text-lg`}>Cargando tareas, ¡no te duermas!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center min-h-[calc(100vh-80px)] ${getBgColor(theme)}`}>
        <p className="text-red-500 text-lg">Error: {error}</p>
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
        Tu Panel de Tareas
      </motion.h1>

      <div className="flex justify-center mb-8">
        <div className={`p-1 rounded-full ${getCardColor(theme)} flex items-center`}>
          {['ALL', 'PENDING', 'IN_PROGRESS', 'PAUSED', 'CORRECTION', 'COMPLETED', 'QC', 'FINALIZED'].map(status => (
            <motion.button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                filterStatus === status
                  ? (theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-500 text-white')
                  : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-red-300')
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {status.replace('_', ' ')}
            </motion.button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <motion.div
          className={`backdrop-blur-xl border rounded-3xl p-12 text-center shadow-xl ${getCardColor(theme)}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              theme === 'dark' ? 'bg-gradient-to-br from-red-900 to-black' : 'bg-gradient-to-br from-red-300 to-red-500'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          >
            <Clock className={`w-12 h-12 ${theme === 'dark' ? 'text-red-500' : 'text-white'}`} />
          </motion.div>
          <h3 className={`text-2xl font-bold mb-3 ${getTextColor(theme, 'primary')}`}>
            ¡No hay tareas para este estado!
          </h3>
          <p className={`${getTextColor(theme, 'tertiary')} font-medium`}>
            Intenta cambiar el filtro o crea una nueva tarea.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              className={`backdrop-blur-xl border rounded-2xl p-6 shadow-lg flex flex-col ${getCardColor(theme)}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ translateY: -5 }}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-semibold leading-tight pr-4 ${getTextColor(theme, 'primary')}`}>{task.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(task.status, theme)}`}>
                  {getStatusIcon(task.status)}
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className={`text-sm mb-4 flex-grow ${getTextColor(theme, 'secondary')}`}>{task.description}</p>
              <div className={`text-xs mb-4 ${getTextColor(theme, 'tertiary')}`}>
                <p>Proyecto: <span className={`font-medium ${getTextColor(theme, 'primary')}`}>{task.projects.name}</span></p>
                <p>Asignado a: <span className={`font-medium ${getTextColor(theme, 'primary')}`}>{task.assigned_to.username}</span></p>
              </div>

              {/* Display Timer */}
              <div className={`flex items-center justify-center border rounded-lg p-3 mb-4 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-red-100 border-red-200'}`}>
                <div className={`flex items-center gap-2 font-bold text-xl ${getTextColor(theme, 'accent')}`}>
                  <Clock className="w-6 h-6" />
                  <span>{getElapsedTime(task)}</span>
                </div>
              </div>

              {user.role === 'digitador' && (task.status === 'pending' || task.status === 'in_progress' || task.status === 'paused' || task.status === 'correction') && (
                <>
                  {activeTimer && activeTimer.taskId === task.id ? (
                    <motion.button
                      onClick={() => handlePauseTask(task.id)}
                      className="w-full bg-yellow-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-yellow-700 transition-all duration-300 flex items-center justify-center gap-2 mb-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Pause className="w-5 h-5" />
                      Pausar Tarea
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => handleStartTask(task.id)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 mb-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Play className="w-5 h-5" />
                      {task.status === 'paused' ? 'Reanudar Tarea' : 'Iniciar Tarea'}
                    </motion.button>
                  )}

                  {(task.status === 'in_progress' || task.status === 'paused' || task.status === 'correction') && (
                    <motion.button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Marcar como Terminado
                    </motion.button>
                  )}
                </>
              )}

              {(user.role === 'admin' || user.role === 'leader') && (
                <div className={`mt-4 pt-4 border-t flex flex-col gap-2 ${theme === 'dark' ? 'border-gray-700' : 'border-red-200'}`}>
                  <p className={`font-semibold mb-2 ${getTextColor(theme, 'secondary')}`}>Acciones de Tarea:</p>
                  {task.status === 'completed' && (
                    <motion.button
                      onClick={() => handleAdminAction(task.id, 'qc')}
                      className="w-full bg-orange-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-orange-700 transition-all duration-300 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <AlertCircle className="w-5 h-5" />
                      Enviar a QC
                    </motion.button>
                  )}
                  {task.status === 'qc' && (
                    <>
                      <motion.button
                        onClick={() => handleAdminAction(task.id, 'finalized')}
                        className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <CheckCircle className="w-5 h-5" />
                        Finalizar Tarea
                      </motion.button>
                      <motion.button
                        onClick={() => handleAdminAction(task.id, 'correction')}
                        className="w-full bg-red-800 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-red-900 transition-all duration-300 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <XCircle className="w-5 h-5" />
                        Enviar a Corrección
                      </motion.button>
                    </>
                  )}
                </div>
              )}
              <motion.button
                onClick={() => handleOpenComments(task.id)}
                className={`mt-4 w-full px-4 py-2 rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors duration-200 ${getButtonColor(theme, 'secondary')}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageSquare className="w-5 h-5" />
                Ver Comentarios
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCommentsModal && currentTaskIdForComments && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 shadow-2xl w-full max-w-lg`}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <h2 className={`text-2xl font-bold mb-6 text-center ${getTextColor(theme, 'primary')}`}>Comentarios de la Tarea</h2>
              <div className={`max-h-80 overflow-y-auto mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-red-100 border border-red-200'}`}>
                {selectedTaskComments.length === 0 ? (
                  <p className={`${getTextColor(theme, 'tertiary')} text-center`}>No hay comentarios aún. ¡Sé el primero!</p>
                ) : (
                  selectedTaskComments.map(comment => (
                    <motion.div
                      key={comment.id}
                      className={`mb-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'} shadow-sm`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-semibold ${getTextColor(theme, 'accent')}`}>{comment.user_id.username}</span>
                        <span className={`text-xs ${getTextColor(theme, 'tertiary')}`}>
                          {comment.created_at}
                          {comment.edited_at && (
                            <span className={`${getTextColor(theme, 'tertiary')} italic font-normal ml-1`}> (editado)</span>
                          )}
                        </span>
                      </div>
                      <p className={`${getTextColor(theme, 'primary')}`}>{comment.message}</p>
                      {(comment.user_id.id === user.id && canEditComment(comment.created_at)) && (
                        <div className="flex justify-end gap-2 mt-2">
                          <motion.button
                            onClick={() => handleEditComment(comment)}
                            className={`p-1 rounded-full ${getButtonColor(theme, 'secondary')}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )}
                      {canDeleteComment(comment, user) && (
                        <div className="flex justify-end gap-2 mt-2">
                          <motion.button
                            onClick={() => handleDeleteComment(comment.id)}
                            className={`p-1 rounded-full ${theme === 'dark' ? 'text-red-400 hover:text-red-200 hover:bg-gray-700' : 'text-red-500 hover:text-red-700 hover:bg-red-100'}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
              <div className={`${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-red-100 border border-red-200'} flex gap-2 p-3 rounded-lg`}>
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={editingComment ? "Edita tu comentario..." : "Escribe un nuevo comentario..."}
                  className={`${getInputColor(theme)} flex-grow px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
                <motion.button
                  onClick={editingComment ? handleSaveEditedComment : handleAddComment}
                  className={`${getButtonColor(theme, 'secondary')} p-2 rounded-lg transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {editingComment ? <Save className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </motion.button>
              </div>
              <div className="flex justify-end mt-4">
                <motion.button
                  onClick={() => {
                    setShowCommentsModal(false);
                    setSelectedTaskComments([]);
                    setNewCommentText('');
                    setEditingComment(null);
                    setCurrentTaskIdForComments(null);
                  }}
                  className={`${getButtonColor(theme, 'secondary')} px-5 py-2 rounded-lg transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;