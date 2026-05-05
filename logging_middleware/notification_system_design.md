# Stage 1

## Objective
Develop a RESTful API that provides real-time notifications to students about Placements, Events, and Results on campus.

---

## Key Functionalities


The key functionalities of the Notification Platform are: 
- Retrieve all notifications for a student
- Retrieve only unread notifications
- Mark a notification has been read
- Mark all notifications has been read
- Create a notification (by admin/HR)
- Delete a notification
## API Endpoints

### 1. Get All Notifications
**GET** `/api/notifications`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Placement",
      "message": "Google is hiring! Apply before 10th May.",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ]
}
```

---

### 2. Get Unread Notifications
**GET** `/api/notifications/unread`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Response (200):**
```json
{
  "success": true,
  "unreadCount": 3,
  "data": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Result",
      "message": "mid-sem results are out.",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ]
}
```

---

### 3. Mark One Notification as Read
**PATCH** `/api/notifications/:id/read`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "isRead": true
  }
}
```

---

### 4. Mark All Notifications as Read
**PATCH** `/api/notifications/read-all`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 5. Create Notification (Admin/HR only)
**POST** `/api/notifications`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "type": "Placement",
  "message": "Amazon hiring drive on 15th May",
  "targetAudience": "all"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "id": "a1b2c3d4-0000-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "Amazon hiring drive on 15th May",
    "createdAt": "2026-05-05T10:00:00Z"
  }
}
```

---

### 6. Delete a Notification (Admin only)
**DELETE** `/api/notifications/:id`

**Headers:**
```json
{
  "Authorization": "Bearer ",
  "Content-Type": "application/json"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Real-Time Notification Mechanism

### Approach: WebSockets (Socket.io)

When a student logs in, the frontend opens a WebSocket connection to the server.
When HR/admin creates a new notification, the server emits an event to all 
connected students instantly — no polling needed.

### Flow:
1. Student logs in → frontend connects to WebSocket server
2. Student joins their own room: `socket.join(studentId)`
3. Admin creates notification → server emits to all rooms
4. Frontend receives event and displays notification instantly

### WebSocket Events:

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Student connects on login |
| `join_room` | Client → Server | Student joins their room |
| `new_notification` | Server → Client | Server pushes new notification |
| `disconnect` | Client → Server | Student logs out |

### Example Server Emit:
```json
{
  "event": "new_notification",
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "Google is hiring!",
    "createdAt": "2026-05-05T10:00:00Z"
  }
}
```

---

# Stage 2 


Why use PostgreSQL?
- The notifications being monitored will have a well-defined pattern, which fits into the relational database structure
- We will be able to search based on the attributes of the notification — studentID, type of notification, read status, createdAt — SQL will provide for these queries
- We need the ability to access large data areas very quickly with indexing capability — PostgreSQL provides a robust way to create indexes
- PostgreSQL has built-in support for ensuring that all notifications are created or deleted properly through the concept of ACID (Atomicity, Consistency, Isolation, Durability).

Database Structure:
The following information is the database structure needed for this project:

Students Table:
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  rollNo VARCHAR(50) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

Notifications Table:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Placement', 'Event', 'Result')),
  message TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

Student-Notification Table:
```sql
CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId UUID REFERENCES students(id) ON DELETE CASCADE,
  notificationId UUID REFERENCES notifications(id) ON DELETE CASCADE,
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

Queries Needed to Support Stage 1 APIs:
### 1. Retrieve All Notifications for a Student:
```sql
SELECT 
  n.id,
  n.type,
  n.message,
  sn.isRead,
  n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = ''
ORDER BY n.createdAt;


### 2. Get Unread Notifications
```sql
SELECT 
  n.id,
  n.type,
  n.message,
  sn.isRead,
  n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = '' AND sn.isRead = FALSE
ORDER BY n.createdAt DESC;
```

### 3. Mark One Notification as Read
```sql
UPDATE student_notifications
SET isRead = TRUE, readAt = NOW()
WHERE studentId = '' 
AND notificationId = '';
```

### 4. Mark All Notifications as Read
```sql
UPDATE student_notifications
SET isRead = TRUE, readAt = NOW()
WHERE studentId = '' AND isRead = FALSE;
```
## Scaling Problems & Solutions

### Problem 1: Too many rows as data grows
- 50,000 students × many notifications = millions of rows in student_notifications
- Queries slow down without proper indexing

**Solution: Add Indexes**
```sql
CREATE INDEX idx_student_notifications_studentId 
ON student_notifications(studentId);

CREATE INDEX idx_student_notifications_isRead 
ON student_notifications(studentId, isRead);

CREATE INDEX idx_notifications_createdAt 
ON notifications(createdAt DESC);
```

### Problem 2: Sending notification to all 50,000 students is slow
- Inserting 50,000 rows one by one is very slow

**Solution: Batch inserts using a single query**
```sql
INSERT INTO student_notifications (studentId, notificationId)
SELECT id, '' FROM students;
```

### Problem 3: Read queries become slow at scale
- JOIN between notifications and student_notifications gets expensive

**Solution: Pagination**
```sql
SELECT n.id, n.type, n.message, sn.isRead, n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = ''
ORDER BY n.createdAt DESC
LIMIT 20 OFFSET 0;
```
---
# Stage 3

## Is the Query Accurate?
The given query is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is **functionally correct** — it will return the right data.
However it has **serious performance problems** at scale.

---

## Why is it Slow?

### Problem 1: SELECT *
- Fetches ALL columns including unnecessary ones
- More data transferred = slower response
- **Fix: Select only needed columns**
```sql
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Problem 2: No Index on studentID and isRead
- Without indexes, PostgreSQL does a **full table scan**
- With 50,000 students and 5,000,000 notifications, 
  it checks every single row
- This is O(n) — very slow at scale

### Problem 3: ORDER BY createdAt DESC without index
- Sorting 5 million rows without an index is expensive

---

## What Would I Change?

### Step 1: Add Composite Index
```sql
CREATE INDEX idx_notifications_student_read 
ON notifications(studentID, isRead, createdAt DESC);
```
This index covers all three conditions in the query —
WHERE studentID, WHERE isRead, and ORDER BY createdAt.
Query cost drops from O(n) to O(log n).

### Step 2: Select only needed columns
```sql
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Step 3: Add Pagination
```sql
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;
```

---

## Likely Computation Cost

| Scenario | Cost |
|---|---|
| Without index, 5M rows | Full table scan — O(n) — very slow |
| With composite index | Index scan — O(log n) — fast |
| With index + pagination | Only fetches 20 rows — extremely fast |

---

## Should We Add Index on Every Column?

**No — this is bad advice.**

### Why adding indexes on every column is harmful:
- Every index takes up **extra disk space**
- Every INSERT, UPDATE, DELETE becomes **slower** because 
  all indexes need to be updated
- Too many indexes = more overhead than benefit
- Only index columns that are **frequently used in WHERE, 
  JOIN, or ORDER BY clauses**

### Good indexes for this table:
```sql
-- Yes: frequently queried together
CREATE INDEX idx_notifications_student_read 
ON notifications(studentID, isRead, createdAt DESC);

-- No: never queried directly
-- Don't index random columns like message or type alone
```

---

## Query to Find Students with Placement Notification in Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days';
```

---

### Stage 4 Performance Improvement 

Retrieving notifications from the database each time a student visits a page surges the workload and creates sluggish responses from the database.

## Approach to Resolve Issue

1. Caching (using Redis) - Create a cache of notifications once they have been retrieved from the database. When viewing a page again, retrieve that data from the cache. Whenever a new notification gets added to the database, invalidate that notification from cache.
* **Pros:** Can perform reads much faster than querying the database and reduce workload on the database.
* **Cons:** Complexities with cache invalidation and additional infrastructure.

2. Pagination - Instead of loading all 300 notifications at once, limit the load to 20 notifications per page.
* **Pros:** Simple approach and pass less data with each query.
* **Cons:** Still hitting the database upon each page load.

3. WebSockets (push vs. polling) - Read notifications only once via the login process. Utilize WebSockets to push new notifications to students rather than polling the database at peak high frequency.
* **Pros:** Instant availability to notifications without the need for polling.
* **Cons:** More complex to scale and greater memory footprint.

4. Read Replica - Create an environment where read and write databases are configured separately. In this model, there is only one write database while the read databases are multiple.
* **Pros**: Will eliminate loads from both the read and write databases.
* **Cons**: There will be a delay with data reflecting in the read databases, and there will be an additional cost to maintain the separate read-only database.

## Suggested Resolution
Use a combination of Redis caching, paginated notifications and WebSocket technology for real-time updates and maximum performance.

### Stage 5 


## Issues
- Processing all 50,000 students sequentially is slow.
- If an email is unable to send for student #200, there's no way to notify the other 49,800 students.
- There isn't a way to track, retry, or notify on the failure of sending emails.
- The database save and the email notification are tightly coupled, so if either fails, both fail.

## Should the database save and the email notification occur at the same time?
No, the database save is quick and reliable, whereas the email notification relies on an external API which may or may not be available at the time of intended use. Therefore, the two processes should be decoupled to avoid data loss.

## Solution Redesign: Message Queue
1. HR clicks Notify All
2. Create a bulk insert into the database for all 50,000 students at once
3. Push all student IDs to a message queue
4. Create a worker process to retrieve student IDs from the queue, send email, and push notification
5. If an email fails to send, it will automatically retry from queue.

## Advantages
- Database saves for all 50,000 students will be instant.
- Failed emails will automatically be retried.
- The workers will process in parallel, resulting in much faster processing times.
- The database and email notifications will be fully decoupled.

### Stage 6 Output 
Top 10 Priority Notifications:
[
  {
    "ID": "83bb5bb1-7f6d-4733-a51f-71bc73aee664",
    "Type": "Placement",
    "Message": "Amazon.com Inc. hiring",
    "Timestamp": "2026-05-05 07:29:33",
    "priorityScore": 3.0022127922033595
  },
  {
    "ID": "6145300f-3019-42c5-9fd0-8a0178458bf7",
    "Type": "Placement",
    "Message": "Apple Inc. hiring",
    "Timestamp": "2026-05-05 05:00:17",
    "priorityScore": 3.0016633831944457
  },
  {
    "ID": "54b1ec05-6fd2-4b0f-b09a-69305c1f472c",
    "Type": "Placement",
    "Message": "Alphabet Inc. Class A hiring",
    "Timestamp": "2026-05-05 01:59:29",
    "priorityScore": 3.001278797916318
  },
  {
    "ID": "575b4ba1-b06c-45ea-b935-b915b545e93c",
    "Type": "Placement",
    "Message": "Nvidia Corporation hiring",
    "Timestamp": "2026-05-05 00:59:17",
    "priorityScore": 3.0011873884386717
  },
  {
    "ID": "e9659aea-e188-4110-8c07-f5257ff934e5",
    "Type": "Placement",
    "Message": "PayPal Holdings Inc. hiring",
    "Timestamp": "2026-05-04 16:30:05",
    "priorityScore": 3.0007399819121288
  },
  {
    "ID": "30763d32-0864-4359-aa03-47c5de937e0f",
    "Type": "Placement",
    "Message": "Visa Inc. hiring",
    "Timestamp": "2026-05-04 12:59:57",
    "priorityScore": 3.0006404025963502
  },
  {
    "ID": "94d183ae-41c3-400d-97aa-7fa7219edb49",
    "Type": "Placement",
    "Message": "CSX Corporation hiring",
    "Timestamp": "2026-05-04 10:29:21",
    "priorityScore": 3.0005840719888974
  },
  {
    "ID": "bb5764fa-6122-4e57-bb5d-6fd64c22b2ed",
    "Type": "Placement",
    "Message": "CSX Corporation hiring",
    "Timestamp": "2026-05-04 09:29:41",
    "priorityScore": 3.0005644027622136
  },
  {
    "ID": "5a7902d3-3c7a-41e9-8e4c-5bbad5d92a78",
    "Type": "Result",
    "Message": "internal",
    "Timestamp": "2026-05-05 03:59:25",
    "priorityScore": 2.0015104575394904
  },
  {
    "ID": "8e6f21c2-ca0e-4581-ab9b-a771fdf67edf",
    "Type": "Result",
    "Message": "project-review",
    "Timestamp": "2026-05-05 01:59:09",
    "priorityScore": 2.0012782530405433
  }
]