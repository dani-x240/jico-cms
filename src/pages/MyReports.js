import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { FileText, Calendar, Trash2, Download } from 'lucide-react';

export default function MyReports({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .schema('public')
      .from('lesson_reports')
      .select('*')
      .eq('teacher_id', user.id)
      .order('report_date', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('lesson_reports')
        .select('*')
        .eq('teacher_id', user.id)
        .order('report_date', { ascending: false });

      if (fallback.error) {
        const message = `${error.message || ''} ${fallback.error.message || ''}`.toLowerCase();
        const missingRelation = message.includes('relation') && message.includes('lesson_reports');
        setTableReady(!missingRelation);
        setReports([]);
        setLoading(false);
        return;
      }

      setReports(fallback.data || []);
      setTableReady(true);
      setLoading(false);
      return;
    }

    setTableReady(true);
    setReports(data || []);
    setLoading(false);
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Delete this lesson report?')) {
      return;
    }

    const { error } = await supabase.schema('public').from('lesson_reports').delete().eq('id', reportId);
    if (error) {
      alert(`Failed to delete report: ${error.message}`);
      return;
    }

    setReports((previous) => previous.filter((report) => report.id !== reportId));
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

  const exportReportsToExcel = () => {
    if (!reports.length) {
      alert('No reports available to export.');
      return;
    }

    const escapeCell = (value) => `"${`${value ?? ''}`.replace(/"/g, '""')}"`;
    const rows = [
      ['Report Date', 'Student Name', 'Class Name', 'Subject', 'Participation', 'Lesson Notes'],
      ...reports.map((report) => [
        report.report_date ? new Date(report.report_date).toLocaleDateString() : '',
        report.student_name || '',
        report.class_name || '',
        report.subject || '',
        report.participation || '',
        report.lesson_notes || ''
      ])
    ];

    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>My Lesson Reports</h1>
        </div>
        <button className="btn-secondary" onClick={exportReportsToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} />
          Export to Excel
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>Loading reports...</div>
      ) : !tableReady ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#9a3412', background: '#fff7ed', border: '1px solid #fdba74' }}>
          Reports table is not available yet. Ask admin to run add_full_reports_system_fresh.sql.
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
          No reports submitted yet. Submit your first lesson report!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {reports.map(report => (
            <div key={report.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{report.student_name}</h3>
                  <div style={{ fontSize: '14px', color: 'var(--text-gray)' }}>{report.class_name} • {report.subject}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-gray)' }}>
                    <Calendar size={16} />
                    {new Date(report.report_date).toLocaleDateString()}
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => deleteReport(report.id)}
                    style={{ padding: '5px 10px', fontSize: '12px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{report.lesson_notes}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Participation:</span>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', background: getParticipationColor(report.participation) + '20', color: getParticipationColor(report.participation) }}>
                  {report.participation}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
