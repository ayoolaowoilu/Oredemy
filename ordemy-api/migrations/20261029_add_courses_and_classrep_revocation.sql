CREATE TABLE department_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NOT NULL,
    department_id INT NOT NULL,
    academic_session VARCHAR(9) NOT NULL,
    level SMALLINT UNSIGNED NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    units TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_department_course_session_level (department_id, academic_session, level, course_code),
    CONSTRAINT fk_department_courses_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_department_courses_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

ALTER TABLE class_rep_requests
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'revoked')
    NOT NULL DEFAULT 'pending';
