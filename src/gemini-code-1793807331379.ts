import React, { useState } from 'react';
import { FiAward, FiStar, FiShield, FiTrendingUp, FiSearch, FiUser } from 'react-icons/fi';

interface YoungMember {
  id: string | number;
  rank: number;
  name: string;
  points: number;
  attendanceStreak: number;
  avatar?: string;
  role: 'LÍDER' | 'MIEMBRO';
}

export const RankingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Datos de ejemplo optimizados para las tarjetas
  const members: YoungMember[] = [
    { rank: 1, name: 'David M.', points: 10, attendanceStreak: 11, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', role: 'LÍDER' },
    { rank: 2, name: 'Fabiana D.', points: 10, attendanceStreak: 11, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', role: 'LÍDER' },
    { rank: 3, name: 'Juan D.', points: 10, attendanceStreak: 4, role: 'LÍDER' },
    { rank: 4, name: 'Juliana J.', points: 10, attendanceStreak: 11, role: 'LÍDER' },
    { rank: 5, name: 'Kelly L.', points: 10, attendanceStreak: 11, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', role: 'LÍDER' },
    { rank: 6, name: 'Raider D.', points: 10, attendanceStreak: 7, role: 'LÍDER' },
    { rank: 7, name: 'Adrian D.', points: 0, attendanceStreak: 1, role: 'MIEMBRO' },
  ];

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* SECCIÓN DEL PODIO SUPERIOR */}
      <section className="bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <FiAward className="text-amber-400 text-3xl" /> Podio de Liderazgo
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Reconocimiento mensual de puntaje y compromiso</p>
        </div>

        {/* Estructura del Podio (2º, 1º, 3º) */}
        <div className="flex flex-col md:flex-row items-end justify-center gap-6 pt-6 pb-2">
          
          {/* 2do Lugar */}
          <div className="flex flex-col items-center w-full md:w-1/3 max-w-[220px]">
            <div className="relative mb-3 group">
              <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-slate-400 to-slate-200 shadow-xl">
                <img src={members[1]?.avatar} alt={members[1]?.name} className="w-full h-full object-cover rounded-xl" />
              </div>
              <span className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg shadow">2º</span>
            </div>
            <p className="font-bold text-white text-sm">{members[1]?.name}</p>
            <p className="text-xs text-amber-400 font-semibold mb-3">{members[1]?.points} Puntos</p>
            <div className="w-full bg-gradient-to-t from-slate-900 to-slate-800 rounded-t-2xl h-32 border-t border-slate-700 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-slate-600">2º</span>
            </div>
          </div>

          {/* 1er Lugar */}
          <div className="flex flex-col items-center w-full md:w-1/3 max-w-[240px] -mt-4">
            <div className="relative mb-3 group">
              <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-2xl shadow-amber-500/20 animate-pulse">
                <img src={members[0]?.avatar} alt={members[0]?.name} className="w-full h-full object-cover rounded-xl" />
              </div>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                ⭐ 1ST
              </span>
            </div>
            <p className="font-bold text-white text-base">{members[0]?.name}</p>
            <p className="text-xs text-amber-400 font-bold mb-3">{members[0]?.points} Puntos</p>
            <div className="w-full bg-gradient-to-t from-amber-950/60 via-amber-900/30 to-amber-800/20 rounded-t-2xl h-44 border-t border-amber-500/50 flex items-center justify-center shadow-2xl">
              <span className="text-4xl font-black text-amber-500/40">1º</span>
            </div>
          </div>

          {/* 3er Lugar */}
          <div className="flex flex-col items-center w-full md:w-1/3 max-w-[220px]">
            <div className="relative mb-3 group">
              <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-amber-700 to-amber-900 shadow-xl">
                <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center font-bold text-white text-lg">
                  {members[2]?.name.substring(0,2)}
                </div>
              </div>
              <span className="absolute -bottom-2 -right-1 bg-amber-800 text-white font-bold text-xs px-2 py-0.5 rounded-lg shadow">3º</span>
            </div>
            <p className="font-bold text-white text-sm">{members[2]?.name}</p>
            <p className="text-xs text-amber-400 font-semibold mb-3">{members[2]?.points} Puntos</p>
            <div className="w-full bg-gradient-to-t from-amber-950/80 to-amber-900/50 rounded-t-2xl h-24 border-t border-amber-800/50 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-amber-900/60">3º</span>
            </div>
          </div>

        </div>
      </section>

      {/* BARRA DE BÚSQUEDA Y TÍTULO DE TARJETAS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FiShield className="text-purple-400" /> Clasificación General
          </h3>
          <p className="text-xs text-gray-400">Listado interactivo de jóvenes registrados</p>
        </div>

        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input 
            type="text" 
            placeholder="Buscar joven por nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* GRILLA DE TARJETAS (CARDS GRID) EN LUGAR DE FILAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMembers.map((member) => (
          <div 
            key={member.id || member.rank}
            className="bg-[#111827] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-xl hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            {/* Línea superior brillante de neón */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>

            {/* Cabecera de tarjeta */}
            <div className="flex items-center justify-between mb-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                member.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30' :
                member.rank === 2 ? 'bg-slate-300 text-slate-950' :
                member.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-300'
              }`}>
                #{member.rank}
              </span>
              
              <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg border ${
                member.role === 'LÍDER' 
                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/30' 
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {member.role}
              </span>
            </div>

            {/* Avatar e Información */}
            <div className="flex items-center gap-3.5 my-2">
              <div className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-500/50 to-purple-600/50 shrink-0 shadow-md">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover rounded-[14px]" />
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-[14px] flex items-center justify-center font-bold text-white text-sm">
                    <FiUser className="text-gray-400 text-lg" />
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-white text-base truncate group-hover:text-amber-400 transition">
                  {member.name}
                </h4>
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <FiTrendingUp className="text-emerald-400 text-xs" /> {member.attendanceStreak} asistencias seguidas
                </p>
              </div>
            </div>

            {/* Puntuación y Pie de Tarjeta */}
            <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <FiStar className="fill-amber-400 text-xs" />
                <span>{member.points}</span>
                <span className="text-xs font-normal text-gray-400">puntos</span>
              </div>

              <span className="text-[10px] text-gray-500 font-medium">Jóvenes de Fuego</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};