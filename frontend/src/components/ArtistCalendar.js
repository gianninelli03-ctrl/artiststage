import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CaretLeft, CaretRight, Check, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

const TIME_SLOTS = [
  { id: 'morning', label: 'Mattina', time: '8:00 - 13:00' },
  { id: 'afternoon', label: 'Pomeriggio', time: '13:00 - 18:00' },
  { id: 'evening', label: 'Sera', time: '18:00 - 24:00' },
  { id: 'full_day', label: 'Tutto il giorno', time: '' }
];

function getDayStatus(availability, bookings) {
  if (!availability) return 'free';
  if (availability.full_day) return 'full';
  const slots = [availability.morning, availability.afternoon, availability.evening];
  const occupied = slots.filter(Boolean).length;
  if (occupied === 0) return 'free';
  if (occupied === 3) return 'full';
  return 'partial';
}

function getDayColor(status, isOwner) {
  if (status === 'full') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (status === 'partial') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (isOwner) return 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#FF007A] cursor-pointer';
  return 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50 hover:border-[#00F0FF] cursor-pointer';
}

export default function ArtistCalendar({ artistId, artistUserId, currentUser, isOwner }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [availability, setAvailability] = useState({});
  const [bookings, setBookings] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'book'
  const [bookingMessage, setBookingMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  useEffect(() => {
    loadData();
  }, [artistId, viewDate]);

  const loadData = async () => {
    const startDate = new Date(viewDate.year, viewDate.month, 1).toISOString().split('T')[0];
    const endDate = new Date(viewDate.year, viewDate.month + 1, 0).toISOString().split('T')[0];

    const [{ data: avail }, { data: books }] = await Promise.all([
      supabase.from('artist_availability').select('*')
        .eq('artist_id', artistId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase.from('booking_requests').select('*')
        .eq('artist_id', artistId)
        .gte('date', startDate)
        .lte('date', endDate)
    ]);

    const availMap = {};
    for (const a of avail || []) availMap[a.date] = a;
    setAvailability(availMap);
    setBookings(books || []);

    if (isOwner) {
      const { data: pending } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('artist_id', artistId)
        .eq('status', 'pending');

      if (pending && pending.length > 0) {
        const visitorIds = [...new Set(pending.map(r => r.visitor_id))];
        const { data: visitors } = await supabase
          .from('visitor_profiles')
          .select('user_id, name, profile_image_url, activity_type, contact_email, phone')
          .in('user_id', visitorIds);

        const visitorMap = {};
        for (const v of visitors || []) visitorMap[v.user_id] = v;

        setPendingRequests(pending.map(r => ({
          ...r,
          visitor: visitorMap[r.visitor_id] || null
        })));
      } else {
        setPendingRequests([]);
      }
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay();
    const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    return { daysInMonth, offset };
  };

  const handleDayClick = (day) => {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(viewDate.year, viewDate.month, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;

    setSelectedDay(dateStr);
    setModalMode(isOwner ? 'edit' : 'book');
    setShowModal(true);
  };

  const handleSaveAvailability = async (slots) => {
    setSaving(true);
    try {
      const data = {
        artist_id: artistId,
        date: selectedDay,
        morning: slots.includes('morning'),
        afternoon: slots.includes('afternoon'),
        evening: slots.includes('evening'),
        full_day: slots.includes('full_day')
      };

      await supabase.from('artist_availability')
        .upsert(data, { onConflict: 'artist_id,date' });

      await loadData();
      setShowModal(false);
      toast.success('Disponibilità aggiornata');
    } catch (e) {
      toast.error('Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingRequest = async (timeSlot) => {
    if (!currentUser) { toast.error('Accedi per prenotare'); return; }
    setSaving(true);
    try {
      const slotLabel = TIME_SLOTS.find(t => t.id === timeSlot)?.label || timeSlot;
      const dateFormatted = new Date(selectedDay + 'T12:00:00').toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      await supabase.from('booking_requests').insert({
        artist_id: artistId,
        visitor_id: currentUser.id,
        date: selectedDay,
        time_slot: timeSlot,
        message: bookingMessage,
        status: 'pending'
      }).select().single();

      // Invia messaggio automatico all'artista
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: artistUserId,
        content: `📅 Nuova richiesta di prenotazione!\n\nData: ${dateFormatted}\nFascia: ${slotLabel}${bookingMessage ? '\nMessaggio: ' + bookingMessage : ''}\n\n👉 Vai alla Dashboard → Calendario per confermare o rifiutare.`
      });

      // Notifica all'artista
      const visitorName = currentUser.name || currentUser.email || 'Un visitatore';
      await supabase.from('notifications').insert({
        user_id: artistUserId,
        type: 'booking',
        title: 'Nuova richiesta di disponibilità',
        message: `${visitorName} · ${dateFormatted} · ${slotLabel}`,
        read: false,
        link: '/dashboard#calendar'
      });

      toast.success('Richiesta inviata! L\'artista ti risponderà presto.');
      setShowModal(false);
      setBookingMessage('');
      await loadData();
    } catch (e) {
      toast.error('Errore invio richiesta');
    } finally {
      setSaving(false);
    }
  };

  const handleBookingResponse = async (bookingId, status) => {
    try {
      // FIX 1: recupera req PRIMA di usarlo
      const req = pendingRequests.find(r => r.id === bookingId);

      await supabase.from('booking_requests').update({ status }).eq('id', bookingId);

      // FIX 2: blocco availability spostato DOPO la definizione di req
      if (status === 'confirmed' && req) {
        const newMorning   = req.time_slot === 'morning'   || req.time_slot === 'full_day';
        const newAfternoon = req.time_slot === 'afternoon' || req.time_slot === 'full_day';
        const newEvening   = req.time_slot === 'evening'   || req.time_slot === 'full_day';

        const { data: existing } = await supabase
          .from('artist_availability')
          .select('*')
          .eq('artist_id', artistId)
          .eq('date', req.date)
          .maybeSingle();

        if (existing) {
          const mergedMorning   = existing.morning   || newMorning;
          const mergedAfternoon = existing.afternoon || newAfternoon;
          const mergedEvening   = existing.evening   || newEvening;
          // FIX 3: full_day calcolato correttamente sul merged, non su availData
          const mergedFullDay   = mergedMorning && mergedAfternoon && mergedEvening;

          await supabase.from('artist_availability').update({
            morning:   mergedMorning,
            afternoon: mergedAfternoon,
            evening:   mergedEvening,
            full_day:  mergedFullDay
          }).eq('id', existing.id);
        } else {
          const isFullDay = newMorning && newAfternoon && newEvening;
          await supabase.from('artist_availability').insert({
            artist_id: artistId,
            date:      req.date,
            morning:   newMorning,
            afternoon: newAfternoon,
            evening:   newEvening,
            full_day:  isFullDay || req.time_slot === 'full_day'
          });
        }
      }

      // Messaggio automatico al visitatore
      if (req) {
        const slotLabel = TIME_SLOTS.find(t => t.id === req.time_slot)?.label || req.time_slot;
        const dateFormatted = new Date(req.date + 'T12:00:00').toLocaleDateString('it-IT', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const emoji = status === 'confirmed' ? '✅' : '❌';
        const statusText = status === 'confirmed' ? 'confermata' : 'rifiutata';

        await supabase.from('messages').insert({
          sender_id:   artistUserId,
          receiver_id: req.visitor_id,
          content: `${emoji} La tua richiesta di prenotazione è stata ${statusText}!\n\nData: ${dateFormatted}\nFascia: ${slotLabel}`
        });
      }

      toast.success(status === 'confirmed' ? 'Prenotazione confermata!' : 'Prenotazione rifiutata');
      await loadData();
    } catch (e) {
      console.error('handleBookingResponse error:', e);
      toast.error('Errore nella risposta alla prenotazione');
    }
  };

  const canGoBack = () => {
    return viewDate.year > today.getFullYear() || viewDate.month > today.getMonth();
  };

  const canGoForward = () => {
    const maxYear = today.getFullYear() + 1;
    const maxMonth = today.getMonth();
    return viewDate.year < maxYear || (viewDate.year === maxYear && viewDate.month < maxMonth);
  };

  const goBack = () => {
    if (!canGoBack()) return;
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goForward = () => {
    if (!canGoForward()) return;
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const { daysInMonth, offset } = getDaysInMonth();

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">
          {isOwner ? 'La tua Disponibilità' : 'Disponibilità'}
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={goBack} disabled={!canGoBack()}
            className={`p-1.5 rounded-lg transition-colors ${canGoBack() ? 'hover:bg-zinc-700 text-white' : 'text-zinc-600 cursor-not-allowed'}`}>
            <CaretLeft size={18} />
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">
            {MONTHS[viewDate.month]} {viewDate.year}
          </span>
          <button onClick={goForward} disabled={!canGoForward()}
            className={`p-1.5 rounded-lg transition-colors ${canGoForward() ? 'hover:bg-zinc-700 text-white' : 'text-zinc-600 cursor-not-allowed'}`}>
            <CaretRight size={18} />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-3 h-3 rounded-full bg-zinc-700 inline-block" />Libero
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-3 h-3 rounded-full bg-yellow-500/50 inline-block" />Parz. occupato
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-3 h-3 rounded-full bg-red-500/50 inline-block" />Occupato
        </span>
      </div>

      {/* Griglia giorni settimana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-zinc-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const avail = availability[dateStr];
          const status = getDayStatus(avail);
          const isPast = new Date(viewDate.year, viewDate.month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isToday = day === today.getDate() && viewDate.month === today.getMonth() && viewDate.year === today.getFullYear();
          const dayBookings = bookings.filter(b => b.date === dateStr);
          const hasPending = dayBookings.some(b => b.status === 'pending');
          const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');

          return (
            <button key={day} onClick={() => !isPast && handleDayClick(day)}
              className={`relative aspect-square rounded-lg border text-sm font-medium transition-all flex items-center justify-center
                ${isPast ? 'opacity-30 cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-500' : getDayColor(status, isOwner)}
                ${isToday ? 'ring-2 ring-[#FF007A]' : ''}
              `}>
              {day}
              {hasPending && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
              {hasConfirmed && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          );
        })}
      </div>

      {/* Richieste in attesa (solo artista) */}
      {isOwner && pendingRequests.length > 0 && (
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-bold text-white mb-3">
            Richieste in attesa ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-start justify-between p-3 rounded-lg bg-zinc-800/50 gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Avatar visitatore */}
                  {req.visitor?.profile_image_url ? (
                    <img
                      src={req.visitor.profile_image_url}
                      alt={req.visitor.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-zinc-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-[#00F0FF]/30 to-[#FF007A]/30 flex items-center justify-center text-sm font-bold text-white border border-zinc-700">
                      {req.visitor?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    {/* Nome e tipo */}
                    <p className="text-sm font-medium text-white truncate">
                      {req.visitor?.name || 'Visitatore sconosciuto'}
                    </p>
                    {req.visitor?.activity_type && (
                      <p className="text-xs text-[#00F0FF] truncate">{req.visitor.activity_type}</p>
                    )}
                    {/* Data e fascia */}
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(req.date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {TIME_SLOTS.find(t => t.id === req.time_slot)?.label}
                    </p>
                    {/* Contatto */}
                    {req.visitor?.contact_email && (
                      <p className="text-xs text-zinc-500 truncate">{req.visitor.contact_email}</p>
                    )}
                    {/* Messaggio */}
                    {req.message && (
                      <p className="text-xs text-zinc-300 mt-1 italic">"{req.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleBookingResponse(req.id, 'confirmed')}
                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleBookingResponse(req.id, 'rejected')}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">
                {selectedDay && new Date(selectedDay + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {modalMode === 'edit' ? (
              <EditAvailabilityModal
                dateStr={selectedDay}
                currentAvail={availability[selectedDay]}
                onSave={handleSaveAvailability}
                onClose={() => setShowModal(false)}
                saving={saving}
              />
            ) : (
              <BookingModal
                dateStr={selectedDay}
                availability={availability[selectedDay]}
                message={bookingMessage}
                onMessageChange={setBookingMessage}
                onBook={handleBookingRequest}
                onClose={() => setShowModal(false)}
                saving={saving}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditAvailabilityModal({ dateStr, currentAvail, onSave, onClose, saving }) {
  const [selected, setSelected] = useState(() => {
    if (!currentAvail) return [];
    const s = [];
    if (currentAvail.full_day) return ['full_day'];
    if (currentAvail.morning) s.push('morning');
    if (currentAvail.afternoon) s.push('afternoon');
    if (currentAvail.evening) s.push('evening');
    return s;
  });

  const toggle = (slot) => {
    if (slot === 'full_day') {
      setSelected(prev => prev.includes('full_day') ? [] : ['full_day']);
      return;
    }
    setSelected(prev => {
      const without = prev.filter(s => s !== 'full_day');
      return without.includes(slot) ? without.filter(s => s !== slot) : [...without, slot];
    });
  };

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-4">Seleziona le fasce orarie in cui sei <span className="text-red-400">occupato</span>:</p>
      <div className="space-y-2 mb-6">
        {TIME_SLOTS.map(slot => (
          <button key={slot.id} onClick={() => toggle(slot.id)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
              selected.includes(slot.id)
                ? 'border-red-500 bg-red-500/10 text-red-400'
                : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
            }`}>
            <span className="font-medium">{slot.label}</span>
            {slot.time && <span className="text-xs opacity-60">{slot.time}</span>}
            {selected.includes(slot.id) && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1">Annulla</button>
        <button onClick={() => onSave(selected)} disabled={saving} className="btn-primary flex-1">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Salva'}
        </button>
      </div>
    </div>
  );
}

function BookingModal({ dateStr, availability, message, onMessageChange, onBook, onClose, saving, currentUser }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const availableSlots = TIME_SLOTS.filter(slot => {
    if (!availability) return true;
    if (availability.full_day) return false;
    if (slot.id === 'full_day') return !availability.morning && !availability.afternoon && !availability.evening;
    return !availability[slot.id];
  });

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400 mb-4">Questo giorno è completamente occupato.</p>
        <button onClick={onClose} className="btn-outline w-full">Chiudi</button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-4">Seleziona la fascia oraria che ti interessa:</p>
      <div className="space-y-2 mb-4">
        {availableSlots.map(slot => (
          <button key={slot.id} onClick={() => setSelectedSlot(slot.id)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
              selectedSlot === slot.id
                ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF]'
                : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
            }`}>
            <span className="font-medium">{slot.label}</span>
            {slot.time && <span className="text-xs opacity-60">{slot.time}</span>}
          </button>
        ))}
      </div>
      <textarea value={message} onChange={e => onMessageChange(e.target.value)}
        className="input-dark w-full h-20 resize-none mb-4 text-sm"
        placeholder="Messaggio per l'artista (opzionale)..." />
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1">Annulla</button>
        <button onClick={() => selectedSlot && onBook(selectedSlot)}
          disabled={!selectedSlot || saving || !currentUser}
          className="btn-primary flex-1">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Richiedi'}
        </button>
      </div>
      {!currentUser && <p className="text-xs text-zinc-500 text-center mt-2">Accedi per inviare una richiesta</p>}
    </div>
  );
}