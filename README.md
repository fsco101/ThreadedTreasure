# ThreadedTreasure - Admin Dashboard & User Management System

A comprehensive e-commerce admin dashboard with user management capabilities built with Node.js, Express, MySQL, and modern web technologies.

## Features

### User Management
- **User Registration & Login** - Secure authentication with JWT tokens
- **Admin Dashboard** - Complete administrative interface
- **User Management** - CRUD operations for user accounts
- **Role-based Access Control** - Admin and regular user roles
- **Account Status Management** - Activate/deactivate user accounts
- **Password Security** - Bcrypt hashing with strength validation
- **DataTables Integration** - Advanced user listing with search and filtering

### Product & Category Management
- **Product Creation** - Advanced product creation with image uploads
- **Category Management** - SEO-friendly category creation
- **File Upload** - Dropzone.js integration for image uploads
- **Rich Text Editor** - Advanced content editing capabilities

### Security Features
- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive form validation
- **CORS Protection** - Cross-origin resource sharing security
- **Helmet.js** - Security headers and protection
- **Password Hashing** - Bcrypt password encryption

### UI/UX Features
- **Bootstrap 5** - Modern and responsive design
- **Font Awesome** - Professional iconography
- **DataTables** - Advanced data management
- **jQuery AJAX** - Smooth user interactions
- **Responsive Design** - Mobile-first approach
- **Component Architecture** - Reusable header and footer components

## Project Structure

```
ThreadedTreasure/
├── server.js                    # Main server file
├── package.json                 # Project dependencies
├── .env                         # Environment configuration
├── threadedtreasure.sql         # Database schema
├── database/
│   └── users.sql               # User table schema with procedures
├── config/
│   └── database.js             # Database configuration
├── routes/
│   ├── authRoutes.js           # Authentication routes
│   ├── userRoutes.js           # User management routes
│   ├── productRoutes.js        # Product management routes
│   └── categoryRoutes.js       # Category management routes
├── middleware/
│   └── upload.js               # File upload middleware
├── js/
│   ├── user-management.js      # User management functionality
│   ├── add-product.js          # Product creation functionality
│   └── add-category.js         # Category creation functionality
├── public/
│   ├── admin-dashboard.html    # Main admin dashboard
│   ├── user-management.html    # User management interface
│   ├── add-product.html        # Product creation form
│   ├── add-category.html       # Category creation form
│   ├── register-new.html       # User registration form
│   ├── login-new.html          # User login form
│   ├── admin-login.html        # Admin login portal
│   ├── admin-header.html       # Reusable admin header
│   └── footer.html             # Reusable footer
└── uploads/                    # File upload directory
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Database Setup
1. Create a MySQL database named `threadedtreasure`
2. Import the database schema:
   ```bash
   mysql -u root -p threadedtreasure < threadedtreasure.sql
   mysql -u root -p threadedtreasure < database/users.sql
   ```

### Step 3: Environment Configuration
1. Copy `.env.example` to `.env` (if exists) or update the existing `.env` file
2. Update database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=threadedtreasure
   ```
3. Update JWT secret:
   ```
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

### Step 4: Create Upload Directory
```bash
mkdir uploads
```

### Step 5: Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/check-email` - Check email availability

### User Management (Admin Only)
- `GET /api/users` - List all users
- `GET /api/users/stats` - Get user statistics
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/status` - Update user status
- `DELETE /api/users/:id` - Delete user

### File Upload
- `POST /api/upload` - Single file upload
- `POST /api/upload-single` - Single file upload (alternative)

### Profile
- `GET /api/profile` - Get user profile (authenticated)

## Frontend Routes

### Public Routes
- `/` - User login page
- `/register` - User registration page
- `/admin` - Admin login portal

### Protected Routes (Admin Only)
- `/dashboard` - Admin dashboard
- `/users` - User management interface
- `/products/add` - Add product form
- `/categories/add` - Add category form

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User full name
- `email` - User email (unique)
- `phone` - User phone number
- `address` - User address
- `password` - Hashed password
- `role` - User role (user/admin)
- `is_active` - Account status
- `newsletter_subscribed` - Newsletter subscription
- `email_verified` - Email verification status
- `last_login` - Last login timestamp
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Additional Tables
- `user_activity_log` - User activity tracking
- `user_sessions` - Active session management
- `user_preferences` - User preferences
- `user_addresses` - Multiple address management

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (Admin/User)
- Password hashing with bcrypt
- Session management with automatic expiry

### Input Validation
- Email format validation
- Password strength requirements
- File type and size validation
- SQL injection prevention

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Rate limiting for API endpoints
- XSS protection

## Usage Examples

### User Registration
```javascript
// Register new user
fetch('/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123',
        phone: '+1234567890',
        address: '123 Main St'
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

### User Login
```javascript
// Login user
fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'john@example.com',
        password: 'SecurePassword123'
    })
})
.then(response => response.json())
.then(data => {
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        // Redirect based on role
        if (data.user.role === 'admin') {
            window.location.href = '/dashboard';
        } else {
            window.location.href = '/user-dashboard';
        }
    }
});
```

### Admin - Get User Statistics
```javascript
// Get user statistics (admin only)
fetch('/api/users/stats', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
})
.then(response => response.json())
.then(stats => console.log(stats));
```

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow consistent indentation (2 spaces)
- Use meaningful variable names
- Add comments for complex logic

### Error Handling
- Always use try-catch blocks for async operations
- Return appropriate HTTP status codes
- Provide meaningful error messages
- Log errors for debugging

### Security Best Practices
- Never commit sensitive data to version control
- Use environment variables for configuration
- Validate all user inputs
- Use HTTPS in production
- Regularly update dependencies

## Deployment

### Production Checklist
1. Update environment variables for production
2. Set `NODE_ENV=production`
3. Configure SSL certificates
4. Set up database backups
5. Configure logging
6. Set up monitoring
7. Configure reverse proxy (nginx)

### Environment Variables for Production
```
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-very-secure-jwt-secret
FRONTEND_URL=https://your-domain.com
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please contact the development team or create an issue in the repository.

---

## Recent Updates

### Version 1.0.0 (Current)
- ✅ Complete user authentication system
- ✅ Admin dashboard with user management
- ✅ Product and category management
- ✅ File upload functionality
- ✅ Security features and rate limiting
- ✅ Responsive design with Bootstrap 5
- ✅ DataTables integration for user management
- ✅ Role-based access control
- ✅ Password security with bcrypt
- ✅ JWT token authentication
- ✅ Email validation and availability checking
- ✅ User activity logging
- ✅ Session management
- ✅ Component-based architecture

### Upcoming Features
- 🔄 Email verification system
- 🔄 Password reset functionality
- 🔄 User profile management
- 🔄 Advanced product catalog
- 🔄 Order management system
- 🔄 Payment integration
- 🔄 Email notifications
- 🔄 Advanced reporting and analytics
