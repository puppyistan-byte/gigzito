import React from 'react';

const GeezeePulse = ({ stats = {} }) => {
  return (
    <div className="geezee-pulse border-gold p-4 bg-black rounded-lg">
      <h2 className="text-gold font-bold mb-2">Keepin' it GeeZee</h2>
      <div className="flex gap-4 text-2xl">
        <span title="Connections">❤️ {stats.likes || 0}</span>
        <span title="Interest">👀 {stats.views || 0}</span>
        <span title="Value">💰 {stats.earnings || 0}</span>
        <span title="Class">🪭</span>
      </div>
    </div>
  );
};

export default GeezeePulse;
