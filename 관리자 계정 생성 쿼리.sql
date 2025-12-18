-- users 테이블에 관리자 계정 INSERT
-- node -e "console.log(require('bcrypt').hashSync('admin1234', 10))"
UPDATE users
SET
  password_hash = '$2b$10$TydA0UaMiyJcrWhNWBoVweJdIw4O9yfTFWtzBcNJnWqOHZNOzx36m',
  role = 'admin',
  is_active = 1
WHERE username = 'admin';

--staff에도 관리자 등록하고 싶을 때
INSERT INTO staff (name, role, is_active)
SELECT '이대훈', '관리자', 1
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE name = '이대훈'
);
