# GroundSchool AI - Test Scenarios

This document outlines the test scenarios for the GroundSchool AI application to ensure it meets all requirements specified in the PRD.

## 1. Authentication

### 1.1 User Registration
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| UR-01 | Valid registration | 1. Navigate to Sign Up screen<br>2. Enter valid email and password<br>3. Submit form | User account is created and user is navigated to Home screen | ✅ |
| UR-02 | Invalid email format | 1. Navigate to Sign Up screen<br>2. Enter invalid email format<br>3. Submit form | Form shows validation error for email field | ✅ |
| UR-03 | Password too short | 1. Navigate to Sign Up screen<br>2. Enter valid email and password less than 6 characters<br>3. Submit form | Form shows validation error for password field | ✅ |
| UR-04 | Email already in use | 1. Navigate to Sign Up screen<br>2. Enter email of existing account<br>3. Submit form | Error message indicating email is already in use | ✅ |

### 1.2 User Login
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| UL-01 | Valid login | 1. Navigate to Login screen<br>2. Enter valid credentials<br>3. Submit form | User is authenticated and navigated to Home screen | ✅ |
| UL-02 | Invalid credentials | 1. Navigate to Login screen<br>2. Enter incorrect email/password<br>3. Submit form | Error message indicating invalid credentials | ✅ |
| UL-03 | Password reset | 1. Navigate to Login screen<br>2. Click "Forgot Password"<br>3. Enter email<br>4. Submit form | Password reset email is sent to user | ✅ |

### 1.3 Session Management
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| SM-01 | Session persistence | 1. Login to app<br>2. Close app<br>3. Reopen app | User remains logged in | ✅ |
| SM-02 | Logout | 1. Login to app<br>2. Navigate to Profile screen<br>3. Click "Sign Out" | User is logged out and returned to Login screen | ✅ |

## 2. Document Management

### 2.1 Document Upload
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| DU-01 | Upload PDF | 1. Navigate to Document Upload screen<br>2. Select PDF file<br>3. Submit upload | File is uploaded to storage and appears in Document Library | ✅ |
| DU-02 | Upload image | 1. Navigate to Document Upload screen<br>2. Select image file<br>3. Submit upload | Image is uploaded to storage and appears in Document Library | ✅ |
| DU-03 | File size validation | 1. Navigate to Document Upload screen<br>2. Select file >10MB<br>3. Submit upload | Error message indicating file size limit | ✅ |
| DU-04 | File type validation | 1. Navigate to Document Upload screen<br>2. Select non-PDF/image file<br>3. Submit upload | Error message indicating invalid file type | ✅ |

### 2.2 Document Library
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| DL-01 | View documents | 1. Navigate to Document Library screen | List of user's uploaded documents is displayed | ✅ |
| DL-02 | Search documents | 1. Navigate to Document Library screen<br>2. Enter search term in search field | Documents matching search term are displayed | ✅ |
| DL-03 | Delete document | 1. Navigate to Document Library screen<br>2. Select document<br>3. Click delete button | Document is removed from library | ✅ |
| DL-04 | Preview document | 1. Navigate to Document Library screen<br>2. Click on document | Document preview is displayed | ✅ |

## 3. Quiz Generation

### 3.1 Quiz Creation
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| QC-01 | Create quiz from document | 1. Navigate to Document Library<br>2. Select document<br>3. Click "Create Quiz"<br>4. Configure quiz parameters<br>5. Submit | Quiz is generated with questions based on document content | ✅ |
| QC-02 | Create quiz from multiple documents | 1. Navigate to Document Library<br>2. Select multiple documents<br>3. Click "Create Quiz"<br>4. Configure quiz parameters<br>5. Submit | Quiz is generated with questions based on all selected documents | ✅ |
| QC-03 | Cancel quiz generation | 1. Start quiz generation<br>2. Click "Cancel" during generation | Quiz generation is cancelled | ✅ |
| QC-04 | Estimated time display | 1. Navigate to Quiz Creation screen<br>2. Select document(s) | Estimated time for quiz generation is displayed | ✅ |

### 3.2 Quiz Management
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| QM-01 | View quiz history | 1. Navigate to Quiz History screen | List of previously generated quizzes is displayed | ✅ |
| QM-02 | Delete quiz | 1. Navigate to Quiz History screen<br>2. Select quiz<br>3. Click delete button | Quiz is removed from history | ✅ |
| QM-03 | View quiz details | 1. Navigate to Quiz History screen<br>2. Click on quiz | Quiz details are displayed | ✅ |

## 4. Quiz Taking

### 4.1 Quiz Interface
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| QI-01 | Take quiz | 1. Navigate to Quiz History<br>2. Select quiz<br>3. Click "Take Quiz" | Quiz interface is displayed with first question | ✅ |
| QI-02 | Answer question | 1. Take quiz<br>2. Select answer<br>3. Click "Next" | Answer is recorded and next question is displayed | ✅ |
| QI-03 | Navigate questions | 1. Take quiz<br>2. Use navigation controls | User can navigate between questions | ✅ |

### 4.2 Quiz Results
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| QR-01 | View results | 1. Complete quiz | Results screen is displayed with score and feedback | ✅ |
| QR-02 | Review answers | 1. Complete quiz<br>2. Click "Review Answers" | List of questions with user's answers and correct answers is displayed | ✅ |
| QR-03 | Save results | 1. Complete quiz<br>2. View results<br>3. Click "Save Results" | Quiz results are saved to history | ✅ |

## 5. Analytics

### 5.1 Performance Tracking
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| PT-01 | View dashboard | 1. Navigate to Home screen | Dashboard with performance metrics is displayed | ✅ |
| PT-02 | View analytics | 1. Navigate to Analytics screen | Detailed analytics with topic breakdown is displayed | ✅ |
| PT-03 | Export analytics | 1. Navigate to Analytics screen<br>2. Click "Export CSV" | Analytics data is exported as CSV file | ✅ |

## 6. Offline Support

### 6.1 Offline Document Access
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| OD-01 | View documents offline | 1. Access Document Library while online<br>2. Go offline<br>3. Access Document Library again | Previously loaded documents are displayed with offline indicator | ✅ |
| OD-02 | Cache document for offline | 1. View document while online<br>2. Go offline<br>3. Access same document | Document is available for viewing | ✅ |

### 6.2 Offline Quiz Taking
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| OQ-01 | Take quiz offline | 1. Start quiz while online<br>2. Go offline<br>3. Complete quiz | Quiz can be completed offline | ✅ |
| OQ-02 | Save results offline | 1. Complete quiz while offline<br>2. View results | Results are saved locally with sync pending indicator | ✅ |
| OQ-03 | Sync when online | 1. Complete quiz while offline<br>2. Go online | Results are synced to server | ✅ |

## 7. Accessibility

### 7.1 Screen Reader Support
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| SR-01 | Navigation with screen reader | 1. Enable screen reader<br>2. Navigate through app | All elements are properly labeled and accessible | ✅ |
| SR-02 | Form completion with screen reader | 1. Enable screen reader<br>2. Complete forms | All form fields are properly labeled and can be completed | ✅ |

### 7.2 Visual Accessibility
| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| VA-01 | Color contrast | 1. Review all screens | All text has sufficient contrast with background | ✅ |
| VA-02 | Text scaling | 1. Increase device text size<br>2. Navigate through app | Text scales appropriately without layout issues | ✅ |

## Test Results Summary

| Category | Total Tests | Passed | Failed | Pending |
|----------|-------------|--------|--------|---------|
| Authentication | 9 | 9 | 0 | 0 |
| Document Management | 8 | 8 | 0 | 0 |
| Quiz Generation | 7 | 7 | 0 | 0 |
| Quiz Taking | 6 | 6 | 0 | 0 |
| Analytics | 3 | 3 | 0 | 0 |
| Offline Support | 5 | 5 | 0 | 0 |
| Accessibility | 4 | 4 | 0 | 0 |
| **Total** | **42** | **42** | **0** | **0** |

## Issues and Resolutions

| ID | Issue | Severity | Status | Resolution |
|----|-------|----------|--------|------------|
| IS-01 | PDF extraction fails for some file formats | Medium | Resolved | Updated PDF.js library and added additional format support |
| IS-02 | Quiz generation timeout for large documents | High | Resolved | Implemented chunking and progress tracking |
| IS-03 | Offline sync conflicts | Medium | Resolved | Added conflict resolution strategy with timestamp-based prioritization |
| IS-04 | Screen reader skips some interactive elements | High | Resolved | Added proper accessibility labels to all components |
| IS-05 | Memory leaks in document preview | Medium | Resolved | Properly cleanup resources in component unmount |
