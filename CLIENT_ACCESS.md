# Client/Artist Access Guide

## How Clients Access the Submission Form

### URL
Clients can access the submission form at:
```
http://localhost:3000/submit
```
(Or your production URL + `/submit`)

### Access Requirements
- Clients need to be logged in (they'll be redirected to sign in if not)
- They must have a `CLIENT` role in the system

### What Clients See

#### 1. **Submission Form** (`/submit`)
A beautiful multi-step wizard:

**Step 1: Artist Information**
- Artist Name (required)
- Legal Name (optional)

**Step 2: Release Details**
- Release Type: Single or Album
- Release Title (required)
- Artist's Chosen Date (optional)

**Step 3: Songs**
- Add unlimited songs
- For each song:
  - Song Name (required)
  - Performer
  - Composer
  - Band/Music Producer
  - Studio
  - Record Label
  - Genre

**Step 4: Review & Submit**
- Review all information
- Submit the release

**Features:**
- ✅ Autosave drafts (saves every 2 seconds)
- ✅ Form validation
- ✅ Beautiful animations
- ✅ Mobile-friendly
- ✅ Progress indicator

#### 2. **Status Page** (`/status/[releaseId]`)
After submission, clients can view:
- Submission status (Pending Review, Scheduled, Uploaded)
- Release information
- Songs list
- Platform status (which platforms have been requested/uploaded)

### Creating Client Accounts

**Option 1: Admin creates account**
1. Admin logs in
2. Goes to `/admin`
3. Clicks "Add User"
4. Sets role to "Client/Artist"
5. Client receives credentials

**Option 2: Client signs up with Google**
1. Client goes to `/auth/signin`
2. Clicks "Sign in with Google"
3. Account is created automatically with CLIENT role
4. Admin can later change role if needed

**Option 3: Client creates account via form**
(You can add a signup form if needed)

### Client Workflow

1. **Client receives login credentials** (from admin or via Google signup)
2. **Client logs in** at `/auth/signin`
3. **Client is redirected to** `/submit` (automatic based on role)
4. **Client fills out submission form**
5. **Client submits** → Gets redirected to `/status/[id]`
6. **Client can check status** anytime by going to `/status/[id]`

### What Clients CANNOT See

- ❌ Internal database (`/releases`, `/dashboard`, etc.)
- ❌ Other artists' submissions
- ❌ Internal notes and remarks
- ❌ Platform team portals
- ❌ Analytics and reports
- ❌ Admin panel

### Testing Client Access

1. **Create a test client account:**
   ```bash
   # As admin, go to /admin and create a user with CLIENT role
   ```

2. **Or use seeded account:**
   - If you create a client account via seed, use those credentials

3. **Test the flow:**
   - Log in as client
   - Should redirect to `/submit`
   - Fill out form
   - Submit
   - Check status page

### Customization

You can customize:
- Form fields (add/remove fields)
- Required vs optional fields
- Validation rules
- Styling and branding
- Email notifications (add later)

All in `/app/submit/page.tsx`






