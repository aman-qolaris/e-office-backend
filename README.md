# MMD Backend

Monolithic backend for the E-Office system.

# Folder Structure

```text
e-office-mmd/                <-- (Git Repository Root)
├── .gitignore               <-- (Global Git Ignore)
├── README.md                <-- (Project Documentation)
└── e-office-api/
    ├── package.json
    ├── .env                  # Environment variables (DB credentials, MinIO keys)
    ├── server.js             # Entry point
    └── src/
        ├── config/           # Database and MinIO configuration
        │   ├── db.config.js
        │   └── storage.config.js
        ├── constants/        # Enums (UserRoles, FileStatus, Priorities)
        ├── controllers/      # Request handlers
        │   ├── auth.controller.js
        │   ├── user.controller.js
        │   ├── file.controller.js
        │   └── admin.controller.js
        ├── dtos/                 <-- NEW: The DTO Layer
        │   ├── auth/             <-- Auth Module DTOs
        │   │   ├── register.dto.js
        │   │   └── login.dto.js
        │   ├── file/             <-- File Module DTOs
        │   │   ├── create-file.dto.js
        │   │   └── file-response.dto.js
        │   └── common/           <-- Shared DTOs (e.g., ErrorResponse)
        ├── middlewares/      # Protection layers
        │   ├── authMiddleware.js      # JWT verification
        │   ├── rbacMiddleware.js      # Role checking
        │   └── uploadMiddleware.js    # Multer configuration
        ├── models/           # Sequelize definitions
        │   ├── index.js      # Association setup
        │   ├── User.js
        │   ├── File.js
        │   ├── FileNoting.js
        │   └── AuditLog.js
        ├── routes/           # API Endpoints
        │   ├── auth.routes.js
        │   ├── file.routes.js
        │   └── ...
        ├── services/         # Business Logic (The Brains)
        │   ├── auth.service.js
        │   ├── file.service.js
        │   └── minio.service.js
        └── utils/            # Helpers
            ├── responseHandler.js     # Standardized JSON responses
            └── logger.js              # Error logging
```
