import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Check, Eye, Users } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { classMatches, parseAssignedClasses, stringifyAssignedClasses } from '../utils/classAssignments';

export default function Classes({ onNavigateWithClassFilter }) {
  const [classes, setClasses] = useState([]);
  const [allStreams, setAllStreams] = useState([]);
  const [streamTemplates, setStreamTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const [streamAssignments, setStreamAssignments] = useState([]);
  const [teacherWorkloads, setTeacherWorkloads] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [classStudentsData, setClassStudentsData] = useState({
    loading: false,
    students: [],
    stats: {
      totalStudents: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      attendanceRate: 0
    }
  });
  
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    has_streams: 'yes',
    streams: ['']
  });
  const [createMode, setCreateMode] = useState('single');
  const [bulkClassNames, setBulkClassNames] = useState('');

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  const loadClasses = async () => {
    try {
      const [classesResponse, streamsResponse] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('streams').select('*')
      ]);

      const classesData = classesResponse.data || [];
      const streamsData = streamsResponse.data || [];

      setClasses(classesData);
      setAllStreams(streamsData);
      buildStreamTemplates(classesData, streamsData);
      buildAssignmentViews(classesData, streamsData, teachers);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
    setLoading(false);
  };

  const buildAssignmentViews = (classesData = classes, streamsData = allStreams, teachersData = teachers) => {
    const findTeacherForStream = (fullStreamName) => {
      // Primary source: explicit class teacher stream assignment.
      const explicitClassTeacher = (teachersData || []).find((teacher) =>
        classMatches(teacher.class_teacher_assigned || '', fullStreamName)
      );

      if (explicitClassTeacher) {
        return explicitClassTeacher;
      }

      // Fallback: if a teacher has this stream in class_assigned and no explicit class teacher stream,
      // treat as assigned so legacy data still displays correctly.
      return (teachersData || []).find((teacher) => {
        const explicitValue = `${teacher.class_teacher_assigned || ''}`.trim();
        if (explicitValue) return false;

        return parseAssignedClasses(teacher.class_assigned).some((assignedClass) =>
          classMatches(assignedClass, fullStreamName)
        );
      });
    };

    const classById = new Map((classesData || []).map((classItem) => [classItem.id, classItem]));

    const assignmentRows = (streamsData || [])
      .map((stream) => {
        const classItem = classById.get(stream.class_id);
        const className = classItem?.name || 'Unknown Class';
        const fullStreamName = `${className} ${stream.name}`.trim();

        const matchedTeacher = findTeacherForStream(fullStreamName);

        return {
          streamId: stream.id,
          classId: stream.class_id,
          className,
          streamName: stream.name,
          fullStreamName,
          teacherId: matchedTeacher?.id || null,
          teacherName: matchedTeacher?.name || null
        };
      })
      .sort((a, b) => a.fullStreamName.localeCompare(b.fullStreamName));

    const workloadRows = (teachersData || [])
      .map((teacher) => {
        const assignedStreams = assignmentRows
          .filter((row) => String(row.teacherId) === String(teacher.id))
          .map((row) => row.fullStreamName);

        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          assignedStreams
        };
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    setStreamAssignments(assignmentRows);
    setTeacherWorkloads(workloadRows);
    setAssignmentLoading(false);
  };

  const buildStreamTemplates = (classesData, streamsData) => {
    const templates = classesData
      .filter((classItem) => classItem.has_streams)
      .map((classItem) => {
        const names = streamsData
          .filter((stream) => stream.class_id === classItem.id)
          .map((stream) => stream.name.trim())
          .filter(Boolean);

        return {
          sourceClassId: classItem.id,
          sourceClassName: classItem.name,
          streamNames: names
        };
      })
      .filter((template) => template.streamNames.length > 0);

    setStreamTemplates(templates);
  };

  const normalizeStreamSet = (values) =>
    values
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .sort();

  const findMatchingTemplate = (streamValues) => {
    const normalizedCurrent = normalizeStreamSet(streamValues);

    return streamTemplates.find((template) => {
      const normalizedTemplate = normalizeStreamSet(template.streamNames);
      if (normalizedTemplate.length !== normalizedCurrent.length) {
        return false;
      }

      return normalizedTemplate.every((value, index) => value === normalizedCurrent[index]);
    });
  };

  const applyTemplate = (template) => {
    setFormData((previous) => ({
      ...previous,
      has_streams: 'yes',
      streams: [...template.streamNames]
    }));
  };

  const handleEdit = async (classItem) => {
    setSelectedClass(classItem);
    try {
      // Load existing streams if class has streams
      let existingStreams = [''];
      if (classItem.has_streams) {
        const { data } = await supabase
          .from('streams')
          .select('name')
          .eq('class_id', classItem.id);
        existingStreams = data?.map(s => s.name) || [''];
      }
      
      setFormData({
        name: classItem.name,
        full_name: classItem.full_name || '',
        has_streams: classItem.has_streams ? 'yes' : 'no',
        streams: existingStreams
      });
    } catch (error) {
      console.error('Error loading streams:', error);
    }
    setShowModal(true);
  };

  const loadTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*').eq('approved', true);
    const teachersData = data || [];
    setTeachers(teachersData);
    buildAssignmentViews(classes, allStreams, teachersData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const enteredStreams = formData.streams.filter((value) => value.trim());

      if (!selectedClass && formData.has_streams === 'yes') {
        const matchedTemplate = findMatchingTemplate(enteredStreams);

        if (matchedTemplate) {
          const continueWithTemplate = window.confirm(
            `This stream set matches ${matchedTemplate.sourceClassName}. Click OK to continue with this existing stream set, or Cancel to create your own stream names.`
          );

          if (!continueWithTemplate) {
            setLoading(false);
            return;
          }
        }
      }

      const classData = {
        name: formData.name,
        full_name: formData.full_name || null,
        has_streams: formData.has_streams === 'yes',
        capacity: 50
      };

      if (selectedClass) {
        // Update existing class
        await supabase
          .from('classes')
          .update(classData)
          .eq('id', selectedClass.id);
        
        // Handle streams for updates
        if (!classData.has_streams) {
          // Delete all streams if no longer has streams
          await supabase
            .from('streams')
            .delete()
            .eq('class_id', selectedClass.id);
        } else if (classData.has_streams) {
          // Delete old streams and add new ones
          await supabase
            .from('streams')
            .delete()
            .eq('class_id', selectedClass.id);
          
          const newStreams = formData.streams
            .filter(s => s.trim())
            .map(stream => ({
              class_id: selectedClass.id,
              name: stream.trim()
            }));
          
          if (newStreams.length > 0) {
            await supabase.from('streams').insert(newStreams);
          }
        }
        alert('✅ Class updated successfully!');
      } else {
        if (createMode === 'multiple') {
          const parsedNames = bulkClassNames
            .split(/\r?\n|,/)
            .map((value) => value.trim())
            .filter(Boolean);

          const uniqueNames = [...new Set(parsedNames)];

          if (uniqueNames.length === 0) {
            alert('Please enter at least one class name for multi-create.');
            setLoading(false);
            return;
          }

          const classesPayload = uniqueNames.map((name) => ({
            name,
            full_name: null,
            has_streams: formData.has_streams === 'yes',
            capacity: 50
          }));

          const { data: createdClasses, error: createError } = await supabase
            .from('classes')
            .insert(classesPayload)
            .select('id, name');

          if (createError) throw createError;

          if (formData.has_streams === 'yes' && enteredStreams.length > 0) {
            const streamData = (createdClasses || []).flatMap((createdClass) =>
              enteredStreams.map((stream) => ({
                class_id: createdClass.id,
                name: stream.trim()
              }))
            );

            if (streamData.length > 0) {
              const { error: streamError } = await supabase.from('streams').insert(streamData);
              if (streamError) throw streamError;
            }
          }

          alert(`✅ ${uniqueNames.length} classes created successfully!`);
        } else {
          // Create new class
          const { data: newClass, error } = await supabase
            .from('classes')
            .insert(classData)
            .select()
            .single();

          if (error) throw error;

          if (formData.has_streams === 'yes' && enteredStreams.length > 0) {
            const streamData = enteredStreams.map((stream) => ({
              class_id: newClass.id,
              name: stream.trim()
            }));

            if (streamData.length > 0) {
              await supabase.from('streams').insert(streamData);
            }
          }
          alert('✅ Class created successfully!');
        }
      }
      
      setShowModal(false);
      setSelectedClass(null);
      loadClasses();
      setFormData({ name: '', full_name: '', has_streams: 'yes', streams: [''] });
      setCreateMode('single');
      setBulkClassNames('');
    } catch (error) {
      alert('Error saving class: ' + error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure? This will delete all streams and unassign students.')) {
      await supabase.from('classes').delete().eq('id', id);
      loadClasses();
    }
  };

  const viewStreams = async (classItem) => {
    setSelectedClass(classItem);
    // Fetch streams from database
    try {
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('class_id', classItem.id);
      setClasses(prev => prev.map(c => 
        c.id === classItem.id ? { ...c, streamsList: data || [] } : c
      ));
    } catch (error) {
      console.error('Error loading streams:', error);
    }
    setShowStreamModal(true);
  };

  const matchesClassGroup = (classItem, className = '') => {
    const normalizedClassName = className.trim().toLowerCase();
    const normalizedTarget = classItem.name.trim().toLowerCase();

    if (!normalizedClassName || !normalizedTarget) {
      return false;
    }

    return normalizedClassName === normalizedTarget || normalizedClassName.startsWith(`${normalizedTarget} `);
  };

  const viewClassStudents = async (classItem) => {
    setSelectedClassForStudents(classItem);
    setShowStudentsModal(true);
    setClassStudentsData((previous) => ({ ...previous, loading: true }));

    try {
      const today = new Date().toISOString().split('T')[0];

      const [studentsResponse, attendanceResponse] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('attendance').select('*').eq('attendance_date', today)
      ]);

      const normalizedStudents = (studentsResponse.data || []).map((student) => ({
        ...student,
        displayName: student.full_name || student.name || '',
        displayClass: student.class_name || student.class || '',
        displayAdmissionNo: student.admission_no || `STU-${student.id}`
      }));

      const classStudents = normalizedStudents
        .filter((student) => matchesClassGroup(classItem, student.displayClass))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      const classAttendance = (attendanceResponse.data || []).filter((record) =>
        matchesClassGroup(classItem, record.class_name || '')
      );

      const presentToday = classAttendance.filter((record) => record.status === 'present').length;
      const absentToday = classAttendance.filter((record) => record.status === 'absent').length;
      const lateToday = classAttendance.filter((record) => record.status === 'late').length;
      const totalStudents = classStudents.length;
      const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

      setClassStudentsData({
        loading: false,
        students: classStudents,
        stats: {
          totalStudents,
          presentToday,
          absentToday,
          lateToday,
          attendanceRate
        }
      });
    } catch (error) {
      console.error('Error loading class students:', error);
      setClassStudentsData({
        loading: false,
        students: [],
        stats: {
          totalStudents: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          attendanceRate: 0
        }
      });
    }
  };

  const assignTeacher = (stream) => {
    setSelectedStream(stream);
    setShowAssignModal(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      alert('Please select a teacher first.');
      return;
    }

    try {
      const streamName = `${selectedClass.name} ${selectedStream.name}`;

      // Ensure only one teacher is class teacher for this stream.
      const teachersWithStream = teachers.filter((teacher) =>
        classMatches(teacher.class_teacher_assigned || '', streamName)
      );

      for (const teacher of teachersWithStream) {
        if (String(teacher.id) === String(selectedTeacher)) continue;

        const updatedAssignments = parseAssignedClasses(teacher.class_assigned).filter(
          (assignedClass) => !classMatches(assignedClass, streamName)
        );

        await supabase
          .from('teachers')
          .update({
            class_assigned: stringifyAssignedClasses(updatedAssignments) || null,
            class_teacher_assigned: null
          })
          .eq('id', teacher.id);
      }

      const targetTeacher = teachers.find((teacher) => String(teacher.id) === String(selectedTeacher));
      const existingAssignments = parseAssignedClasses(targetTeacher?.class_assigned);
      const hasAssignment = existingAssignments.some((assignedClass) => classMatches(assignedClass, streamName));
      const mergedAssignments = hasAssignment ? existingAssignments : [...existingAssignments, streamName];
      
      await supabase
        .from('teachers')
        .update({
          class_assigned: stringifyAssignedClasses(mergedAssignments),
          class_teacher_assigned: streamName
        })
        .eq('id', selectedTeacher);

      alert('✅ Teacher assigned successfully!');
      setShowAssignModal(false);
      setSelectedTeacher('');
      loadTeachers();
      setStreamRefreshKey((previous) => previous + 1);
    } catch (error) {
      alert('Error assigning teacher: ' + error.message);
    }
  };

  const addStreamField = () => {
    setFormData({ ...formData, streams: [...formData.streams, ''] });
  };

  const removeStreamField = (index) => {
    const newStreams = formData.streams.filter((_, i) => i !== index);
    setFormData({ ...formData, streams: newStreams });
  };

  const updateStream = (index, value) => {
    const newStreams = [...formData.streams];
    newStreams[index] = value;
    setFormData({ ...formData, streams: newStreams });
  };

  const startReplaceAssignment = (assignmentRow) => {
    const classItem = classes.find((item) => item.id === assignmentRow.classId);
    if (!classItem) return;

    setSelectedClass(classItem);
    setSelectedStream({ id: assignmentRow.streamId, name: assignmentRow.streamName });
    setSelectedTeacher(assignmentRow.teacherId || '');
    setShowAssignModal(true);
  };

  const handleUnassignTeacher = async (assignmentRow) => {
    if (!assignmentRow.teacherId) return;

    const confirmed = window.confirm(`Unassign ${assignmentRow.teacherName} from ${assignmentRow.fullStreamName}?`);
    if (!confirmed) return;

    const targetTeacher = teachers.find((teacher) => String(teacher.id) === String(assignmentRow.teacherId));
    if (!targetTeacher) return;

    const updatedAssignments = parseAssignedClasses(targetTeacher.class_assigned).filter(
      (assignedClass) => !classMatches(assignedClass, assignmentRow.fullStreamName)
    );

    const { error } = await supabase
      .from('teachers')
      .update({
        class_assigned: stringifyAssignedClasses(updatedAssignments) || null,
        class_teacher_assigned: classMatches(targetTeacher.class_teacher_assigned || '', assignmentRow.fullStreamName)
          ? null
          : targetTeacher.class_teacher_assigned || null
      })
      .eq('id', assignmentRow.teacherId);

    if (error) {
      alert('Error unassigning teacher: ' + error.message);
      return;
    }

    alert('✅ Teacher unassigned successfully!');
    await loadTeachers();
    setStreamRefreshKey((previous) => previous + 1);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Classes</h2>
        <button className="btn btn-primary" onClick={() => { setCreateMode('single'); setBulkClassNames(''); setShowModal(true); }}>
          <Plus size={18} />
          Add New Class(es)
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
            No classes found. Create your first class to get started.
          </div>
        ) : (
          classes.map(classItem => (
            <div key={classItem.id} style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    {classItem.name}
                  </h3>
                  {classItem.full_name && (
                    <p style={{ color: 'var(--text-gray)', fontSize: '14px', marginBottom: '8px' }}>
                      {classItem.full_name}
                    </p>
                  )}
                  <p style={{ fontSize: '14px', color: 'var(--text-gray)' }}>
                    {classItem.has_streams ? '✅ Has streams' : '⊘ No streams'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => viewClassStudents(classItem)}>
                    <Users size={16} />
                    View Students
                  </button>
                  {classItem.has_streams && (
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => viewStreams(classItem)}>
                      <Eye size={16} />
                      View Streams
                    </button>
                  )}
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(classItem)}>
                    <Edit size={16} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleDelete(classItem.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '26px', display: 'grid', gap: '16px' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>Class Teacher Management</h3>
          {assignmentLoading ? (
            <div style={{ color: 'var(--text-gray)' }}>Loading assignments...</div>
          ) : streamAssignments.length === 0 ? (
            <div style={{ color: 'var(--text-gray)' }}>No streams found yet.</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Stream</th>
                    <th>Current Teacher</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {streamAssignments.map((row) => (
                    <tr key={row.streamId}>
                      <td style={{ fontWeight: '600' }}>{row.fullStreamName}</td>
                      <td>{row.teacherName || 'Not Assigned'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ marginRight: '8px', padding: '6px 12px' }}
                          onClick={() => startReplaceAssignment(row)}
                        >
                          {row.teacherName ? 'Replace' : 'Assign'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', background: '#fff1f2', color: '#be123c' }}
                          disabled={!row.teacherName}
                          onClick={() => handleUnassignTeacher(row)}
                        >
                          Unassign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>Teacher Workload</h3>
          {assignmentLoading ? (
            <div style={{ color: 'var(--text-gray)' }}>Loading teacher workload...</div>
          ) : teacherWorkloads.length === 0 ? (
            <div style={{ color: 'var(--text-gray)' }}>No teachers available.</div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {teacherWorkloads.map((row) => (
                <div key={row.teacherId} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700' }}>{row.teacherName}</span>
                    <span style={{ color: 'var(--text-gray)', fontSize: '13px' }}>{row.assignedStreams.length} stream(s)</span>
                  </div>
                  {row.assignedStreams.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>No streams assigned</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {row.assignedStreams.map((streamName) => (
                        <span key={`${row.teacherId}-${streamName}`} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '999px', background: '#e0e7ff', color: '#1e3a8a' }}>
                          {streamName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedClass ? 'Edit Class' : 'Create New Class'}</h3>
              <button onClick={() => { setShowModal(false); setSelectedClass(null); setCreateMode('single'); setBulkClassNames(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {!selectedClass && (
                <div className="form-group">
                  <label className="form-label">Creation Mode</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="create_mode"
                        value="single"
                        checked={createMode === 'single'}
                        onChange={(e) => setCreateMode(e.target.value)}
                      />
                      Single class
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="create_mode"
                        value="multiple"
                        checked={createMode === 'multiple'}
                        onChange={(e) => setCreateMode(e.target.value)}
                      />
                      Multiple classes (same streams)
                    </label>
                  </div>
                </div>
              )}

              {selectedClass || createMode === 'single' ? (
                <div className="form-group">
                  <label className="form-label">Class Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="S.1, Senior 1, Form 1"
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Class Names *</label>
                  <textarea
                    className="form-input"
                    rows="5"
                    value={bulkClassNames}
                    onChange={(e) => setBulkClassNames(e.target.value)}
                    placeholder={`Enter one class per line\nS.1\nS.2\nS.3\nS.4`}
                    required
                  />
                  <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginTop: '8px' }}>
                    You can also separate names with commas. All classes will get the same streams below.
                  </p>
                </div>
              )}

              {(selectedClass || createMode === 'single') && (
                <div className="form-group">
                  <label className="form-label">Full Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Senior One"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Does this class have streams? *</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="has_streams"
                      value="yes"
                      checked={formData.has_streams === 'yes'}
                      onChange={(e) => setFormData({...formData, has_streams: e.target.value})}
                    />
                    Yes, this class has streams
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="has_streams"
                      value="no"
                      checked={formData.has_streams === 'no'}
                      onChange={(e) => setFormData({...formData, has_streams: e.target.value, streams: []})}
                    />
                    No, this class has no streams
                  </label>
                </div>
              </div>

              {formData.has_streams === 'yes' && (
                <div className="form-group">
                  {!selectedClass && streamTemplates.length > 0 && (
                    <div style={{ marginBottom: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                        Use existing stream set or create your own
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {streamTemplates.map((template) => (
                          <button
                            key={template.sourceClassId}
                            type="button"
                            className="btn btn-secondary"
                            style={{ justifyContent: 'flex-start' }}
                            onClick={() => applyTemplate(template)}
                          >
                            Copy {template.sourceClassName}: {template.streamNames.join(', ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="form-label">Stream Names</label>
                  <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '12px' }}>
                    Add the streams available for this class
                  </p>
                  {formData.streams.map((stream, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={stream}
                        onChange={(e) => updateStream(index, e.target.value)}
                        placeholder={`Stream ${index + 1} (e.g., East, West, A, B)`}
                        style={{ flex: 1 }}
                      />
                      {formData.streams.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => removeStreamField(index)}
                          style={{ padding: '10px' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addStreamField}
                    style={{ marginTop: '8px' }}
                  >
                    <Plus size={16} />
                    Add Another Stream
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                <Check size={18} />
                {loading ? 'Saving...' : selectedClass ? 'Update Class' : createMode === 'multiple' ? 'Create Classes' : 'Create Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showStreamModal && selectedClass && (
        <StreamsView
          classItem={selectedClass}
          refreshKey={streamRefreshKey}
          onClose={() => setShowStreamModal(false)}
          onAssignTeacher={assignTeacher}
        />
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Teacher to {selectedStream?.name}</h3>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Select a teacher:</label>
              {teachers.map(teacher => (
                <label key={teacher.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="teacher"
                    value={teacher.id}
                    checked={String(selectedTeacher) === String(teacher.id)}
                    onChange={(e) => setSelectedTeacher(String(e.target.value))}
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>{teacher.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
                      {teacher.class_assigned ? `Currently teaching: ${teacher.class_assigned}` : 'Not assigned to any class'}
                      {teacher.class_teacher_assigned ? ` | Class Teacher: ${teacher.class_teacher_assigned}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!selectedTeacher}
              onClick={handleAssignTeacher}
            >
              <Check size={18} />
              Assign Teacher
            </button>
          </div>
        </div>
      )}

      {showStudentsModal && selectedClassForStudents && (
        <ClassStudentsView
          classItem={selectedClassForStudents}
          data={classStudentsData}
          onNavigateWithClassFilter={onNavigateWithClassFilter}
          onClose={() => {
            setShowStudentsModal(false);
            setSelectedClassForStudents(null);
          }}
        />
      )}
    </div>
  );
}

function StreamsView({ classItem, refreshKey, onClose, onAssignTeacher }) {
  const [streams, setStreams] = useState([]);
  const [assignedTeachersMap, setAssignedTeachersMap] = useState({});

  useEffect(() => {
    loadStreams();
  }, [classItem?.id, refreshKey]);

  const loadStreams = async () => {
    const [streamsResponse, teachersResponse] = await Promise.all([
      supabase
        .from('streams')
        .select('*')
        .eq('class_id', classItem.id),
      supabase
        .from('teachers')
        .select('*')
        .eq('approved', true)
    ]);

    const streamsData = streamsResponse.data || [];
    const teachersData = teachersResponse.data || [];

    setStreams(streamsData);

    const teacherMap = {};
    streamsData.forEach((stream) => {
      const streamClassName = `${classItem.name} ${stream.name}`.trim();

      const matchedTeacher =
        teachersData.find((teacher) => classMatches(teacher.class_teacher_assigned || '', streamClassName)) ||
        teachersData.find((teacher) => {
          const explicitValue = `${teacher.class_teacher_assigned || ''}`.trim();
          if (explicitValue) return false;

          return parseAssignedClasses(teacher.class_assigned).some((assignedClass) =>
            classMatches(assignedClass, streamClassName)
          );
        });

      teacherMap[stream.id] = matchedTeacher ? matchedTeacher.name : null;
    });

    setAssignedTeachersMap(teacherMap);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{classItem.name} - Streams</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {streams.map(stream => (
            <div key={stream.id} style={{
              padding: '16px',
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {stream.name.toUpperCase()} STREAM
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-gray)' }}>
                    Teacher: {assignedTeachersMap[stream.id] || 'Not Assigned'}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => onAssignTeacher(stream)}
                >
                  <Users size={16} />
                  {assignedTeachersMap[stream.id] ? 'Change Teacher' : 'Assign Teacher'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassStudentsView({ classItem, data, onClose, onNavigateWithClassFilter }) {
  const { loading, students, stats } = data;

  const goToPageWithClass = (targetTab) => {
    if (onNavigateWithClassFilter) {
      onNavigateWithClassFilter(targetTab, classItem.name);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
        <div className="modal-header">
          <h3 className="modal-title">{classItem.name} - Students & Summary</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>Loading class data...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => goToPageWithClass('attendance')}>
                Attendance page filtered to this class
              </button>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => goToPageWithClass('sms')}>
                SMS page filtered to this class
              </button>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => goToPageWithClass('reports')}>
                Reports page filtered to this class
              </button>
            </div>

            <div className="stats-grid" style={{ marginBottom: '16px' }}>
              <div className="stat-card"><div className="stat-info"><h3>{stats.totalStudents}</h3><p>Total Students</p></div></div>
              <div className="stat-card"><div className="stat-info"><h3>{stats.presentToday}</h3><p>Present Today</p></div></div>
              <div className="stat-card"><div className="stat-info"><h3>{stats.absentToday}</h3><p>Absent Today</p></div></div>
              <div className="stat-card"><div className="stat-info"><h3>{stats.lateToday}</h3><p>Late Today</p></div></div>
              <div className="stat-card"><div className="stat-info"><h3>{stats.attendanceRate}%</h3><p>Attendance Rate</p></div></div>
            </div>

            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Admission No</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Parent Name</th>
                    <th>Parent Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '24px' }}>
                        No students found for this class.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id}>
                        <td>{student.displayAdmissionNo}</td>
                        <td style={{ fontWeight: '600' }}>{student.displayName}</td>
                        <td>{student.displayClass}</td>
                        <td>{student.parent_name || '-'}</td>
                        <td>{student.parent_phone || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
