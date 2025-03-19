1. Tạo file proxies.txt
    `host:port`
    `http://host:port` hoặc `https://host:port`
    `username:password@host:port`
    `http://username:password@host:port`
2. Cài đặt dependency
    `npm install typescript @types/node`
    `npm install tsx -D`
3. Chạy chương trình
    `npx tsx proxy-checker.ts`

4. Chỉnh sửa hàm parseProxy nếu thay đổi format
