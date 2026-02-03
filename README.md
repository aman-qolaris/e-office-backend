# Maharashtra Mandal e-Office System

A production-ready monolithic backend for a government-style office management system. This system handles digital file movement, hierarchical approvals, and secure document storage.

## 📂 Repository Folder Structure

```text
e-office-system/
├── server.js                # Entry point: Database & MinIO initialization
├── src/
│   ├── app.js               # Express application setup & global middlewares
│   ├── config/              # Central configuration (DB, MinIO, Constants)
│   ├── database/
│   │   ├── models/          # Sequelize models (User, File, Department, etc.)
│   │   └── seeders/         # Initial data for Admin and Departments
│   ├── middlewares/         # Auth (JWT), RBAC, and File Upload logic
│   ├── modules/             # Feature-based modular architecture
│   │   ├── auth/            # Login, Security PIN management
│   │   ├── e-file/          # File creation, Inbox, Outbox, and Search
│   │   ├── users/           # User management and Department assignments
│   │   └── workflow/        # Hierarchical movement & approval logic
│   ├── routes/              # Main router mounting all modules
│   └── utils/               # Global error handling (AppError)
└── package.json             # Project dependencies and scripts
```
