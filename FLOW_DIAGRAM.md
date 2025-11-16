# Complete Application Portal Flow Diagram

## User Journey - Complete End-to-End Flow

```
START
  │
  ├─► HOME PAGE (/)
  │   ├─ Shows all schemes in grid
  │   ├─ Scheme name, company, location, dates
  │   └─ Each scheme card clickable
  │
  ├─► SCHEME DETAIL (/schemes/[id])
  │   ├─ Left (2/3): Scheme info, application dates, plot counts
  │   ├─ Right (1/3 sticky): Related documents
  │   ├─ Status badge (Open/Closed)
  │   └─ "Apply Now" button → Shows OTP form inline
  │
  ├─► OTP VERIFICATION (inline component)
  │   ├─ Step 0: Mobile number input + auto-selected scheme name (read-only)
  │   ├─ Step 1: OTP verification (retryable, buttons re-enable on error)
  │   └─ Step 3: Auto-redirect to application form
  │
  ├─► APPLICATION FORM (3 steps)
  │   ├─ Step 1 (Personal): Name, DOB, ID, addresses, pincode
  │   ├─ Step 2 (Payment): Income, mode, amount, fee breakdown, file upload
  │   ├─ Step 3 (Refund): Bank details (IFSC, account, holder name)
  │   ├─ Progress bar showing completion
  │   └─ Submit button on final step
  │
  ├─► APPLICATION CREATED ✓
  │   ├─ Database: Atomic transaction, application_number generated
  │   ├─ S3 Upload: File uploaded to applications/{app_number}/payment_proof_{timestamp}.{ext}
  │   ├─ Display: Success notification with app number
  │   │           "Application submitted successfully! Your application number is {number}"
  │   ├─ Query Params: Redirect with ?mobile={mobile}&appNum={app_number}
  │   └─ Timer: Auto-redirect after 2.5 seconds
  │
  ├─► APPLICATION LOOKUP (/application-lookup)
  │   ├─ Mobile number input: Auto-filled from query param (10 digits)
  │   ├─ Application number input: Auto-filled from query param
  │   ├─ Validation: Both fields required, mobile must be 10 digits
  │   ├─ "Access Application" button
  │   └─ Error message: "Application not found with the provided details"
  │
  ├─► APPLICATION DETAILS (/application/[id])
  │   ├─ Header: App number + Application status
  │   ├─ Personal Info Card: Name, mobile, DOB, email
  │   ├─ Scheme Info Card: Scheme name, plot category, income, submission date
  │   ├─ Payment Info Card: Mode, status (color-coded), fee breakdown
  │   ├─ Address Info Card: Permanent & postal addresses with pincodes
  │   ├─ "Download Application PDF" button
  │   └─ "Back to Lookup" link
  │
  ├─► PDF DOWNLOAD
  │   ├─ Generate presigned S3 URL (1-hour expiration)
  │   ├─ Open in new browser tab
  │   ├─ User can download or view PDF
  │   └─ Return to details page
  │
  └─► END
```

## TRPC Router Organization

### api.scheme (Scheme Router)
```
├─ getAll() [QUERY]
│  └─ Returns: Array of all schemes
│
└─ getById(id) [QUERY]
   └─ Returns: Scheme with scheme_schemefiles relation
```

### api.otp (OTP Router)
```
├─ generate(mobile, schemeId) [MUTATION]
│  └─ Generates OTP and sends via SMS
│
└─ verify(mobile, otp, schemeId) [MUTATION]
   └─ Verifies OTP and returns session token
```

### api.application (Application Router)
```
├─ create(applicationData, schemeId) [MUTATION]
│  ├─ Input: Personal, payment, refund, scheme info
│  ├─ Process: Atomic transaction
│  └─ Returns: Created application with application_number
│
├─ uploadPaymentProof(appId, file) [MUTATION]
│  ├─ Input: Application ID, base64 file, MIME type
│  ├─ Process: Validate, upload to S3
│  └─ Returns: S3 URL
│
├─ getByMobileAndNumber(mobile, appNumber) [MUTATION]
│  ├─ Input: Mobile number (10 digits), application number
│  ├─ Process: Lookup in database
│  └─ Returns: Application with scheme relation
│
├─ getById(id) [QUERY]
│  ├─ Input: Application ID
│  ├─ Process: Fetch from database
│  └─ Returns: Application with scheme relation
│
└─ downloadPdf(id) [MUTATION]
   ├─ Input: Application ID
   ├─ Process: Get S3 presigned URL
   └─ Returns: { downloadUrl, filename }
```

## Component Hierarchy

```
app/ (Layout)
├─ page.tsx (Home)
│  └─ SchemesList
│     └─ Grid of scheme cards with links
│
├─ schemes/[id]/
│  ├─ page.tsx (Server component)
│  │  └─ SchemeDetail
│  │     ├─ Scheme info display with dates
│  │     ├─ Documents list (scheme_schemefiles)
│  │     ├─ "Apply Now" button → Shows OTP form
│  │     ├─ Scheme pre-selected in OTP (schemeId, schemeName props)
│  │     └─ OTP → ApplicationForm → Success → Lookup
│  │
│  └─ OTP (with schemeId pre-filled)
│     └─ On verify: Redirect to application form on same page
│
├─ application-lookup/
│  └─ page.tsx
│     └─ ApplicationLookup
│        ├─ Mobile number input (auto-filled from ?mobile param)
│        ├─ App number input (auto-filled from ?appNum param)
│        ├─ Validation: 10-digit mobile, non-empty app number
│        ├─ useEffect: Extract & populate query params on load
│        └─ Call getByMobileAndNumber → Redirect to /application/[id]
│
└─ application/[id]/
   └─ page.tsx (Server component)
      ├─ Fetch application by ID
      └─ ApplicationDetails
         ├─ Personal info card
         ├─ Scheme info card
         ├─ Payment info card
         ├─ Address info card
         └─ Download PDF button
```

## Data Flow - File Upload & Lookup

```
1. APPLICATION FORM (Client)
   ├─ User selects file
   ├─ Store in memory: { name, size, file }
   ├─ Validate: Type (PDF, JPEG, PNG) + Size (max 5MB)
   └─ Show file preview

2. FORM SUBMISSION (Client)
   ├─ Validate all form data
   ├─ Call createApplication mutation
   └─ Wait for application_number response

3. CREATE APPLICATION (Server)
   ├─ Validate all inputs with Zod
   ├─ Start transaction
   ├─ Insert into scheme_application
   ├─ Generate application_number
   ├─ Commit transaction
   └─ Return application object

4. UPLOAD FILE (Client)
   ├─ Receive application_number
   ├─ Convert file to base64
   ├─ Call uploadPaymentProof mutation
   ├─ Pass: applicationId, filename, fileBuffer, mimeType
   └─ Wait for S3 URL

5. UPLOAD TO S3 (Server)
   ├─ Validate MIME type
   ├─ Decode base64 to buffer
   ├─ Validate file size (max 5MB)
   ├─ Generate S3 key: applications/{app_number}/payment_proof_{timestamp}.{ext}
   ├─ Upload to S3 bucket
   └─ Return S3 URL

6. SUCCESS & REDIRECT (Client)
   ├─ Show notification: "Application submitted successfully! Your application number is {number}"
   ├─ Generate redirect URL with query params
   │  └─ URL: /application-lookup?mobile={mobile}&appNum={app_number}
   ├─ Wait 2.5 seconds
   └─ Redirect to lookup page

7. LOOKUP PAGE LOADS (Client)
   ├─ useEffect extracts query parameters
   ├─ Auto-fill mobile number field
   ├─ Auto-fill application number field
   ├─ User can verify and access application
   └─ No manual re-entry needed

8. LOOKUP VERIFICATION (Client)
   ├─ User clicks "Access Application"
   ├─ Call getByMobileAndNumber mutation
   ├─ Validate mobile + application number match
   └─ Redirect to /application/{id}

9. DOWNLOAD PDF (Client)
   ├─ User clicks "Download Application PDF"
   ├─ Call downloadPdf mutation
   ├─ Server returns presigned S3 URL
   ├─ Open URL in new tab
   └─ Browser downloads or opens PDF
```

## Database Schema - Key Tables

### scheme_scheme
```sql
id INT PRIMARY KEY
name VARCHAR(200)
company VARCHAR(200)
address TEXT
phone VARCHAR(20)
application_open_date TIMESTAMP
application_close_date TIMESTAMP
lig_plot_count INT
ews_plot_count INT
reserved_rate DECIMAL
next_application_number INT (auto-increment)
... (other fields)
```

### scheme_application
```sql
id INT PRIMARY KEY
mobile_number VARCHAR(10) -- Used for lookup
applicant_name VARCHAR(200)
father_or_husband_name VARCHAR(200)
dob DATE
email VARCHAR(200)
id_type VARCHAR(20)
id_number VARCHAR(20)
pan_number VARCHAR(10)
permanent_address TEXT
permanent_address_pincode VARCHAR(6)
postal_address TEXT
postal_address_pincode VARCHAR(6)
annual_income VARCHAR(50)
plot_category VARCHAR(10)
registration_fees DECIMAL
processing_fees DECIMAL
total_payable_amount DECIMAL
payment_mode VARCHAR(50)
dd_id_or_transaction_id VARCHAR(50)
dd_date_or_transaction_date DATE
dd_amount DECIMAL
payee_account_holder_name VARCHAR(200)
payee_bank_name VARCHAR(200)
payment_proof VARCHAR(500) -- S3 URL
payment_status VARCHAR(20)
application_number INT UNIQUE -- Real number from DB
application_status VARCHAR(20)
application_submission_date TIMESTAMP
scheme_id INT FOREIGN KEY
created_at TIMESTAMP
updated_at TIMESTAMP
```

### scheme_schemefiles
```sql
id INT PRIMARY KEY
name VARCHAR(500)
file_choice VARCHAR(100)
file LONGBLOB or URL
scheme_id INT FOREIGN KEY
```

## AWS S3 File Organization

```
scheme-apps-bucket/
└─ applications/
   ├─ 1001/
   │  └─ payment_proof_1703001234567.pdf
   ├─ 1002/
   │  ├─ payment_proof_1703001234568.jpg
   │  └─ payment_proof_1703001234569.pdf
   ├─ 1003/
   │  └─ payment_proof_1703001234570.png
   └─ ... (one folder per application)
```

**Key Pattern:** `applications/{applicationNumber}/payment_proof_{timestamp}.{extension}`

## Error Handling

### OTP Verification
- Invalid OTP → Show error message, keep on verify screen
- Expired OTP → Show error message, allow retry
- Network error → Show error, keep state
- All buttons remain enabled for retry

### Application Form
- Validation error on step → Show which field is invalid
- File too large → Show file size limit message
- Invalid file type → Show allowed types
- Network error → Show error, allow retry

### Application Lookup
- Invalid mobile format → Show validation error
- Application not found → "Application not found with the provided details"
- Network error → Show error message
- Query params auto-fill fields

### File Upload
- S3 not configured → Fallback to filename storage
- Upload timeout → Show error, allow manual retry
- Permission denied → Show error message

## Security Features

1. **OTP Verification** ✓
   - Required before application submission
   - Time-limited tokens (backend implementation)
   - Mobile number validation

2. **Application Access** ✓
   - Requires mobile number + application number
   - Both must match existing record
   - Public access (anyone with correct credentials)

3. **File Upload** ✓
   - Type validation (PDF, JPEG, PNG only)
   - Size validation (max 5MB)
   - MIME type verification
   - Server-side validation before S3 upload

4. **AWS S3** ✓
   - IAM user with restricted permissions
   - Presigned URLs for temporary access (1 hour)
   - Files organized by application number
   - Validated MIME types

5. **Database** ✓
   - Atomic transactions for application creation
   - Input validation with Zod
   - Foreign key constraints
   - Application number uniqueness

## Performance Optimizations

1. **Server-side Rendering (SSR)**
   - Scheme list fetched on server
   - Scheme detail fetched on server
   - Data hydrated to client via HydrateClient

2. **Database Queries**
   - Include relations to avoid N+1
   - Indexed fields: mobile_number, application_number
   - Connection pooling

3. **File Upload**
   - Validate on client before sending
   - Base64 encoding for transfer
   - Async upload after DB commit
   - Parallel processing

4. **S3 Access**
   - Presigned URLs (no direct access keys)
   - Temporary credentials (1 hour)
   - Regional endpoint for faster access
   - Lazy loading of files

## Testing Checklist

```
□ Scheme Listing
  □ Home page displays all schemes
  □ Scheme count matches database
  □ Scheme information displays correctly
  □ Links to scheme details work

□ OTP Verification
  □ OTP generation sends successfully
  □ OTP verification validates correctly
  □ Invalid OTP shows error, allows retry
  □ Expired OTP handled gracefully
  □ Button states update correctly

□ Application Form
  □ Step 1: Personal info validates
  □ Step 2: File upload accepts valid files
  □ Step 2: File validation rejects invalid files
  □ Step 3: Refund info validates
  □ Form navigation works (back/next)
  □ Error messages display correctly

□ Application Submission
  □ Application created in database
  □ application_number generated correctly
  □ File uploaded to S3 with correct key
  □ Success notification shows app number
  □ Auto-redirect to lookup with query params works

□ Application Lookup
  □ Mobile number auto-filled from query param
  □ Application number auto-filled from query param
  □ Form validates mobile number format
  □ Form validates app number input
  □ Lookup finds existing applications
  □ Lookup returns "not found" for invalid input
  □ Redirect to details page works

□ Application Details
  □ All information displays correctly
  □ Payment status color-coded
  □ Dates formatted correctly
  □ Back button navigates to lookup
  □ Information loads correctly from database

□ PDF Download
  □ Download button generates URL
  □ PDF opens/downloads in browser
  □ PDF filename correct
  □ Presigned URL expires after 1 hour
  □ Invalid app ID shows error

□ Responsive Design
  □ Mobile (375px) layout works
  □ Tablet (768px) layout works
  □ Desktop (1024px) layout works
  □ Touch interactions work on mobile

□ Error States
  □ Database errors handled gracefully
  □ Network errors show messages
  □ S3 errors handled
  □ User can recover from errors
  □ Error messages are user-friendly
```

---

**Last Updated:** November 16, 2025 - Implementation Complete
**Status:** Ready for End-to-End Testing

## Key Implementation Highlights

✅ **Complete User Journey:** Browse → Select Scheme → Verify OTP → Fill Form → Submit → View Success with App Number → Redirect to Lookup → Auto-fill Fields → Verify → View Details → Download PDF

✅ **Smart Redirect Flow:** Application submission redirects to lookup page with query parameters containing mobile number and application number

✅ **Auto-fill Optimization:** Application lookup page uses useEffect to extract and auto-populate fields from URL query parameters

✅ **Secure Access:** Dual verification (mobile + application number) required to access application details

✅ **Real Application Numbers:** All S3 files organized using real database-generated application numbers

✅ **Zero Type Errors:** Full TypeScript type safety across all components and TRPC routers

✅ **AWS S3 Integration:** Files uploaded with real application numbers and presigned URLs for download

✅ **Responsive Design:** Mobile-first approach with Tailwind CSS responsive classes

✅ **Error Recovery:** All error states allow users to retry operations without losing progress
