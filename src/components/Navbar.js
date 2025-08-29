import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Briefcase, Clock, ListTodo, Bell, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Navbar = ({ user, onLogout }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel('public:tasks_notifications') // Unique channel name
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
          // Listen for new notifications inserted into the DB
          if (payload.new.user_id === user.id && !payload.new.read) {
            setNotifications(prev => [payload.new, ...prev]);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, async payload => {
          // This listener is for generating notifications based on task changes
          // It will then insert into the notifications table, which the INSERT listener above will catch.

          // Fetch assigned_to_username for admin notifications
          let assignedToUsername = '';
          if (payload.new.assigned_to) {
            const { data: assignedUser, error: userError } = await supabase
              .from('users')
              .select('username')
              .eq('id', payload.new.assigned_to)
              .single();
            if (userError) console.error("Error fetching assigned user:", userError.message);
            assignedToUsername = assignedUser ? assignedUser.username : 'un usuario';
          }

          // Notification for assigned user when task is assigned or needs correction
          if (payload.new.assigned_to === user.id) {
            if (payload.old.status !== 'correction' && payload.new.status === 'correction') {
              await supabase.from('notifications').insert({
                user_id: user.id,
                message: `¡Tarea "${payload.new.title}" necesita corrección!`,
                type: 'warning',
              });
            } else if (payload.old.assigned_to !== payload.new.assigned_to) {
              await supabase.from('notifications').insert({
                user_id: user.id,
                message: `¡Se te ha asignado la tarea "${payload.new.title}"!`,
                type: 'info',
              });
            }
          }
          // Notification for admins when a task is completed or corrected and completed
          if (user.role === 'admin') {
            if (payload.old.status !== 'completed' && payload.new.status === 'completed') {
              await supabase.from('notifications').insert({
                user_id: user.id, // Admin's ID
                message: `¡Tarea "${payload.new.title}" ha sido marcada como TERMINADA por ${assignedToUsername}!`,
                type: 'success',
              });
            } else if (payload.old.status === 'correction' && payload.new.status === 'completed') {
              await supabase.from('notifications').insert({
                user_id: user.id, // Admin's ID
                message: `¡Tarea "${payload.new.title}" ha sido CORREGIDA y marcada como TERMINADA por ${assignedToUsername}!`,
                type: 'success',
              });
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const clearNotification = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error("Error marking notification as read:", err.message);
    }
  };

  const handleLogoutClick = async () => {
    // Pause all running tasks for the current user before logging out
    try {
      const { data: runningTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, status, total_time_spent')
        .eq('assigned_to', user.id)
        .in('status', ['in_progress', 'correction']);

      if (fetchError) throw fetchError;

      for (const task of runningTasks) {
        const currentTaskInState = notifications.find(t => t.id === task.id); // Find the task in current state
        let newTotalTimeSpent = task.total_time_spent || 0;

        // If the task was actively being timed by the current user
        if (localStorage.getItem('activeTimer')) {
          const activeTimer = JSON.parse(localStorage.getItem('activeTimer'));
          if (activeTimer.taskId === task.id) {
            const elapsedSinceStart = Math.floor((new Date().getTime() - activeTimer.startTime) / 1000);
            newTotalTimeSpent = activeTimer.totalDurationAtStart + elapsedSinceStart;
          }
        }

        await supabase
          .from('tasks')
          .update({
            status: 'paused',
            total_time_spent: newTotalTimeSpent,
          })
          .eq('id', task.id);
      }
    } catch (err) {
      console.error("Error pausing tasks on logout:", err.message);
    } finally {
      onLogout(); // Proceed with logout even if pausing fails
    }
  };

  return (
    <motion.nav
      className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-sm p-4 sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Clock className="w-7 h-7 text-blue-600" />
          TimeTracker
        </Link>

        <div className="flex items-center gap-6">
          {user && user.role === 'admin' && (
            <>
              <Link to="/users" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                <User className="w-5 h-5" />
                Usuarios
              </Link>
              <Link to="/projects" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                <Briefcase className="w-5 h-5" />
                Proyectos
              </Link>
              <Link to="/tasks" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                <ListTodo className="w-5 h-5" />
                Tareas
              </Link>
            </>
          )}
          {user && user.role === 'leader' && (
            <>
              <Link to="/projects" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center gap-1">
                <Briefcase className="w-5 h-5" />
                Mis Proyectos
              </Link>
            </>
          )}

          <div className="relative">
            <motion.button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-500 text-white text-xs flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
                >
                  <h3 className="text-lg font-semibold text-gray-800 px-4 mb-2">Notificaciones</h3>
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm px-4 py-2">No hay notificaciones nuevas.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map(notif => (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 last:border-b-0 ${notif.type === 'warning' ? 'bg-yellow-50' : notif.type === 'success' ? 'bg-green-50' : 'bg-blue-50'}`}
                        >
                          <p className="text-sm text-gray-700 flex-grow">{notif.message}</p>
                          <motion.button
                            onClick={() => clearNotification(notif.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <XCircle className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className="text-gray-700 font-medium hidden sm:block">
            Hola, {user?.username || 'Invitado'} ({user?.role})
          </span>
          <motion.button
            onClick={handleLogoutClick}
            className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors duration-200 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-5 h-5" />
            Salir
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;