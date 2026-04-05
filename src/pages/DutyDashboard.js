import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FileText, Send, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react';
import { parseAssignedClasses } from '../utils/classAssignments';
import { runAutoSubmissionPipeline } from '../utils/autoSubmission';

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

export default function DutyDashboard({ user }) {
  const todayDate = new Date().toISOString().split('T')[0];
  const assignedClasses = parseAssignedClasses(user.class_teacher_assigned);
  const [streamReports, setStreamReports] = useState([]);
  const [myConsolidatedReports, setMyConsolidatedReports] = useState([]);
  const [myDutySubmissions, setMyDutySubmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeDutyHead, setActiveDutyHead] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [streamSummary, setStreamSummary] = useState('');
  const [totalReports, setTotalReports] = useState('');
  const [redStudents, setRedStudents] = useState('');
  const [consolidatedNotes, setConsolidatedNotes] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayDate);
  const [attendanceViewMode, setAttendanceViewMode] = useState('all');
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('');
  const [attendanceStreamFilter, setAttendanceStreamFilter] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [hasActiveDuty, setHasActiveDuty] = useState(false);
  const [isDutyHead, setIsDutyHead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const isErrorMessage = (value = '') => {
    const text = `${value || ''}`.toLowerCase();
    return text.includes('error') || text.includes('failed') || text.includes('offline') || text.includes('please') || text.includes('only');
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (hasActiveDuty) {
      loadAttendanceData();
    }
  }, [hasActiveDuty, attendanceDate]);

  useEffect(() => {
    if (assignedClasses.length > 0 && !selectedClass) {
      setSelectedClass(assignedClasses[0]);
    }
  }, [user.class_teacher_assigned]);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const dutyStatusRes = await supabase
        .from('duty_assignments')
        .select('is_duty_head')
        .eq('teacher_id', user.id)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      if (dutyStatusRes.error && isOfflineError(dutyStatusRes.error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      }

      const activeDuty = Boolean(dutyStatusRes.data);
      const dutyHead = Boolean(dutyStatusRes.data?.is_duty_head);

      setHasActiveDuty(activeDuty);
      setIsDutyHead(dutyHead);

      if (!activeDuty) {
        setStreamReports([]);
        setClasses([]);
        setMyConsolidatedReports([]);
        setMyDutySubmissions([]);
        setAttendanceRows([]);
        setSchoolStudents([]);
        setLoading(false);
        return;
      }

      if (!dutyHead) {
        const mySubmissionsRes = await supabase
          .schema('public')
          .from('stream_reports')
          .select('*')
          .eq('teacher_id', String(user.id))
          .eq('status', 'submitted')
          .order('created_at', { ascending: false })
          .limit(20);

        const dutyHeadRes = await supabase
          .from('duty_assignments')
          .select('teacher_id, teachers(name)')
          .eq('status', 'active')
          .eq('is_duty_head', true)
          .lte('start_date', today)
          .gte('end_date', today)
          .limit(1)
          .maybeSingle();

        const firstError = mySubmissionsRes.error || dutyHeadRes.error;
        if (firstError && isOfflineError(firstError)) {
          setMessage('You are offline. Check your internet connection and try again.');
        }

        if (dutyHeadRes.data) {
          setActiveDutyHead({
            id: String(dutyHeadRes.data.teacher_id),
            name: dutyHeadRes.data.teachers?.name || 'Duty Head'
          });
        } else {
          setActiveDutyHead(null);
        }

        setMyDutySubmissions(mySubmissionsRes.data || []);
        setStreamReports([]);
        setClasses([]);
        setMyConsolidatedReports([]);
        setLoading(false);
        return;
      }

      const [reportsRes, classesRes, consolidatedRes] = await Promise.all([
        supabase.schema('public').from('stream_reports').select('*').eq('status', 'submitted').order('report_date', { ascending: false }),
        supabase.from('classes').select('*'),
        supabase
          .schema('public')
          .from('consolidated_reports')
          .select('*')
          .eq('duty_head_id', String(user.id))
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const firstError = reportsRes.error || classesRes.error || consolidatedRes.error;
      if (firstError && isOfflineError(firstError)) {
        setMessage('You are offline. Check your internet connection and try again.');
      }

      setStreamReports(reportsRes.data || []);
      setClasses(classesRes.data || []);
      setMyConsolidatedReports(consolidatedRes.data || []);
      setMyDutySubmissions([]);
    } catch (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      }
    }

    setLoading(false);
  };

  const parseClassAndStream = (value = '') => {
    const clean = `${value || ''}`.trim();
    if (!clean) return { classPart: '', streamPart: '' };

    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { classPart: clean, streamPart: '' };
    }

    return {
      classPart: parts[0],
      streamPart: parts.slice(1).join(' ')
    };
  };

  const loadAttendanceData = async () => {
    const [studentsRes, attendanceRes] = await Promise.all([
      supabase.from('students').select('id, full_name, name, class_name, class'),
      supabase.from('attendance').select('student_id, status, class_name').eq('attendance_date', attendanceDate)
    ]);

    const students = (studentsRes.data || []).map((student) => {
      const classValue = student.class_name || student.class || '';
      const { classPart, streamPart } = parseClassAndStream(classValue);
      return {
        id: student.id,
        className: classValue,
        classPart,
        streamPart
      };
    });

    const attendance = (attendanceRes.data || []).map((record) => {
      const { classPart, streamPart } = parseClassAndStream(record.class_name || '');
      return {
        ...record,
        classPart,
        streamPart
      };
    });

    setSchoolStudents(students);
    setAttendanceRows(attendance);
  };

  const studentStatusRows = schoolStudents
    .filter((student) => !attendanceClassFilter || student.classPart === attendanceClassFilter)
    .filter((student) => !attendanceStreamFilter || student.streamPart === attendanceStreamFilter)
    .map((student) => {
      const record = attendanceRows.find((attendance) => String(attendance.student_id) === String(student.id));
      return {
        ...student,
        status: record?.status || 'not_marked'
      };
    });

  const overallTotals = studentStatusRows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === 'present') acc.present += 1;
      else if (row.status === 'absent') acc.absent += 1;
      else if (row.status === 'late') acc.late += 1;
      else acc.notMarked += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0, notMarked: 0 }
  );

  const groupedBreakdown = studentStatusRows.reduce((acc, row) => {
    let groupKey = 'School Total';
    if (attendanceViewMode === 'class') {
      groupKey = row.classPart || 'Unclassified';
    } else if (attendanceViewMode === 'stream') {
      groupKey = row.streamPart || 'No Stream';
    } else if (attendanceViewMode === 'both') {
      groupKey = `${row.classPart} ${row.streamPart}`.trim() || 'Unclassified';
    }

    if (!acc[groupKey]) {
      acc[groupKey] = { total: 0, present: 0, absent: 0, late: 0, notMarked: 0 };
    }

    acc[groupKey].total += 1;
    if (row.status === 'present') acc[groupKey].present += 1;
    else if (row.status === 'absent') acc[groupKey].absent += 1;
    else if (row.status === 'late') acc[groupKey].late += 1;
    else acc[groupKey].notMarked += 1;

    return acc;
  }, {});

  const groupedRows = Object.entries(groupedBreakdown)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const availableClassFilters = [...new Set(schoolStudents.map((student) => student.classPart).filter(Boolean))].sort();
  const availableStreamFilters = [...new Set(
    schoolStudents
      .filter((student) => !attendanceClassFilter || student.classPart === attendanceClassFilter)
      .map((student) => student.streamPart)
      .filter(Boolean)
  )].sort();

  const renderAttendanceInsights = () => (
    <div className="card" style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Duty Attendance Insights</h3>
      <p style={{ margin: '0 0 12px 0', color: 'var(--text-gray)', fontSize: '13px' }}>
        Active duty can monitor attendance school-wide by class, stream, or both, with room for more analytics features later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">View</label>
          <select className="form-input" value={attendanceViewMode} onChange={(e) => setAttendanceViewMode(e.target.value)}>
            <option value="all">School Total</option>
            <option value="class">Class by Class</option>
            <option value="stream">Stream by Stream</option>
            <option value="both">Class + Stream</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Class Filter</label>
          <select className="form-input" value={attendanceClassFilter} onChange={(e) => { setAttendanceClassFilter(e.target.value); setAttendanceStreamFilter(''); }}>
            <option value="">All Classes</option>
            {availableClassFilters.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Stream Filter</label>
          <select className="form-input" value={attendanceStreamFilter} onChange={(e) => setAttendanceStreamFilter(e.target.value)}>
            <option value="">All Streams</option>
            {availableStreamFilters.map((streamName) => (
              <option key={streamName} value={streamName}>{streamName}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <div className="stat-card"><div><div className="stat-value">{overallTotals.total}</div><div className="stat-label">Total Students</div></div></div>
        <div className="stat-card"><div><div className="stat-value">{overallTotals.present}</div><div className="stat-label">Present</div></div></div>
        <div className="stat-card"><div><div className="stat-value">{overallTotals.absent}</div><div className="stat-label">Absent</div></div></div>
        <div className="stat-card"><div><div className="stat-value">{overallTotals.late}</div><div className="stat-label">Late</div></div></div>
        <div className="stat-card"><div><div className="stat-value">{overallTotals.notMarked}</div><div className="stat-label">Not Marked</div></div></div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{attendanceViewMode === 'all' ? 'Scope' : attendanceViewMode === 'class' ? 'Class' : attendanceViewMode === 'stream' ? 'Stream' : 'Class / Stream'}</th>
              <th>Total</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
              <th>Not Marked</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-gray)' }}>No attendance data found for selected filters.</td>
              </tr>
            ) : (
              groupedRows.map((row) => (
                <tr key={row.name}>
                  <td style={{ fontWeight: '600' }}>{row.name}</td>
                  <td>{row.total}</td>
                  <td>{row.present}</td>
                  <td>{row.absent}</td>
                  <td>{row.late}</td>
                  <td>{row.notMarked}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getReportStatus = (className) => {
    return streamReports.some(r => r.class_name === className);
  };

  const downloadCsv = (rows, fileName) => {
    const escapeCell = (value) => `"${`${value ?? ''}`.replace(/"/g, '""')}"`;
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportDutyMemberReports = () => {
    if (!myDutySubmissions.length) {
      setMessage('No submitted reports available to export.');
      return;
    }

    const rows = [
      ['Created At', 'Class', 'Summary', 'Total Reports', 'Red Students', 'Status'],
      ...myDutySubmissions.map((report) => [
        report.created_at ? new Date(report.created_at).toLocaleString() : '',
        report.class_name || '',
        report.summary || '',
        report.total_reports || 0,
        report.red_students || 0,
        report.status || 'submitted'
      ])
    ];

    downloadCsv(rows, `duty_member_reports_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportDutyHeadStreamReports = () => {
    if (!streamReports.length) {
      setMessage('No stream reports available to export.');
      return;
    }

    const rows = [
      ['Report Date', 'Class', 'Teacher', 'Summary', 'Total Reports', 'Red Students', 'Status'],
      ...streamReports.map((report) => [
        report.report_date ? new Date(report.report_date).toLocaleDateString() : '',
        report.class_name || '',
        report.teacher_name || '',
        report.summary || '',
        report.total_reports || 0,
        report.red_students || 0,
        report.status || 'submitted'
      ])
    ];

    downloadCsv(rows, `duty_head_stream_reports_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportConsolidatedReports = () => {
    if (!myConsolidatedReports.length) {
      setMessage('No consolidated reports available to export.');
      return;
    }

    const rows = [
      ['Created At', 'Week Start', 'Total Stream Reports', 'Total Red Students', 'Notes', 'Status'],
      ...myConsolidatedReports.map((report) => [
        report.created_at ? new Date(report.created_at).toLocaleString() : '',
        report.week_start ? new Date(report.week_start).toLocaleDateString() : '',
        report.total_stream_reports || 0,
        report.total_red_students || 0,
        report.consolidated_notes || '',
        report.status || 'submitted'
      ])
    ];

    downloadCsv(rows, `consolidated_reports_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const submitToDutyHead = async () => {
    if (isDutyHead) {
      setMessage('Duty Head should use the consolidated submission section below.');
      return;
    }

    if (!selectedClass.trim()) {
      setMessage('Please select a class/stream before submitting.');
      return;
    }

    if (!streamSummary.trim()) {
      setMessage('Please add a report summary before submitting.');
      return;
    }

    const parsedTotalReports = Number(totalReports || 0);
    const parsedRedStudents = Number(redStudents || 0);
    if (Number.isNaN(parsedTotalReports) || parsedTotalReports < 0 || Number.isNaN(parsedRedStudents) || parsedRedStudents < 0) {
      setMessage('Total reports and red students must be valid non-negative numbers.');
      return;
    }

    setSubmitting(true);

    const payload = {
      teacher_id: String(user.id),
      teacher_name: user.name,
      class_name: selectedClass,
      summary: streamSummary,
      total_reports: parsedTotalReports,
      red_students: parsedRedStudents,
      report_date: new Date().toISOString().split('T')[0],
      status: 'submitted'
    };

    if (activeDutyHead?.id) {
      payload.duty_head_id = activeDutyHead.id;
      payload.duty_head_name = activeDutyHead.name;
    }

    let { error, data } = await supabase.schema('public').from('stream_reports').insert(payload).select('*');
    if (error) {
      const text = `${error.message || ''}`.toLowerCase();
      if (text.includes('column') && (text.includes('duty_head_id') || text.includes('duty_head_name'))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.duty_head_id;
        delete fallbackPayload.duty_head_name;
        const fallback = await supabase.schema('public').from('stream_reports').insert(fallbackPayload).select('*');
        error = fallback.error;
        data = fallback.data;
      }
    }

    setSubmitting(false);
    if (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      } else {
        setMessage('We could not submit this report right now. Please try again.');
      }
      return;
    }

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
    setStreamSummary('');
    setTotalReports('');
    setRedStudents('');
    if (Array.isArray(data) && data.length > 0) {
      setMyDutySubmissions((previous) => [data[0], ...previous]);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const submitToAdmin = async () => {
    if (!isDutyHead) {
      setMessage('Only the active Duty Head can submit consolidated reports to Admin.');
      return;
    }

    if (!consolidatedNotes.trim()) {
      setMessage('Please add consolidated notes before submitting');
      return;
    }

    setSubmitting(true);
    const totalRedStudents = streamReports.reduce((sum, r) => sum + (r.red_students || 0), 0);
    
    const { error, data } = await supabase.schema('public').from('consolidated_reports').insert({
      duty_head_id: String(user.id),
      duty_head_name: user.name,
      week_start: new Date().toISOString().split('T')[0],
      total_stream_reports: streamReports.length,
      total_red_students: totalRedStudents,
      consolidated_notes: consolidatedNotes,
      status: 'submitted'
    }).select('*');

    setSubmitting(false);
    if (error) {
      if (isOfflineError(error)) {
        setMessage('You are offline. Check your internet connection and try again.');
      } else {
        setMessage('We could not submit the consolidated report right now. Please try again.');
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

      setMessage(`Consolidated report submitted to Admin successfully.${autoMessage}`);
      setConsolidatedNotes('');
      // Keep stream list current after successful weekly submission.
      if (Array.isArray(data) && data.length > 0) {
        setMyConsolidatedReports((previous) => [data[0], ...previous]);
        fetchData();
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

  if (!hasActiveDuty) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <FileText size={28} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Duty Dashboard</h1>
        </div>
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>No active duty assignment</div>
          <div style={{ color: 'var(--text-gray)', fontSize: '14px' }}>
            You can only use this page during your active duty period.
          </div>
        </div>
      </div>
    );
  }

  if (!isDutyHead) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <FileText size={28} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Duty Team Dashboard</h1>
        </div>

        {message && (
          <div style={{ padding: '12px', background: isErrorMessage(message) ? '#f8d7da' : '#d4edda', color: isErrorMessage(message) ? '#721c24' : '#155724', borderRadius: '8px', marginBottom: '20px' }}>
            {message}
          </div>
        )}

        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>Submission Rule</h3>
          <div style={{ color: 'var(--text-gray)', fontSize: '14px', lineHeight: '1.6' }}>
            As a duty team member, you submit class/stream reports to the Duty Head only. Only the Duty Head can submit the consolidated weekly report to Admin.
          </div>
        </div>

        {renderAttendanceInsights()}

        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Submit Class/Stream Report to Duty Head</h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-gray)' }}>
            {activeDutyHead ? `Current Duty Head: ${activeDutyHead.name}` : 'No active Duty Head found right now. You can still save your stream report.'}
          </p>

          <div className="form-group">
            <label className="form-label">Class/Stream</label>
            <select
              className="form-input"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {assignedClasses.length > 0 ? (
                assignedClasses.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))
              ) : (
                <>
                  <option value="">Select class/stream</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                  <option value="S4">S4</option>
                  <option value="S5">S5</option>
                  <option value="S6">S6</option>
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Total Reports</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={totalReports}
                onChange={(e) => setTotalReports(e.target.value)}
                placeholder="e.g. 18"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Red Students</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={redStudents}
                onChange={(e) => setRedStudents(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Summary</label>
            <textarea
              className="form-input"
              rows="6"
              value={streamSummary}
              onChange={(e) => setStreamSummary(e.target.value)}
              placeholder="Add your class/stream summary, issues and recommendations for Duty Head..."
            />
          </div>

          <button
            onClick={submitToDutyHead}
            disabled={submitting}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
          >
            <Send size={18} />
            {submitting ? 'Saving...' : 'Save & Submit to Duty Head'}
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Your Submitted Reports to Duty Head</h3>
            <button className="btn-secondary" onClick={exportDutyMemberReports} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} />
              Export to Excel
            </button>
          </div>
          {myDutySubmissions.length === 0 ? (
            <div style={{ color: 'var(--text-gray)', fontSize: '14px' }}>
              No submitted stream reports yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {myDutySubmissions.map((report) => (
                <div key={report.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', background: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: '600' }}>{report.class_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{report.status || 'submitted'}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                    Submitted: {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'} • Red: {report.red_students || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalRedStudents = streamReports.reduce((sum, r) => sum + (r.red_students || 0), 0);
  const receivedCount = streamReports.length;
  const pendingCount = classes.length - receivedCount;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FileText size={28} style={{ color: 'var(--primary)' }} />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>⭐ Duty Head Dashboard</h1>
      </div>

      {message && (
        <div style={{ padding: '12px', background: isErrorMessage(message) ? '#f8d7da' : '#d4edda', color: isErrorMessage(message) ? '#721c24' : '#155724', borderRadius: '8px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <CheckCircle size={24} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div className="stat-value">{receivedCount}</div>
            <div className="stat-label">Reports Received</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Clock size={24} style={{ color: '#d97706' }} />
          </div>
          <div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Reports Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <AlertTriangle size={24} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div className="stat-value">{totalRedStudents}</div>
            <div className="stat-label">Red Students</div>
          </div>
        </div>
      </div>

      {renderAttendanceInsights()}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Reports Collection Status</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {classes.map(cls => {
            const hasReport = getReportStatus(cls.name);
            return (
              <div key={cls.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: '500' }}>Class {cls.name}</span>
                {hasReport ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '14px' }}>
                    <CheckCircle size={16} /> RECEIVED
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontSize: '14px' }}>
                    <Clock size={16} /> PENDING
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Received Stream Reports</h3>
          <button className="btn-secondary" onClick={exportDutyHeadStreamReports} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} />
            Export to Excel
          </button>
        </div>
        {streamReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-gray)' }}>No stream reports received yet</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {streamReports.map(report => (
              <div key={report.id} style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{report.class_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Teacher: {report.teacher_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{report.total_reports} reports</div>
                    <div style={{ fontSize: '13px', color: '#dc2626' }}>{report.red_students} red students</div>
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'white', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                  {report.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Submitted Consolidated Reports</h3>
          <button className="btn-secondary" onClick={exportConsolidatedReports} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} />
            Export to Excel
          </button>
        </div>
        {myConsolidatedReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-gray)' }}>
            No consolidated weekly report submitted yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {myConsolidatedReports.map((report) => (
              <div key={report.id} style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontWeight: '600' }}>Week: {new Date(report.week_start).toLocaleDateString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{report.status || 'submitted'}</div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                  Created: {new Date(report.created_at).toLocaleString()} • Streams: {report.total_stream_reports} • Red: {report.total_red_students}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Consolidated Weekly Report</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-gray)', marginBottom: '16px' }}>
          Duty Head only: add school-wide summary, issues identified, and recommendations for Admin.
        </p>
        <textarea className="form-input" rows="8" value={consolidatedNotes} onChange={(e) => setConsolidatedNotes(e.target.value)} placeholder="School-wide summary, attendance trends, issues identified, parent contact summary, recommendations..." />
        <button onClick={submitToAdmin} disabled={submitting || streamReports.length === 0} className="btn-primary" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Send size={18} />
          {submitting ? 'Saving...' : 'Save & Submit Consolidated Report to Admin'}
        </button>
        {streamReports.length === 0 && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#d97706' }}>
            Wait for at least one stream report before submitting
          </div>
        )}
      </div>
    </div>
  );
}
