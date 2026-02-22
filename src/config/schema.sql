CREATE DATABASE IF NOT EXISTS publisha;
USE publisha;

-- Authors table
CREATE TABLE authors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    preferred_categories JSON,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Articles table
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    image_url VARCHAR(255),
    author_id INT NOT NULL,
    views_count INT DEFAULT 0,
    status ENUM('draft', 'published') DEFAULT 'draft',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    INDEX idx_author (author_id),
    INDEX idx_status_published (status, published_at),
    FULLTEXT idx_search (title, summary, content)
);

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article-Categories junction
CREATE TABLE article_categories (
    article_id INT,
    category_id INT,
    PRIMARY KEY (article_id, category_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Collections table
CREATE TABLE collections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    author_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    INDEX idx_author (author_id)
);

-- Collection-Articles junction
CREATE TABLE collection_articles (
    collection_id INT,
    article_id INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, article_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Likes table
CREATE TABLE likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    author_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (article_id, author_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    INDEX idx_article (article_id)
);

-- Reviews table
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    author_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    INDEX idx_article (article_id)
);

-- Views tracking table
CREATE TABLE views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    viewer_ip VARCHAR(45),
    author_id INT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
    INDEX idx_article_date (article_id, viewed_at)
);

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest in tech, software, and gadgets'),
('Programming', 'programming', 'Coding, development, and software engineering'),
('Artificial Intelligence', 'artificial-intelligence', 'AI, ML, and data science'),
('Design', 'design', 'UI/UX, graphic design, and creativity'),
('Business', 'business', 'Entrepreneurship, startups, and management'),
('Science', 'science', 'Scientific discoveries and research'),
('Health', 'health', 'Wellness, fitness, and medical news'),
('Lifestyle', 'lifestyle', 'Life, culture, and personal development');