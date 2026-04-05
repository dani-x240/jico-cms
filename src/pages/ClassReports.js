import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FileText, Send, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { classMatches, parseAssignedClasses } from '../utils/classAssignments';
import { runAutoSubmissionPipeline } from '../utils/autoSubmission';
import { getAutoSubmissionDurations, loadSystemSettings } from '../utils/systemSettings';

const AUTO_MODE_PREFIX = '[AUTO]';
const IMMEDIATE_MODE_PREFIX = '[IMMEDIATE]';

const parseReportMode = (lessonNotes = '') => {
  const value = `${lessonNotes || ''}`;
  if (value.startsWith(`${AUTO_MODE_PREFIX}\n`) || value === AUTO_MODE_PREFIX) {
    return 'auto';
  }
  if (value.startsWith(`${IMMEDIATE_MODE_PREFIX}\n`) || value === IMMEDIATE_MODE_PREFIX) {
    return 'immediate';
  }
  return 'immediate';
};

const stripModePrefix = (lessonNotes = '') => {
  const value = `${lessonNotes || ''}`;
  if (value.startsWith(`${AUTO_MODE_PREFIX}\n`)) {
    return value.slice(`${AUTO_MODE_PREFIX}\n`.length);
  }
  if (value.startsWith(`${IMMEDIATE_MODE_PREFIX}\n`)) {
    return value.slice(`${IMMEDIATE_MODE_PREFIX}\n`.length);
  }
  if (value === AUTO_MODE_PREFIX || value === IMMEDIATE_MODE_PREFIX) {
    return '';
  }
  return value;
};

const toStartOfTodayMs = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const getReportCreatedAtMs = (report) => {
  const value = Date.parse(report?.created_at || '');
  return Number.isNaN(value) ? 0 : value;
};

const isOfflineError = (error) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed')
  );
};

export default function ClassReports({ user }) {
  const classTeacherClasses = parseAssignedClasses(user.class_teacher_assigned);
  const [activeClass, setActiveClass] = useState(classTeacherClasses[0] || '');
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeDutyHead, setActiveDutyHead] = useState(null);
  const [durations, setDurations] = useState({ teacherToClassDays: 1, classToDutyDays: 2, dutyToAdminDays: 3 });

  useEffect(() => {
    if (classTeacherClasses.length > 0) {
      if (!activeClass || !classTeacherClasses.includes(activeClass)) {
        setActiveClass(classTeacherClasses[0]);
      }
      fetchData();
    }
  }, [user.class_teacher_assigned, activeClass]);

  useEffect(() => {
    fetchActiveDutyHead();
    loadDurations();
  }, []);

  const loadDurations = async () => {
    try {
      const settingsState = await loadSystemSettings();
      setDurations(getAutoSubmissionDurations(settingsState));
    } catch (error) {
      // Keep defaults if settings are unavailable.
    }
  };

  const isVisibleToClassTeacher = (report) => {
    const mode = parseReportMode(report?.lesson_notes || '');
    if (mode !== 'auto') {
      return true;
    }

    const createdAtMs = getReportCreatedAtMs(report);
    if (!createdAtMs) {
      return true;
    }

    const unlockMs = createdAtMs + (Math.max(Number(durations.teacherToClassDays) || 0, 0) * 24 * 60 * 60 * 1000);
    return unlockMs <= toStartOfTodayMs();
  };

  const fetchActiveDutyHead = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('duty_assignments')
      .select('teacher_id, teachers(name)')
      .eq('status', 'active')
      .eq('is_duty_head', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveDutyHead({
        id: String(data.teacher_id),
        name: data.teachers?.name || 'Duty Head'
      });
    } else {
      setActiveDutyHead(null);
    }
  };

  const fetchData = async () => {
    try {
      const [reportsRes, studentsRes, attendanceRes] = await Promise.all([
        supabase.schema('public').from('lesson_reports').select('*').order('report_date', { ascending: false }),
        supabase.from('students').select('*'),
        supabase.from('attendance').select('*')
      ]);

      const firstError = reportsRes.error || studentsRes.error || attendanceRes.error;
      if (firstError && isOfflineError(firstError)) {
        setMessage('You are offline. Check your internet connection and try again.');
      }

      const normalizedReports = (reportsRes.data || [])
        .filter((report) => classMatches(report.class_name || '', activeClass))
        .filter(isVisibleToClassTeacher);
      setReports(normalizedReports);
      setStudents((studentsRes.data || []).filter((student) => classMatches(student.class_name || student.class || '', activeClass)));
      setAttendanceRecords((attendanceRes.data || []).filter((record) => classMatches(record.class_name || '', activeClass)));
    } catch (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      }
    }

    setLoading(false);
  };

  const calculateAttendance = (studentId) => {
    const records = attendanceRecords.filter((record) => record.student_id === studentId);

    if (!records.length) {
      return 100;
    }

    const attendedLessons = records.filter((record) => record.status === 'present' || record.status === 'late').length;
    return Math.round((attendedLessons / records.length) * 100);
  };

  const getRedStudents = () => {
    return students.filter(s => calculateAttendance(s.id) < 70);
  };

  const submitToDutyHead = async () => {
    if (!classTeacherClasses.includes(activeClass)) {
      setMessage('Only the class teacher can forward this stream report to Duty Head.');
      return;
    }

    if (!summary.trim()) {
      setMessage('Please add a class summary before submitting');
      return;
    }

    setSubmitting(true);
    const payload = {
      teacher_id: String(user.id),
      teacher_name: user.name,
      class_name: activeClass,
      summary: summary,
      total_reports: reports.length,
      red_students: getRedStudents().length,
      report_date: new Date().toISOString().split('T')[0],
      status: 'submitted'
    };

    if (activeDutyHead?.id) {
      payload.duty_head_id = activeDutyHead.id;
      payload.duty_head_name = activeDutyHead.name;
    }

    let { error } = await supabase.schema('public').from('stream_reports').insert(payload);
    if (error) {
      const text = `${error.message || ''}`.toLowerCase();
      if (text.includes('column') && (text.includes('duty_head_id') || text.includes('duty_head_name'))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.duty_head_id;
        delete fallbackPayload.duty_head_name;
        const fallback = await supabase.schema('public').from('stream_reports').insert(fallbackPayload);
        error = fallback.error;
      }
    }

    setSubmitting(false);
    if (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      } else {
        setMessage('We could not submit this report right now. Please try again.');
      }
    } else {
      let autoMessage = '';
      try {
        const autoResult = await runAutoSubmissionPipeline();
        autoMessage = autoResult?.skipped
          ? ' Automatic forwarding is scheduled and will continue at the right time.'
          : ' Automatic forwarding check completed.';
      } catch (pipelineError) {
        autoMessage = ' Report was submitted and automatic forwarding will continue in the background.';
      }

      setMessage(`Report submitted to Duty Head successfully.${autoMessage}`);
      setSummary('');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const groupBySubject = () => {
    const grouped = {};
    reports.forEach(r => {
      if (!grouped[r.subject]) grouped[r.subject] = [];
      grouped[r.subject].push(r);
    });
    return grouped;
  };

  const getParticipationColor = (rating) => {
    switch(rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#3b82f6';
      case 'Fair': return '#f59e0b';
      case 'Poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const exportClassReportsToExcel = () => {
    if (!reports.length) {
      setMessage('No lesson reports available to export.');
      return;
    }

    const escapeCell = (value) => `"${`${value ?? ''}`.replace(/"/g, '""')}"`;
    const rows = [
      ['Report Date', 'Class', 'Student', 'Subject', 'Mode', 'Participation', 'Notes'],
      ...reports.map((report) => [
        report.report_date ? new Date(report.report_date).toLocaleDateString() : '',
        report.class_name || '',
        report.student_name || '',
        report.subject || '',
        parseReportMode(report.lesson_notes) === 'auto' ? 'Auto/System' : 'Immediate',
        report.participation || '',
        stripModePrefix(report.lesson_notes || '')
      ])
    ];

    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class_reports_${(activeClass || 'class').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (classTeacherClasses.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>Only class teachers can view and forward class reports.</div>;
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

  const subjectGroups = groupBySubject();
  const redStudents = getRedStudents();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Class Reports - {activeClass}</h1>
        </div>
        <button className="btn-secondary" onClick={exportClassReportsToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} />
          Export to Excel
        </button>
      </div>

      {classTeacherClasses.length > 1 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <label className="form-label">Class/Stream</label>
          <select className="form-input" value={activeClass} onChange={(e) => setActiveClass(e.target.value)} style={{ maxWidth: '260px' }}>
            {classTeacherClasses.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
      )}

      {message && (
        <div style={{ padding: '12px', background: message.toLowerCase().includes('success') ? '#d4edda' : '#f8d7da', color: message.toLowerCase().includes('success') ? '#155724' : '#721c24', borderRadius: '8px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <FileText size={24} style={{ color: '#1e40af' }} />
          </div>
          <div>
            <div className="stat-value">{reports.length}</div>
            <div className="stat-label">Total Reports</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <CheckCircle size={24} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <AlertCircle size={24} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div className="stat-value">{redStudents.length}</div>
            <div className="stat-label">Red Students</div>
          </div>
        </div>
      </div>

      {redStudents.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>Students Needing Attention</h3>
          {redStudents.map(s => (
            <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #fecaca' }}>
              <div style={{ fontWeight: '500' }}>{s.name || s.full_name}</div>
              <div style={{ fontSize: '13px', color: '#991b1b' }}>Parent: {s.parent_phone}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Lesson Reports by Subject</h3>
        {Object.keys(subjectGroups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-gray)' }}>No lesson reports received yet</div>
        ) : (
          Object.entries(subjectGroups).map(([subject, subjectReports]) => (
            <div key={subject} style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>{subject} ({subjectReports.length} reports)</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {subjectReports.slice(0, 3).map(r => (
                  <div key={r.id} style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>{r.student_name}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: parseReportMode(r.lesson_notes) === 'auto' ? '#fff7ed' : '#ecfdf5', color: parseReportMode(r.lesson_notes) === 'auto' ? '#9a3412' : '#166534' }}>
                          {parseReportMode(r.lesson_notes) === 'auto' ? 'Auto Mode' : 'Immediate'}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: getParticipationColor(r.participation) + '20', color: getParticipationColor(r.participation) }}>
                          {r.participation}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>{stripModePrefix(r.lesson_notes).substring(0, 100)}...</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Weekly Summary & Submit to Duty Head</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
          Duty team members submit here to Duty Head. Only Duty Head submits consolidated reports to Admin.
        </p>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
          Class teacher responsibility: review all subject-teacher reports for this stream and contact parents of red students before forwarding.
        </p>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
          {activeDutyHead ? `Current Duty Head: ${activeDutyHead.name}` : 'No active Duty Head found right now.'}
        </p>
        <textarea className="form-input" rows="6" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Add your class summary, observations, and recommendations for this week..." />
        <button onClick={submitToDutyHead} disabled={submitting} className="btn-primary" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Send size={18} />
          {submitting ? 'Saving...' : 'Save & Submit to Duty Head'}
        </button>
      </div>
    </div>
  );
}
