import React from 'react';
import { appointmentService } from '../services/api';
import { Appointment, AppointmentStatus } from '../types';
import { formatTime, formatDate, cn } from '../lib/utils';
import { MoreHorizontal, Plus, Calendar as CalendarIcon, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterDate, setFilterDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddModal, setShowAddModal] = React.useState(false);
  
  // New slot form state
  const [newSlot, setNewSlot] = React.useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00'
  });

  const loadAppointments = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await appointmentService.getAllAppointments();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(id, status);
      loadAppointments();
    } catch (err) {
      alert('Error actualizando estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro quieres eliminar este horario?')) return;
    try {
      await appointmentService.deleteAppointment(id);
      loadAppointments();
    } catch (err) {
      alert('Error eliminando');
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appointmentService.createSlot(newSlot);
      setShowAddModal(false);
      loadAppointments();
    } catch (err) {
      alert('Error creando horario');
    }
  };

  const stats = {
    total: appointments.filter(a => a.date === filterDate).length,
    booked: appointments.filter(a => a.date === filterDate && a.status === 'booked').length,
    available: appointments.filter(a => a.date === filterDate && a.status === 'available').length,
  };

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Header & Stats */}
      <div className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-border-gray shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Panel de Control</h2>
          <p className="text-sm text-slate-500">Gestión de turnos y disponibilidad.</p>
        </div>
        <div className="flex gap-2">
           <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <Plus size={14} /> Nuevo Horario
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl shadow-sm border border-border-gray overflow-hidden">
        <div className="px-6 py-4 border-b border-border-gray bg-slate-50">
          <h3 className="font-semibold text-sm">Consultas para {formatDate(filterDate)}</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando...</td>
                </tr>
              ) : appointments.filter(a => a.date === filterDate).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay turnos creados para este día.</td>
                </tr>
              ) : (
                appointments.filter(a => a.date === filterDate).map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      {apt.status === 'available' ? (
                        <span className="text-slate-300 italic text-sm">Libre</span>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-900">{apt.name}</div>
                          <div className="text-[10px] text-slate-400">{apt.email} • {apt.phone || 'Sin tel'}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{formatTime(apt.time)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-bold uppercase",
                        apt.status === 'available' && "bg-green-50 text-green-600",
                        apt.status === 'booked' && "bg-blue-50 text-blue-600",
                        apt.status === 'completed' && "bg-slate-100 text-slate-400",
                        apt.status === 'cancelled' && "bg-red-50 text-red-600",
                      )}>
                        {{ available: 'Disponible', booked: 'Reservado', completed: 'Completado', cancelled: 'Cancelado' }[apt.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {apt.status === 'booked' && (
                          <button onClick={() => handleStatusChange(apt.id, 'completed')} className="p-1.5 text-slate-400 hover:text-green-600" title="Completar"><CheckCircle size={16}/></button>
                        )}
                        <button onClick={() => handleDelete(apt.id)} className="p-1.5 text-slate-400 hover:text-red-600" title="Eliminar"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary & Quick Filter */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
        <div className="bg-primary p-6 rounded-2xl border border-white text-white shadow-lg shadow-green-900/10">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Resumen del día</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-bold">{stats.total}</p>
            <CalendarIcon className="opacity-20" size={48} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-2 rounded-lg">
              <p className="text-[9px] uppercase font-bold opacity-70">Reservados</p>
              <p className="text-lg font-bold">{stats.booked}</p>
            </div>
            <div className="bg-white/10 p-2 rounded-lg">
              <p className="text-[9px] uppercase font-bold opacity-70">Disponibles</p>
              <p className="text-lg font-bold">{stats.available}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border-gray">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Ayuda de Estados</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-600">Disponible: listo para reserva pública.</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-slate-600">Reservado: turno tomado por un paciente.</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <span className="text-slate-600">Completado: sesión finalizada.</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-slate-600">Cancelado: turno cancelado por el paciente.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Crear Nuevo Horario</h3>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Fecha</label>
                <input 
                  type="date"
                  required
                  value={newSlot.date}
                  onChange={e => setNewSlot(prev => ({...prev, date: e.target.value}))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Hora</label>
                <input 
                  type="time"
                  required
                  value={newSlot.time}
                  onChange={e => setNewSlot(prev => ({...prev, time: e.target.value}))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
