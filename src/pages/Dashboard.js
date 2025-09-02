import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Clock, Play, Pause, CheckCircle, XCircle, Hourglass, AlertCircle, RefreshCcw } from 'lucide-react';

const Dashboard = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTimer, setActiveTimer] = useState(null); // { taskId, startTime, totalDurationAtStart }

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('tasks')
        .select(`
          id, title, description, status, created_at, total_time_spent,
          projects(name),
          assigned_to(username, id)
        `);

      if (user.role === 'digitador') { // Changed from 'normal' to 'digitador'
        query = query.eq('assigned_to', user.id);
      } else if (user.role === 'leader') {
        // Leaders can only see tasks from projects they lead
        const { data: leaderProjects, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('leader_id', user.id);
        if (projectError) throw projectError;
        const projectIds = leaderProjects.map(p => p.id);
        query = query.in('project_id', projectIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

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
    fetchTasks();
  }, [fetchTasks]);

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
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);


  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (taskUpdateError) throw taskUpdateError;

      const timerData = {
        taskId: taskId,
        startTime: new Date().getTime(),
        totalDurationAtStart: currentTask.total_time_spent || 0,
      };
      setActiveTimer(timerData);
      localStorage.setItem('activeTimer', JSON.stringify(timerData));
      fetchTasks(); // Refrescar la lista de tareas
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

      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
          status: 'paused',
          total_time_spent: newTotalTimeSpent,
        })
        .eq('id', taskId);
      if (taskUpdateError) throw taskUpdateError;

      setActiveTimer(null);
      localStorage.removeItem('activeTimer');
      fetchTasks();
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

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminAction = async (taskId, newStatus) => {
    setError('');
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-700 text-gray-300';
      case 'in_progress': return 'bg-red-700 text-white';
      case 'paused': return 'bg-gray-600 text-gray-300';
      case 'completed': return 'bg-purple-700 text-white';
      case 'qc': return 'bg-orange-700 text-white';
      case 'correction': return 'bg-red-900 text-white';
      case 'finalized': return 'bg-green-700 text-white';
      default: return 'bg-gray-700 text-gray-300';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-900">
        <p className="text-gray-300 text-lg">Cargando tareas, ¡no te duermas!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-900">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-900 text-gray-100">
      <motion.h1
        className="text-4xl font-extrabold text-red-500 mb-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Tu Panel de Tareas
      </motion.h1>

      {tasks.length === 0 ? (
        <motion.div
          className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 text-center shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-24 h-24 bg-gradient-to-br from-red-900 to-black rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          >
            <Clock className="w-12 h-12 text-red-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-100 mb-3">
            ¡No hay tareas asignadas!
          </h3>
          <p className="text-gray-400 font-medium">
            Parece que tienes tiempo libre... o tu admin no te ha asignado nada.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ translateY: -5 }}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-100 leading-tight pr-4">{task.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(task.status)}`}>
                  {getStatusIcon(task.status)}
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-4 flex-grow">{task.description}</p>
              <div className="text-gray-400 text-xs mb-4">
                <p>Proyecto: <span className="font-medium text-gray-200">{task.projects.name}</span></p>
                <p>Asignado a: <span className="font-medium text-gray-200">{task.assigned_to.username}</span></p>
              </div>

              {/* Display Timer */}
              <div className="flex items-center justify-center bg-gray-700 border border-gray-600 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xl">
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
                <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-2">
                  <p className="text-gray-300 font-semibold mb-2">Acciones de {user.role === 'admin' ? 'Admin' : 'Líder'}:</p>
                  {task.status === 'completed' && (
                    <motion.button
                      onClick={() => handleAdminAction(task.id, 'qc')}
                      className="w-full bg-orange-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-orange-700 transition-all duration-200 flex items-center justify-center gap-2"
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
                        className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <CheckCircle className="w-5 h-5" />
                        Finalizar Tarea
                      </motion.button>
                      <motion.button
                        onClick={() => handleAdminAction(task.id, 'correction')}
                        className="w-full bg-red-800 text-white font-semibold py-2 rounded-lg shadow-md hover:bg-red-900 transition-all duration-200 flex items-center justify-center gap-2"
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;