import { supabase } from '../lib/supabase';
import { Appointment, AppointmentStatus } from '../types';

export const emailService = {
  async sendConfirmation(params: { to: string; name: string; date: string; time: string; appointmentId: string }) {
    try {
      await supabase.functions.invoke('send-confirmation', { body: params });
    } catch {
      console.warn('No se pudo enviar el email de confirmación');
    }
  },
};

export const appointmentService = {
  async getAvailableSlots(date: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', date)
      .eq('status', 'available')
      .order('time', { ascending: true });
    
    if (error) throw error;
    return data as Appointment[];
  },

  async getAllAppointments(startDate?: string, endDate?: string) {
    let query = supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    
    const { data, error } = await query;
    if (error) throw error;
    return data as Appointment[];
  },

  async bookAppointment(id: string, patientData: { name: string; email: string; phone?: string; notes?: string }) {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...patientData,
        status: 'booked'
      })
      .eq('id', id)
      .eq('status', 'available')
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('El turno ya no está disponible');
    return data[0] as Appointment;
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Appointment;
  },

  async deleteAppointment(id: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async createSlot(appointment: Partial<Appointment>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appointment, status: 'available' }])
      .select();
    
    if (error) throw error;
    return data[0] as Appointment;
  }
};
