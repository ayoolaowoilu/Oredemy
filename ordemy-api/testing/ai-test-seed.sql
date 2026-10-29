-- TEST ONLY: creates a sample school, lecturer, students, courses and recent questions.
-- All sample accounts use password: test123. Do not run against production.
-- Apply data.sql or all migrations before running this file.

USE ordemy;

INSERT INTO schools (name, calendar_offset)
VALUES ('Oredemy AI Testing University', 0)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @school_id = LAST_INSERT_ID();

INSERT INTO faculties (name, school_id)
SELECT 'Faculty of Computing', @school_id
WHERE NOT EXISTS (
    SELECT 1 FROM faculties
    WHERE name = 'Faculty of Computing' AND school_id = @school_id
);
SET @faculty_id = (
    SELECT id FROM faculties
    WHERE name = 'Faculty of Computing' AND school_id = @school_id
    ORDER BY id LIMIT 1
);

INSERT INTO departments (name, faculty_id)
SELECT 'Computer Science', @faculty_id
WHERE NOT EXISTS (
    SELECT 1 FROM departments
    WHERE name = 'Computer Science' AND faculty_id = @faculty_id
);
SET @department_id = (
    SELECT id FROM departments
    WHERE name = 'Computer Science' AND faculty_id = @faculty_id
    ORDER BY id LIMIT 1
);

SET @year = YEAR(CURDATE());
SET @cohort_start = @year - 2;
SET @cohort_session = CONCAT(@cohort_start, '/', @cohort_start + 1);
SET @academic_session = CONCAT(@year, '/', @year + 1);
SET @course_level = (@year - @cohort_start + 1) * 100;
SET @password_hash = '$2b$10$xGiE05yJcomDdnSf0HjhO.TN3LcC9iIdPJ3GOwtZmGzgRNIwwVgE2';

INSERT INTO users
    (id, name, email, password, faculty_id, department_id, session, admission_session, role, is_verified)
VALUES
    ('a1000000-0000-4000-8000-000000000001', 'Test Adviser', 'ai-lecturer@example.test', @password_hash, @faculty_id, @department_id, @cohort_session, NULL, 'lecturer', TRUE),
    ('a1000000-0000-4000-8000-000000000002', 'Ada Test', 'ai-student1@example.test', @password_hash, @faculty_id, @department_id, @cohort_session, @cohort_session, 'student', TRUE),
    ('a1000000-0000-4000-8000-000000000003', 'Bola Test', 'ai-student2@example.test', @password_hash, @faculty_id, @department_id, @cohort_session, @cohort_session, 'student', TRUE),
    ('a1000000-0000-4000-8000-000000000004', 'Chidi Test', 'ai-student3@example.test', @password_hash, @faculty_id, @department_id, @cohort_session, @cohort_session, 'student', TRUE),
    ('a1000000-0000-4000-8000-000000000005', 'Dara Test', 'ai-student4@example.test', @password_hash, @faculty_id, @department_id, @cohort_session, @cohort_session, 'student', TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    faculty_id = VALUES(faculty_id),
    department_id = VALUES(department_id),
    session = VALUES(session),
    admission_session = VALUES(admission_session),
    role = VALUES(role),
    is_verified = VALUES(is_verified);

INSERT INTO department_courses
    (lecturer_id, department_id, academic_session, level, course_name, course_code, units)
SELECT 'a1000000-0000-4000-8000-000000000001', @department_id, @academic_session, @course_level,
       'Introduction to Programming', 'CSC 301', 3
WHERE NOT EXISTS (
    SELECT 1 FROM department_courses
    WHERE department_id = @department_id AND academic_session = @academic_session
      AND level = @course_level AND course_code = 'CSC 301'
);

INSERT INTO department_courses
    (lecturer_id, department_id, academic_session, level, course_name, course_code, units)
SELECT 'a1000000-0000-4000-8000-000000000001', @department_id, @academic_session, @course_level,
       'Data Structures', 'CSC 302', 3
WHERE NOT EXISTS (
    SELECT 1 FROM department_courses
    WHERE department_id = @department_id AND academic_session = @academic_session
      AND level = @course_level AND course_code = 'CSC 302'
);

INSERT INTO chat_conversations (id, type, student_id, lecturer_id)
VALUES
    ('a2000000-0000-4000-8000-000000000001', 'lecturer', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001'),
    ('a2000000-0000-4000-8000-000000000002', 'lecturer', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001'),
    ('a2000000-0000-4000-8000-000000000003', 'lecturer', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001'),
    ('a2000000-0000-4000-8000-000000000004', 'lecturer', 'a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001')
ON DUPLICATE KEY UPDATE
    student_id = VALUES(student_id),
    lecturer_id = VALUES(lecturer_id);

INSERT INTO class_rep_requests
    (student_id, department_id, session, message, status, reviewed_by, reviewed_at)
SELECT 'a1000000-0000-4000-8000-000000000002', @department_id, @cohort_session,
       'Seeded approved class representative for testing revocation.', 'approved',
       'a1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM class_rep_requests
    WHERE student_id = 'a1000000-0000-4000-8000-000000000002'
      AND department_id = @department_id AND session = @cohort_session
      AND status = 'approved'
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000002', 'Department', @cohort_session,
       'When will the second semester examination results be released?', 'Results', 'Second semester results'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000002'
      AND subject = 'Second semester results' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000003', 'Department', @cohort_session,
       'Please let us know when our second semester examination results will be published.', 'Results', 'Second semester results'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000003'
      AND subject = 'Second semester results' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000004', 'Department', @cohort_session,
       'Can you share an update about the release date for second semester results?', 'Results', 'Second semester results'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000004'
      AND subject = 'Second semester results' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000002', 'Department', @cohort_session,
       'How do I confirm that my course registration was submitted successfully?', 'Other', 'Course registration confirmation'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000002'
      AND subject = 'Course registration confirmation' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000003', 'Department', @cohort_session,
       'I submitted my courses but cannot tell whether registration is complete. What should I check?', 'Other', 'Course registration confirmation'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000003'
      AND subject = 'Course registration confirmation' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000004', 'Department', @cohort_session,
       'Where can I verify that all my courses were registered for this semester?', 'Other', 'Course registration confirmation'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000004'
      AND subject = 'Course registration confirmation' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000003', 'Department', @cohort_session,
       'Has the department published the timetable for the next lecture week?', 'Timetable', 'Department lecture timetable'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000003'
      AND subject = 'Department lecture timetable' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000004', 'Department', @cohort_session,
       'Where can students find the department timetable for next week?', 'Timetable', 'Department lecture timetable'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000004'
      AND subject = 'Department lecture timetable' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000005', 'Department', @cohort_session,
       'Could you tell us when the timetable for next week will be available?', 'Timetable', 'Department lecture timetable'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000005'
      AND subject = 'Department lecture timetable' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000005', 'Department', @cohort_session,
       'Is there a recommended place to get help with the programming assignment?', 'Other', 'Programming assignment support'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000005'
      AND subject = 'Programming assignment support' AND session = @cohort_session
);

INSERT INTO queries (user_id, query_for, session, query, query_type, subject)
SELECT 'a1000000-0000-4000-8000-000000000002', 'Department', @cohort_session,
       'Who should I contact for guidance on the programming assignment?', 'Other', 'Programming assignment support'
WHERE NOT EXISTS (
    SELECT 1 FROM queries WHERE user_id = 'a1000000-0000-4000-8000-000000000002'
      AND subject = 'Programming assignment support' AND session = @cohort_session
);

INSERT INTO chat_messages (conversation_id, sender_id, query_id, body)
SELECT conversations.id, questions.user_id, questions.id,
       CONCAT('Question: ', questions.subject, '\n\n', questions.query)
FROM queries AS questions
INNER JOIN chat_conversations AS conversations
    ON conversations.student_id = questions.user_id
   AND conversations.lecturer_id = 'a1000000-0000-4000-8000-000000000001'
   AND conversations.type = 'lecturer'
WHERE questions.user_id IN (
    'a1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000005'
)
AND questions.session = @cohort_session
AND questions.subject IN (
    'Second semester results',
    'Course registration confirmation',
    'Department lecture timetable',
    'Programming assignment support'
)
AND NOT EXISTS (
    SELECT 1 FROM chat_messages WHERE query_id = questions.id
);
