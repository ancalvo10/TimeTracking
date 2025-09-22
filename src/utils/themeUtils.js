// utils/themeUtils.js
export const getStatusColor = (status, theme) => {
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

export const getThemeClass = (theme) => {
  return theme === 'dark' ? 'dark' : 'light';
};

export const getBgColor = (theme) => {
  return theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-red-50 text-gray-900';
};

export const getCardColor = (theme) => {
  return theme === 'dark' ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-red-200/50';
};

export const getTableHeadColor = (theme) => {
  return theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
};

export const getTableBodyColor = (theme) => {
  return theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200';
};

export const getTextColor = (theme, type = 'normal') => {
  if (type === 'title') {
    return theme === 'dark' ? 'text-red-400' : 'text-red-700';
  }
  if (type === 'primary') {
    return theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
  }
  if (type === 'secondary') {
    return theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  }
  if (type === 'tertiary') {
    return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  }
  if (type === 'accent') {
    return theme === 'dark' ? 'text-red-400' : 'text-red-600';
  }
  return theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
};

export const getInputColor = (theme) => {
  return theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900';
};

export const getButtonColor = (theme, type = 'normal') => {
  if (type === 'secondary') {
    return theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  }
  return ''; // Default for primary buttons handled by specific classes
};