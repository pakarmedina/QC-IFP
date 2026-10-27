# Deploy ke Netlify

Variabel lingkungan (Site configuration -> Environment variables):

- DATABASE_URL   (Neon, alamat dengan -pooler)
- DIRECT_URL     (Neon, alamat tanpa -pooler)
- ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
- APP_URL        (alamat situs Netlify, mis. https://nama-situs.netlify.app)

Netlify tidak bisa menjalankan aplikasi ini lewat drag-and-drop zip: aplikasi punya server
(API login, database), jadi harus dibangun dari repo Git (Add new site -> Import an existing project).
