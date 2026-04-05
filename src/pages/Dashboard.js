import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { matchesAnyAssignedClass, parseAssignedClasses } from '../utils/classAssignments';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0
  });
  const [teachers, setTeachers] = useState([]);
  const [teacherClassSummary, setTeacherClassSummary] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [studentsResult, attendanceResult, teachersResult] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('attendance').select('*').eq('attendance_date', today),
        supabase.from('teachers').select('*').order('name')
      ]);

      const assignedClasses = parseAssignedClasses(user.class_assigned);
      const allStudents = (studentsResult.data || []).map((student) => ({
        ...student,
        displayClass: student.class_name || student.class || ''
      }));
      const allAttendance = attendanceResult.data || [];

      const students = user.role === 'admin'
        ? allStudents
        : allStudents.filter((student) => matchesAnyAssignedClass(student.displayClass, assignedClasses));

      const attendance = user.role === 'admin'
        ? allAttendance
        : allAttendance.filter((record) => matchesAnyAssignedClass(record.class_name || '', assignedClasses));

      const allTeachers = teachersResult.data || [];
      setTeachers(allTeachers);

      if (user.role !== 'admin') {
        const classSummary = assignedClasses.map((className) => ({
          className,
          studentCount: allStudents.filter((student) => matchesAnyAssignedClass(student.displayClass, [className])).length
        }));
        setTeacherClassSummary(classSummary);
      }

      const present = attendance?.filter(a => a.status === 'present').length || 0;
      const absent = attendance?.filter(a => a.status === 'absent').length || 0;
      const late = attendance?.filter(a => a.status === 'late').length || 0;
      const total = students?.length || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({
        totalStudents: total,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        attendanceRate: rate
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
        Welcome back, {user.name}!
      </h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <UserCheck size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.presentToday}</h3>
            <p>Present Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <UserX size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.absentToday}</h3>
            <p>Absent Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.lateToday}</h3>
            <p>Late Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <TrendingUp size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.attendanceRate}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
      </div>

      {user.role === 'admin' && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Teachers List</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>{teachers.length} total</span>
          </div>

          {teachers.length === 0 ? (
            <p style={{ color: 'var(--text-gray)', margin: 0 }}>No teachers found.</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{teacher.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-gray)' }}>
                      {teacher.staff_id} • {teacher.role === 'admin' ? 'Administrator' : 'Teacher'}
                      {teacher.class_teacher_assigned ? ` • Class Teacher: ${teacher.class_teacher_assigned}` : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: teacher.approved ? '#dcfce7' : '#fef3c7',
                      color: teacher.approved ? '#166534' : '#92400e',
                      fontWeight: '600'
                    }}
                  >
                    {teacher.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user.role !== 'admin' && teacherClassSummary.length > 0 && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
            Your Assigned Classes
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {teacherClassSummary.map((item) => (
              <div key={item.className} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <span style={{ fontWeight: '600' }}>{item.className}</span>
                <span style={{ color: 'var(--text-gray)' }}>{item.studentCount} students</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.class_teacher_assigned && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          marginTop: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
            Your Class Teacher Stream: {user.class_teacher_assigned}
          </h3>
          <p style={{ color: 'var(--text-gray)' }}>
            You are the class teacher for {user.class_teacher_assigned}.
          </p>
        </div>
      )}
    </div>
  );
}
