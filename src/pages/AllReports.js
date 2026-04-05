import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { FileText, Download, Eye, AlertCircle, TrendingUp, Search, Trash2 } from 'lucide-react';

export default function AllReports({ selectedClassFilter }) {
  const [consolidatedReports, setConsolidatedReports] = useState([]);
  const [streamReports, setStreamReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [viewMode, setViewMode] = useState('consolidated');
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classFilter, setClassFilter] = useState(selectedClassFilter || '');
  const [streamFilter, setStreamFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClassFilter) {
      setClassFilter(selectedClassFilter);
    }
  }, [selectedClassFilter]);

  const fetchData = async () => {
    setLoading(true);
    const [consolidatedRes, streamRes, studentsRes] = await Promise.all([
      supabase.schema('public').from('consolidated_reports').select('*').order('week_start', { ascending: false }),
      supabase.schema('public').from('stream_reports').select('*').order('report_date', { ascending: false }),
      supabase.from('students').select('*')
    ]);

    setConsolidatedReports(consolidatedRes.data || []);
    setStreamReports(streamRes.data || []);
    setStudents(studentsRes.data || []);
    setLoading(false);
  };

  const normalizeClassValue = (value = '') => value.trim().toLowerCase();

  const classMatchesFilter = (value = '') => {
    const normalizedValue = normalizeClassValue(value);
    const normalizedFilter = normalizeClassValue(classFilter);

    if (!normalizedFilter) return true;
    return normalizedValue === normalizedFilter || normalizedValue.startsWith(`${normalizedFilter} `);
  };

  const splitStudentClassAndStream = (value = '') => {
    const cleanValue = (value || '').trim();
    if (!cleanValue) {
      return { classPart: '', streamPart: '' };
    }

    const parts = cleanValue.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { classPart: cleanValue, streamPart: '' };
    }

    return {
      classPart: parts[0],
      streamPart: parts.slice(1).join(' ')
    };
  };

  const availableClasses = [...new Set(streamReports.map((report) => report.class_name).filter(Boolean))].sort();

  const availableStreams = [...new Set(
    students
      .map((student) => splitStudentClassAndStream(student.class_name || student.class || '').streamPart)
      .filter(Boolean)
  )].sort();

  const filteredConsolidated = consolidatedReports.filter((report) => {
    const matchesSearch = !searchTerm || (report.duty_head_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFrom = !dateFrom || new Date(report.week_start) >= new Date(dateFrom);
    const matchesTo = !dateTo || new Date(report.week_start) <= new Date(dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const filteredStream = streamReports.filter((report) => {
    const matchesSearch = !searchTerm ||
      (report.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.class_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classMatchesFilter(report.class_name || '');
    const matchesFrom = !dateFrom || new Date(report.report_date) >= new Date(dateFrom);
    const matchesTo = !dateTo || new Date(report.report_date) <= new Date(dateTo);
    return matchesSearch && matchesClass && matchesFrom && matchesTo;
  });

  const getRedStudents = () => {
    return students.filter((student) => {
      const attendance = student.attendance_percentage || 0;
      const studentClass = student.class_name || student.class || '';
      const streamName = splitStudentClassAndStream(studentClass).streamPart;

      if (streamFilter && streamName !== streamFilter) {
        return false;
      }

      return attendance < 70 && classMatchesFilter(studentClass);
    });
  };

  const exportExcel = (data, filename) => {
    let csv = '';
    if (Array.isArray(data)) {
      csv = [
        ['Admission No', 'Name', 'Class', 'Attendance', 'Parent Phone'].join(','),
        ...data.map((s) => [s.admission_no, s.full_name, s.class_name, `${s.attendance_percentage || 0}%`, s.parent_phone].join(','))
      ].join('\n');
    } else {
      csv = `Report: ${data.duty_head_name || data.teacher_name}\nDate: ${data.week_start || data.report_date}\nNotes: ${data.consolidated_notes || data.summary}`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const deleteConsolidatedReport = async (reportId) => {
    if (!window.confirm('Delete this consolidated report?')) {
      return;
    }

    const { error } = await supabase.schema('public').from('consolidated_reports').delete().eq('id', reportId);
    if (error) {
      alert(`Failed to delete report: ${error.message}`);
      return;
    }

    setConsolidatedReports((previous) => previous.filter((report) => report.id !== reportId));
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
  };

  const deleteStreamReport = async (reportId) => {
    if (!window.confirm('Delete this stream report?')) {
      return;
    }

    const { error } = await supabase.schema('public').from('stream_reports').delete().eq('id', reportId);
    if (error) {
      alert(`Failed to delete report: ${error.message}`);
      return;
    }

    setStreamReports((previous) => previous.filter((report) => report.id !== reportId));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading reports...</div>;
  }

  const redStudents = getRedStudents();
  const recentStreamSubmissions = filteredStream.slice(0, 5);
  const hasFilters = Boolean(searchTerm || dateFrom || dateTo || classFilter || streamFilter);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className={viewMode === 'consolidated' ? 'btn-primary' : 'btn-secondary'} onClick={() => setViewMode('consolidated')} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '500' }}>
            Consolidated Reports
          </button>
          <button className={viewMode === 'stream' ? 'btn-primary' : 'btn-secondary'} onClick={() => setViewMode('stream')} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '500' }}>
            Stream Reports
          </button>
          <button className={viewMode === 'attention' ? 'btn-primary' : 'btn-secondary'} onClick={() => setViewMode('attention')} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '500' }}>
            Students Needing Attention
          </button>
        </div>

        {viewMode !== 'attention' && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
              <input type="text" className="form-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '40px' }} />
            </div>
            <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: '220px' }}>
              <option value="">All Classes</option>
              {availableClasses.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '150px' }} />
            <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '150px' }} />
          </div>
        )}

        {viewMode === 'attention' && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: '220px' }}>
              <option value="">All Classes</option>
              {availableClasses.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            <select className="form-input" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} style={{ width: '220px' }}>
              <option value="">All Streams</option>
              {availableStreams.map((streamName) => (
                <option key={streamName} value={streamName}>{streamName}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setDateFrom('');
              setDateTo('');
              setClassFilter(selectedClassFilter || '');
              setStreamFilter('');
            }}
            disabled={!hasFilters}
            style={{ padding: '8px 12px', fontSize: '13px' }}
          >
            Clear Filters
          </button>
          <button className="btn-secondary" onClick={fetchData} style={{ padding: '8px 12px', fontSize: '13px' }}>
            Reload Reports
          </button>
          {!hasFilters && <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>No filters active</span>}
        </div>
      </div>

      {viewMode === 'consolidated' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe' }}>
                <FileText size={24} style={{ color: '#1e40af' }} />
              </div>
              <div>
                <div className="stat-value">{consolidatedReports.length}</div>
                <div className="stat-label">Weekly Reports</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dcfce7' }}>
                <TrendingUp size={24} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <div className="stat-value">{streamReports.length}</div>
                <div className="stat-label">Stream Reports</div>
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

          {filteredConsolidated.length === 0 ? (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-gray)', marginBottom: recentStreamSubmissions.length > 0 ? '18px' : '0' }}>
                <FileText size={48} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No consolidated reports found</div>
                <div style={{ fontSize: '14px' }}>Weekly duty-head summary has not been submitted yet for this filter/date range.</div>
              </div>

              {recentStreamSubmissions.length > 0 && (
                <div style={{ marginTop: '14px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                    Reports received in duty flow (latest stream submissions)
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {recentStreamSubmissions.map((report) => (
                      <div key={report.id} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ fontWeight: '600' }}>{report.class_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{new Date(report.report_date).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Teacher: {report.teacher_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredConsolidated.map((report) => (
                <div key={report.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
                        Week of {new Date(report.week_start).toLocaleDateString()}
                      </h3>
                      <div style={{ fontSize: '14px', color: 'var(--text-gray)' }}>Submitted by: {report.duty_head_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelectedReport(report)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} /> View
                      </button>
                      <button onClick={() => exportExcel(report, 'consolidated_report')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={16} /> Excel
                      </button>
                      <button onClick={() => deleteConsolidatedReport(report.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c' }}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>Stream Reports: </span>
                      <span style={{ fontWeight: '600' }}>{report.total_stream_reports}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>Red Students: </span>
                      <span style={{ fontWeight: '600', color: '#dc2626' }}>{report.total_red_students}</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                    {report.consolidated_notes.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'stream' && (
        <div>
          {filteredStream.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-gray)' }}>
              <FileText size={48} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No stream reports found</div>
              <div style={{ fontSize: '14px' }}>Try adjusting your filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredStream.map((report) => (
                <div key={report.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>{report.class_name}</h3>
                      <div style={{ fontSize: '14px', color: 'var(--text-gray)' }}>
                        Teacher: {report.teacher_name} • {new Date(report.report_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => exportExcel(report, 'stream_report')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={16} /> Excel
                      </button>
                      <button onClick={() => deleteStreamReport(report.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c' }}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>Total Reports: </span>
                      <span style={{ fontWeight: '600' }}>{report.total_reports}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-gray)' }}>Red Students: </span>
                      <span style={{ fontWeight: '600', color: '#dc2626' }}>{report.red_students}</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                    {report.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'attention' && (
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              🔴 Red Students (Attendance Below 70%)
            </h3>
            {redStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-gray)' }}>
                <AlertCircle size={48} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No red students at this time</div>
                <div style={{ fontSize: '14px' }}>Students with attendance below 70% will appear here</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <button onClick={() => exportExcel(redStudents, 'red_students')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} /> Export Red Students List
                  </button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Attendance</th>
                      <th>Parent Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.admission_no}</td>
                        <td>{student.full_name}</td>
                        <td>{student.class_name}</td>
                        <td><span style={{ color: '#dc2626', fontWeight: '600' }}>{student.attendance_percentage || 0}%</span></td>
                        <td>{student.parent_phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
              Consolidated Report - Week of {new Date(selectedReport.week_start).toLocaleDateString()}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-gray)', marginBottom: '4px' }}>Submitted by:</div>
              <div style={{ fontWeight: '600' }}>{selectedReport.duty_head_name}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Stream Reports</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>{selectedReport.total_stream_reports}</div>
              </div>
              <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Red Students</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>{selectedReport.total_red_students}</div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Consolidated Notes:</div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {selectedReport.consolidated_notes}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => exportExcel(selectedReport, 'consolidated_report')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Export as Excel
              </button>
              <button onClick={() => setSelectedReport(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
