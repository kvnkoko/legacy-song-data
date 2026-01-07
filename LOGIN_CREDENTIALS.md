# Default Login Credentials

After running `npm run db:seed`, these users are created:

## Admin Account
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** Admin (full access)

## A&R Account
- **Email:** `ar@example.com`
- **Password:** `ar123`
- **Role:** A&R

## YouTube Team Account
- **Email:** `youtube@example.com`
- **Password:** `platform123`
- **Role:** Platform YouTube Team

---

## ⚠️ Security Note

**Change these passwords immediately in production!**

You can:
1. Log in as admin
2. Go to `/admin` 
3. Click "Edit" on any user
4. Change their password

Or create new users with secure passwords through the Admin panel.

## Creating New Users

1. Log in as Admin (`admin@example.com` / `admin123`)
2. Navigate to `/admin`
3. Click "Add User"
4. Fill in the form:
   - Email (required)
   - Name (optional)
   - Password (minimum 6 characters)
   - Role (select from dropdown)
   - Employee ID & Team (for internal roles)

## User Management Features

- ✅ Create new users
- ✅ Edit user information
- ✅ Change passwords
- ✅ Update roles
- ✅ Delete users (except your own account)
- ✅ View all users with role counts
- ✅ Manage employee records for internal staff

All user management is available at `/admin` (Admin and Manager roles only).






