
CREATE DATABASE IF NOT EXISTS ordemy;
use ordemy;


-- 1. Schools
CREATE TABLE schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    calendar_offset INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Faculties belong to schools
CREATE TABLE faculties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_faculties_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id)
        ON DELETE CASCADE
);

CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    faculty_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_departments_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE CASCADE
);

-- 4. Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    faculty_id INT NULL,
    department_id INT NULL,
    session VARCHAR(50) NULL,

    role ENUM('lecturer', 'admin', 'student')
        NOT NULL DEFAULT 'student',

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    image TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);

CREATE TABLE class_rep_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    department_id INT NOT NULL,
    session VARCHAR(50) NOT NULL,
    message VARCHAR(1000) NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(36) NULL,
    decision_note VARCHAR(1000) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_class_rep_department_session_status (department_id, session, status),
    CONSTRAINT fk_class_rep_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_rep_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_rep_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE queries(
     id INT PRIMARY KEY AUTO_INCREMENT,
     subject VARCHAR(100) NOT NULL,
     query text not null,
     query_type ENUM('Results','Facilities','Timetable','Other') DEFAULT 'Other',
     user_id VARCHAR(36) NOT NULL,
     query_for ENUM('Faculty','Department','School') DEFAULT 'Department',
     session varchar(200),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_queries_session_user (session, user_id),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
