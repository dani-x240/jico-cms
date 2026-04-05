import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FileText, Send } from 'lucide-react';
import { matchesAnyAssignedClass, parseAssignedClasses } from '../utils/classAssignments';
import { runAutoSubmissionPipeline } from '../utils/autoSubmission';
import { getAutoSubmissionDurations, loadSystemSettings } from '../utils/systemSettings';

const AUTO_MODE_PREFIX = '[AUTO]';
const IMMEDIATE_MODE_PREFIX = '[IMMEDIATE]';

const isErrorMessage = (value = '') => {
  const text = `${value || ''}`.toLowerCase();
  return text.includes('error') || text.includes('failed') || text.includes('offline') || text.includes('please');
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

export default function SubmitReport({ user, refreshSignal }) {
  const assignedClasses = parseAssignedClasses(user.class_assigned);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState(assignedClasses[0] || '');
  const [formData, setFormData] = useState({
    student_id: '',
    subject: '',
    lesson_notes: '',
    participation: 'Good'
  });
  const [submissionMode, setSubmissionMode] = useState('immediate');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lessonReportsReady, setLessonReportsReady] = useState(true);

  useEffect(() => {
    initializePage();
  }, [user.class_assigned]);

  // Re-run availability check when parent requests a refresh (e.g., ReportsHub debug toggle)
  useEffect(() => {
    if (typeof refreshSignal !== 'undefined') {
      detectLessonReportsAvailability();
    }
  }, [refreshSignal]);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassName]);

  const initializePage = async () => {
    await detectLessonReportsAvailability();
    await fetchClassesAndStreams();
  };

  const detectLessonReportsAvailability = async () => {
    const primary = await supabase.schema('public').from('lesson_reports').select('id').limit(1);
    if (!primary.error) {
      setLessonReportsReady(true);
      setMessage((previous) => previous.includes('lesson_reports is missing') ? '' : previous);
      return;
    }

    const fallback = await supabase.from('lesson_reports').select('id').limit(1);
    if (!fallback.error) {
      setLessonReportsReady(true);
      setMessage((previous) => previous.includes('lesson_reports is missing') ? '' : previous);
      return;
    }

    const checkError = `${primary.error?.message || ''} ${fallback.error?.message || ''}`.toLowerCase();
    const missingRelation = checkError.includes('relation') && checkError.includes('lesson_reports');
    setLessonReportsReady(!missingRelation);
  };

  const canReadLessonReports = async () => {
    const probe = await supabase.schema('public').from('lesson_reports').select('id').limit(1);
    return !probe.error;
  };

  const resolveTeacherId = async () => {
    const fromUser = String(user?.id ?? user?.teacher_id ?? user?.teacherId ?? '').trim();
    if (fromUser) {
      return fromUser;
    }

    // Prefer stable staff_id matching when user.id is UUID/string from other auth flows.
    if (user?.staff_id) {
      const byStaffId = await supabase.from('teachers').select('id').eq('staff_id', user.staff_id).limit(1);
      const staffIdMatch = String(byStaffId?.data?.[0]?.id ?? '').trim();
      if (staffIdMatch) {
        return staffIdMatch;
      }
    }

    if (user?.name) {
      const lookup = await supabase.from('teachers').select('id').eq('name', user.name).limit(1);
      const fallbackId = String(lookup?.data?.[0]?.id ?? '').trim();
      if (fallbackId) {
        return fallbackId;
      }
    }

    return null;
  };

  const resolveClassTeacherForClass = async (className) => {
    if (!className) return null;

    const byExact = await supabase
      .from('teachers')
      .select('id, name, class_teacher_assigned')
      .eq('class_teacher_assigned', className)
      .limit(1)
      .maybeSingle();

    if (byExact.data?.id) {
      return {
        id: String(byExact.data.id),
        name: byExact.data.name || 'Class Teacher'
      };
    }

    const allClassTeachers = await supabase
      .from('teachers')
      .select('id, name, class_teacher_assigned')
      .not('class_teacher_assigned', 'is', null);

    const normalizedTarget = `${className || ''}`.trim().toLowerCase();
    const match = (allClassTeachers.data || []).find((row) =>
      `${row.class_teacher_assigned || ''}`.trim().toLowerCase() === normalizedTarget
    );

    if (!match) return null;
    return {
      id: String(match.id),
      name: match.name || 'Class Teacher'
    };
  };

  const fetchClassesAndStreams = async () => {
    const [classesResponse, streamsResponse] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('streams').select('*')
    ]);

    setClasses(classesResponse.data || []);
    setStreams(streamsResponse.data || []);

    if (assignedClasses.length === 1) {
      setSelectedClassName(assignedClasses[0]);
    } else if (assignedClasses.length > 1 && (!selectedClassName || !assignedClasses.includes(selectedClassName))) {
      setSelectedClassName(assignedClasses[0]);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');

    const normalizedStudents = (data || []).map((student) => ({
      ...student,
      displayName: student.full_name || student.name || '',
      displayClass: student.class_name || student.class || '',
      parentPhone: student.parent_phone || ''
    }));

    const filteredStudents = selectedClassName
      ? normalizedStudents.filter((student) => matchesAnyAssignedClass(student.displayClass, [selectedClassName]))
      : normalizedStudents;

    filteredStudents.sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (!filteredStudents.find((student) => String(student.id) === String(formData.student_id))) {
      setFormData((previous) => ({ ...previous, student_id: '' }));
    }

    setStudents(filteredStudents);
  };

  const classOptions = classes.flatMap((classItem) => {
    if (classItem.has_streams) {
      return streams
        .filter((stream) => stream.class_id === classItem.id)
        .map((stream) => `${classItem.name} ${stream.name}`.trim());
    }

    return [classItem.name];
  });

  const visibleClassOptions = user.role === 'admin'
    ? classOptions
    : classOptions.filter((className) => assignedClasses.includes(className));

  const selectedStudent = students.find((student) => String(student.id) === String(formData.student_id));

  const handleClassChange = (nextClassName) => {
    setSelectedClassName(nextClassName);
    setFormData((previous) => ({ ...previous, student_id: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!selectedClassName || !formData.student_id || !formData.subject || !formData.lesson_notes) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const student = students.find((s) => String(s.id) === String(formData.student_id));
      const resolvedTeacherId = await resolveTeacherId();
      const resolvedStudentId = String(formData.student_id || '').trim();

      if (!student) {
        setMessage('Please select a valid student for this class or stream.');
        setLoading(false);
        return;
      }

      if (!resolvedTeacherId) {
        setMessage('Your account is not linked to a teacher record. Please contact the administrator.');
        setLoading(false);
        return;
      }

      if (!resolvedStudentId) {
        setMessage('The selected student is not valid. Please select the student again and retry.');
        setLoading(false);
        return;
      }

      const classTeacher = await resolveClassTeacherForClass(selectedClassName || student.displayClass);
      if (!classTeacher?.id) {
        setMessage(`No class teacher is assigned for ${selectedClassName || student.displayClass}. Please contact the administrator.`);
        setLoading(false);
        return;
      }

      const taggedLessonNotes = submissionMode === 'auto'
        ? `${AUTO_MODE_PREFIX}\n${formData.lesson_notes}`
        : `${IMMEDIATE_MODE_PREFIX}\n${formData.lesson_notes}`;

      const payload = {
        teacher_id: resolvedTeacherId,
        teacher_name: user.name,
        student_id: resolvedStudentId,
        student_name: student.displayName,
        class_name: student.displayClass,
        recipient_class_teacher_id: classTeacher.id,
        recipient_class_teacher_name: classTeacher.name,
        subject: formData.subject,
        lesson_notes: taggedLessonNotes,
        participation: formData.participation,
        report_date: new Date().toISOString().split('T')[0]
      };

      let { error } = await supabase.schema('public').from('lesson_reports').insert(payload);

      if (error) {
        const text = `${error.message || ''}`.toLowerCase();
        if (text.includes('column') && (text.includes('recipient_class_teacher_id') || text.includes('recipient_class_teacher_name'))) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.recipient_class_teacher_id;
          delete fallbackPayload.recipient_class_teacher_name;
          const fallbackInsert = await supabase.schema('public').from('lesson_reports').insert(fallbackPayload);
          error = fallbackInsert.error;
        }
      }

      // Fallback for environments where search_path/schema resolution differs.
      if (error && (error.code === '42P01' || ((error.message || '').toLowerCase().includes('relation') && (error.message || '').toLowerCase().includes('lesson_reports')))) {
        const fallbackResult = await supabase.from('lesson_reports').insert(payload);
        error = fallbackResult.error;
      }

      if (error) {
        if (isOfflineError(error)) {
          setMessage('You are offline. Check your internet connection and try again.');
          setLoading(false);
          return;
        }

        const errorMessage = (error.message || '').toLowerCase();

        if (error?.code === '42P01' || (errorMessage.includes('relation') && errorMessage.includes('lesson_reports'))) {
          await canReadLessonReports();
          setMessage('Report submission is not available right now. Please contact the administrator.');
        } else {
          setMessage('We could not submit your report right now. Please try again.');
        }

        setLoading(false);
        return;
      }

      let autoMessage = '';
      let timingMessage = '';
      if (submissionMode === 'auto') {
        try {
          const settingsState = await loadSystemSettings();
          const durations = getAutoSubmissionDurations(settingsState);
          timingMessage = ` It will appear to Class Teacher after ${durations.teacherToClassDays} day(s).`;
        } catch (settingsError) {
          timingMessage = ' It will appear to Class Teacher after the configured auto delay.';
        }
      } else {
        timingMessage = ' It is visible to Class Teacher immediately.';
      }

      try {
        const autoResult = await runAutoSubmissionPipeline();
        autoMessage = autoResult?.skipped
          ? ' Automatic forwarding is scheduled and will run at the next time window.'
          : ' Automatic forwarding check completed.';
      } catch (pipelineError) {
        autoMessage = ' Report was submitted and automatic forwarding will continue in the background.';
      }

      setMessage(`Report submitted successfully.${timingMessage}${autoMessage}`);
      setFormData({ student_id: '', subject: '', lesson_notes: '', participation: 'Good' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      } else {
        setMessage('We could not submit your report right now. Please try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FileText size={28} style={{ color: 'var(--primary)' }} />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Submit Lesson Report</h1>
      </div>

      {message && (
        <div style={{ padding: '12px', background: isErrorMessage(message) ? '#f8d7da' : '#d4edda', color: isErrorMessage(message) ? '#721c24' : '#155724', borderRadius: '8px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {!lessonReportsReady && (
        <div className="card" style={{ marginBottom: '16px', background: '#fff7ed', border: '1px solid #fdba74', color: '#7c2d12' }}>
          Reporting is not fully set up in this database yet. If submission fails, please contact the administrator.
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label className="form-label">Class/Stream *</label>
              <select
                className="form-input"
                value={selectedClassName}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                disabled={assignedClasses.length === 1 && user.role !== 'admin'}
              >
                <option value="">Select Class/Stream</option>
                {visibleClassOptions.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Student *</label>
              <select className="form-input" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.displayName} - {s.displayClass}</option>
                ))}
              </select>
              {selectedStudent && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-gray)' }}>
                  Parent Contact: {selectedStudent.parentPhone || 'Not provided'}
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Subject *</label>
              <input className="form-input" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="e.g., Mathematics, Science" required />
            </div>

            <div>
              <label className="form-label">Submission Mode *</label>
              <select className="form-input" value={submissionMode} onChange={(e) => setSubmissionMode(e.target.value)}>
                <option value="immediate">Immediate (Class Teacher sees now)</option>
                <option value="auto">Auto/System (show after configured days)</option>
              </select>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-gray)' }}>
                Use Immediate for urgent issues. Use Auto/System for normal reports that can wait.
              </div>
            </div>

            <div>
              <label className="form-label">Lesson Notes *</label>
              <textarea className="form-input" rows="5" value={formData.lesson_notes} onChange={(e) => setFormData({...formData, lesson_notes: e.target.value})} placeholder="What was taught, student behavior, homework status..." required />
            </div>

            <div>
              <label className="form-label">Participation Rating *</label>
              <select className="form-input" value={formData.participation} onChange={(e) => setFormData({...formData, participation: e.target.value})}>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Send size={18} />
              {loading ? 'Saving...' : submissionMode === 'auto' ? 'Save Lesson Report (Auto/System)' : 'Submit Lesson Report Immediately'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
