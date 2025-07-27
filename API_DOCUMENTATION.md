# ThreadedTreasure API Documentation

## Overview
This is a comprehensive CRUD API for the ThreadedTreasure clothing store built with Node.js, Express, and MySQL.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns API status and timestamp.

---

## Users API

### Create User (Register)
```
POST /api/users/register
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "address": "123 Main St, City, State",
  "role": "customer"
}
```

### Get All Users (Admin Only)
```
GET /api/users?page=1&limit=10
```

### Get User by ID (Admin Only)
```
GET /api/users/:id
```

### Update User (Admin Only)
```
PUT /api/users/:id
```
**Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+1234567890",
  "address": "Updated Address",
  "role": "admin"
}
```

### Delete User (Admin Only)
```
DELETE /api/users/:id
```

### Search Users (Admin Only)
```
GET /api/users/search?q=john&page=1&limit=10
```

### Get Current User Profile
```
GET /api/users/profile
```

### Update Current User Profile
```
PUT /api/users/profile
```

---

## Products API

### Get All Products
```
GET /api/products?page=1&limit=10&category_id=1
```

### Get Product by ID
```
GET /api/products/:id
```

### Create Product (Admin Only)
```
POST /api/products
Content-Type: multipart/form-data
```
**Form Data:**
- name: Product Name
- description: Product Description
- price: 29.99
- category_id: 1
- stock_quantity: 100
- sku: PROD-001
- image: [file upload]
- is_active: 1

### Update Product (Admin Only)
```
PUT /api/products/:id
Content-Type: multipart/form-data
```
**Form Data:** Same as create

### Delete Product (Admin Only)
```
DELETE /api/products/:id
```

### Search Products
```
GET /api/products/search?q=shirt&page=1&limit=10
```

---

## Inventory API

### Get Product Inventory Details (Admin Only)
```
GET /api/inventory/products/:id
```

### Update Product Inventory (Admin Only)
```
PUT /api/inventory/products/:id
```
**Body:**
```json
{
  "quantity": 50,
  "size": "M",
  "color": "Blue"
}
```

### Update Specific Inventory Item (Admin Only)
```
PUT /api/inventory/items/:id
```
**Body:**
```json
{
  "quantity": 25
}
```

### Get Low Stock Products (Admin Only)
```
GET /api/inventory/low-stock?threshold=10
```

### Get Inventory Reports (Admin Only)
```
GET /api/inventory/reports
```

---

## Categories API

### Get All Categories
```
GET /api/categories
```

### Get Category by ID
```
GET /api/categories/:id
```

### Get Categories with Product Count
```
GET /api/categories/with-count
```

### Create Category (Admin Only)
```
POST /api/categories
Content-Type: multipart/form-data
```
**Form Data:**
- name: Category Name
- description: Category Description
- image: [file upload]

### Update Category (Admin Only)
```
PUT /api/categories/:id
Content-Type: multipart/form-data
```
**Form Data:** Same as create

### Delete Category (Admin Only)
```
DELETE /api/categories/:id
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (in development mode)"
}
```

---

## File Upload

### Supported File Types
- JPG, JPEG, PNG, GIF, WEBP

### Maximum File Size
- 5MB (configurable via .env)

### Upload Paths
- Products: `/uploads/products/`
- Categories: `/uploads/categories/`

---

## Error Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

---

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your database and update `.env` file

3. Run the server:
```bash
npm run dev
```

4. Test the API:
```bash
curl http://localhost:3000/api/health
```
