import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Auth = ({ onLogin }) => {
  const [operatorNumber, setOperatorNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`*, role_id(name)`) // Fetch role name
        .eq('operator_number', operatorNumber)
        .single();

      if (error || !data) {
        throw new Error('Número de operador o contraseña incorrectos.');
      }

      // Simulación de verificación de contraseña (NO USAR EN PRODUCCIÓN)
      // En un entorno real, usarías bcrypt u otra librería para comparar hashes
      if (data.password !== password) { // 'password' es el campo en la DB
        throw new Error('Número de operador o contraseña incorrectos.');
      }

      onLogin({ ...data, role: data.role_id.name }); // Pass role name
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-xl w-full max-w-md text-white"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
      >
        <div className="flex justify-center mb-6">
          {/* Espacio para la imagen de la empresa - tamaño fijo */}
          <div className="w-32 h-32 bg-red-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            LOGO AQUÍ (128x128px)
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-red-500 mb-6">Iniciar Sesión</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="operatorNumber" className="block text-gray-300 text-sm font-medium mb-2">
              Número de Operador
            </label>
            <input
              type="number"
              id="operatorNumber"
              value={operatorNumber}
              onChange={(e) => setOperatorNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 bg-gray-700 text-white placeholder-gray-400"
              placeholder="Ej: 1234"
              required
              min="0"
              max="9999"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 bg-gray-700 text-white placeholder-gray-400"
              placeholder="Tu contraseña secreta"
              required
            />
          </div>
          {error && (
            <motion.p
              className="text-red-400 text-sm text-center bg-red-900/30 border border-red-700 rounded-lg p-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}
          <motion.button
            type="submit"
            className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-red-700 hover:to-red-900 transition-all duration-300 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Entrar'
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Auth;