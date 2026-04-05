import React, { useState, useEffect } from 'react';
import { Plus, X, Check, Star, Calendar, Users, Clock } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function DutyManagement() {
  const [duties, setDuties] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [dutyHead, setDutyHead] = useState('');
  const [duration, setDuration] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExtend, setShowExtend] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');

  useEffect(() => {
    loadDuties();
    loadTeachers();
    setStartDate(new Date().toISOString().split('T')[0]);
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    setEndDate(weekLater.toISOString().split('T')[0]);
  }, []);

  const loadDuties = async () => {
    const { data } = await supabase
      .from('duty_assignments')
      .select('*, teachers(name)')
      .order('created_at', { ascending: false });
    setDuties(data || []);
    setLoading(false);
  };

  const loadTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('approved', true)
      .eq('role', 'teacher');
    setTeachers(data || []);
  };

  const toggleTeacher = (teacherId) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId));
      if (dutyHead === teacherId) setDutyHead('');
    } else {
      if (selectedTeachers.length < 5) {
        setSelectedTeachers([...selectedTeachers, teacherId]);
      } else {
        alert('⚠️ Maximum 5 teachers allowed');
      }
    }
  };

  const handleDurationChange = (dur) => {
    setDuration(dur);
    const start = new Date(startDate);
    let end = new Date(start);
    
    if (dur === 'week') end.setDate(end.getDate() + 7);
    else if (dur === 'fortnight') end.setDate(end.getDate() + 14);
    else if (dur === 'month') end.setDate(end.getDate() + 30);
    
    if (dur !== 'custom') {
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedTeachers.length === 0) {
      alert('⚠️ Please select at least one teacher');
      return;
    }
    
    if (!dutyHead) {
      alert('⚠️ Please select a Duty Head');
      return;
    }

    setLoading(true);

    try {
      const dutyData = selectedTeachers.map(teacherId => ({
        teacher_id: teacherId,
        is_duty_head: teacherId === dutyHead,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      }));

      await supabase.from('duty_assignments').insert(dutyData);
      
      alert('✅ Duty team assigned successfully!');
      setShowModal(false);
      setSelectedTeachers([]);
      setDutyHead('');
      loadDuties();
    } catch (error) {
      alert('Error assigning duty: ' + error.message);
    }
    setLoading(false);
  };

  const endDutyEarly = async (teacherId, startDate) => {
    if (window.confirm('Are you sure you want to end this duty early?')) {
      await supabase
        .from('duty_assignments')
        .update({ status: 'expired', end_date: new Date().toISOString().split('T')[0] })
        .eq('teacher_id', teacherId)
        .eq('start_date', startDate);
      loadDuties();
    }
  };

  const extendDuty = async (startDate, oldEndDate) => {
    if (!newEndDate || new Date(newEndDate) <= new Date(oldEndDate)) {
      alert('New end date must be after current end date');
      return;
    }
    await supabase
      .from('duty_assignments')
      .update({ end_date: newEndDate })
      .eq('start_date', startDate)
      .eq('status', 'active');
    setShowExtend(null);
    setNewEndDate('');
    loadDuties();
    alert('✅ Duty period extended!');
  };

  const activeDuties = duties.filter(d => d.status === 'active');
  const expiredDuties = duties.filter(d => d.status === 'expired');

  const groupedActive = activeDuties.reduce((acc, duty) => {
    const key = `${duty.start_date}-${duty.end_date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(duty);
    return acc;
  }, {});

  const groupedExpired = expiredDuties.reduce((acc, duty) => {
    const key = `${duty.start_date}-${duty.end_date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(duty);
    return acc;
  }, {});

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Duty Management</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Assign New Duty Team
        </button>
      </div>

      {Object.keys(groupedActive).length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Current Duty Team (Active)</h3>
          {Object.entries(groupedActive).map(([key, team]) => (
            <div key={key} className="card">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  Period: {new Date(team[0].start_date).toLocaleDateString()} - {new Date(team[0].end_date).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-gray)' }}>
                  Days Remaining: {getDaysRemaining(team[0].end_date)}
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Team Members</h4>
                {team.map(duty => (
                  <div key={duty.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {duty.is_duty_head && <Star size={16} style={{ color: 'var(--orange)' }} />}
                      <span style={{ fontWeight: duty.is_duty_head ? '600' : '400' }}>
                        {duty.teachers.name} {duty.is_duty_head && '(DUTY HEAD)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { setShowExtend(team[0].start_date); setNewEndDate(team[0].end_date); }}>
                  <Clock size={16} /> Extend Duty
                </button>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }} onClick={() => endDutyEarly(team[0].teacher_id, team[0].start_date)}>
                  End Duty Early
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(groupedExpired).length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Previous Duty Teams</h3>
          {Object.entries(groupedExpired).slice(0, 5).map(([key, team]) => (
            <div key={key} className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                {new Date(team[0].start_date).toLocaleDateString()} - {new Date(team[0].end_date).toLocaleDateString()} (EXPIRED)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                Head: {team.find(d => d.is_duty_head)?.teachers.name} • {team.length} members
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Assign New Duty Team</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">STEP 1: Select Teachers (up to 5)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  {teachers.map(teacher => (
                    <label key={teacher.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px', background: selectedTeachers.includes(teacher.id) ? '#f0f9ff' : 'transparent' }}>
                      <input type="checkbox" checked={selectedTeachers.includes(teacher.id)} onChange={() => toggleTeacher(teacher.id)} />
                      <div>
                        <div style={{ fontWeight: '600' }}>{teacher.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                          {teacher.class_teacher_assigned ? `Class Teacher: ${teacher.class_teacher_assigned}` : 'Subject Teacher'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-gray)', marginTop: '8px' }}>
                  Selected: {selectedTeachers.length} of 5
                </div>
              </div>

              {selectedTeachers.length > 0 && (
                <div className="form-group">
                  <label className="form-label">STEP 2: Choose Duty Head *</label>
                  {selectedTeachers.map(teacherId => {
                    const teacher = teachers.find(t => t.id === teacherId);
                    return (
                      <label key={teacherId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer' }}>
                        <input type="radio" name="dutyHead" value={teacherId} checked={dutyHead === teacherId} onChange={(e) => setDutyHead(e.target.value)} required />
                        {teacher?.name}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">STEP 3: Set Duty Duration</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="duration" value="week" checked={duration === 'week'} onChange={(e) => handleDurationChange(e.target.value)} />
                    One Week (default)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="duration" value="fortnight" checked={duration === 'fortnight'} onChange={(e) => handleDurationChange(e.target.value)} />
                    Two Weeks
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="duration" value="month" checked={duration === 'month'} onChange={(e) => handleDurationChange(e.target.value)} />
                    One Month
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="duration" value="custom" checked={duration === 'custom'} onChange={(e) => handleDurationChange(e.target.value)} />
                    Custom Dates
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required disabled={duration !== 'custom'} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                <Check size={18} />
                {loading ? 'Assigning...' : 'Assign Duty Team'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showExtend && (
        <div className="modal-overlay" onClick={() => setShowExtend(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Extend Duty Period</h3>
              <button onClick={() => setShowExtend(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Current End Date</label>
              <input type="date" className="form-input" value={newEndDate} disabled style={{ background: '#f3f4f6' }} />
            </div>
            <div className="form-group">
              <label className="form-label">New End Date</label>
              <input type="date" className="form-input" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} min={newEndDate} />
            </div>
            <button className="btn-primary" onClick={() => extendDuty(showExtend, newEndDate)} style={{ width: '100%' }}>
              <Check size={18} /> Extend Duty Period
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
