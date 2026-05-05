# Stage 1

## Objective

Build a RESTful API that delivers real-time notifications to students for Placement drives, Campus Events, and Examination Results.

---

## Key Functionalities

The Notification Platform exposes the following capabilities:

- Retrieve all notifications for a student
- Retrieve only unread notifications
- Mark a single notification as read
- Mark all notifications as read
- Create a notification (Admin/HR only)
- Delete a notification (Admin only)

---

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

When a student logs in, the frontend opens a persistent WebSocket connection to the server. Whenever an HR or admin creates a new notification, the server immediately emits an event to all connected students — no polling required.

### Flow

1. Student logs in → frontend establishes a WebSocket connection
2. Student joins a dedicated room: `socket.join(studentId)`
3. Admin creates a notification → server broadcasts to all active rooms
4. Frontend receives the event and renders the notification instantly

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Student connects on login |
| `join_room` | Client → Server | Student joins their room |
| `new_notification` | Server → Client | Server pushes new notification |
| `disconnect` | Client → Server | Student logs out |

### Example Server Emit

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

## Why PostgreSQL?

PostgreSQL is the right choice for this platform for several reasons. Notifications follow a well-defined, predictable structure that maps naturally to a relational schema. Querying by attributes such as `studentId`, notification type, read status, and creation timestamp is straightforward with SQL. PostgreSQL's indexing support allows high-speed lookups even over millions of rows, and its ACID guarantees ensure every notification is created or removed reliably without partial failures.

## Database Structure

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  rollNo VARCHAR(50) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Placement', 'Event', 'Result')),
  message TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Student-Notification Junction Table
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

## Queries Supporting Stage 1 APIs

### 1. Retrieve All Notifications for a Student
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
```

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

## Scaling Challenges and Solutions

### Problem 1: Table Size Grows Unmanageable

With 50,000 students and hundreds of notifications each, the `student_notifications` table quickly reaches millions of rows. Without indexes, every query becomes a full table scan.

**Solution: Add targeted indexes**
```sql
CREATE INDEX idx_student_notifications_studentId 
ON student_notifications(studentId);

CREATE INDEX idx_student_notifications_isRead 
ON student_notifications(studentId, isRead);

CREATE INDEX idx_notifications_createdAt 
ON notifications(createdAt DESC);
```

### Problem 2: Broadcasting to 50,000 Students is Slow

Inserting one row per student in a loop is extremely inefficient at scale.

**Solution: Batch insert with a single query**
```sql
INSERT INTO student_notifications (studentId, notificationId)
SELECT id, '' FROM students;
```

### Problem 3: Read Queries Degrade Under Load

A JOIN across two large tables becomes expensive as row counts grow.

**Solution: Paginate results**
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

The query under review is:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is functionally correct — it returns the right data. However, it has serious performance problems at scale.

---

## Why is it Slow?

### Problem 1: `SELECT *`

Fetching every column unnecessarily increases the volume of data transferred over the network and from disk.

**Fix: Select only the columns you need**
```sql
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Problem 2: No Index on `studentID` and `isRead`

Without indexes, PostgreSQL resorts to a full table scan — checking every row one by one. With 5 million rows across 50,000 students, this is O(n) and unacceptably slow.

### Problem 3: `ORDER BY createdAt DESC` Without an Index

Sorting millions of unindexed rows on every query adds significant overhead.

---

## Recommended Fixes

### Step 1: Add a Composite Index
```sql
CREATE INDEX idx_notifications_student_read 
ON notifications(studentID, isRead, createdAt DESC);
```

This single index covers all three clauses — the `WHERE` conditions on `studentID` and `isRead`, and the `ORDER BY` on `createdAt`. Query cost drops from O(n) to O(log n).

### Step 2: Select Only Needed Columns
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

## Estimated Computation Cost

| Scenario | Cost |
|---|---|
| Without index, 5M rows | Full table scan — O(n) — very slow |
| With composite index | Index scan — O(log n) — fast |
| With index + pagination | Only fetches 20 rows — extremely fast |

---

## Should Every Column Have an Index?

No — this is a common misconception and actively harmful in practice.

Every index consumes additional disk space and slows down every `INSERT`, `UPDATE`, and `DELETE` because all indexes must be kept in sync. Beyond a certain point, excessive indexes create more overhead than they eliminate. Only index columns that appear frequently in `WHERE`, `JOIN`, or `ORDER BY` clauses.

**Appropriate indexes for this table:**
```sql
-- Yes: columns queried together in the critical path
CREATE INDEX idx_notifications_student_read 
ON notifications(studentID, isRead, createdAt DESC);

-- No: columns never used in filtering or sorting
-- Don't index fields like message or type in isolation
```

---

## Query: Students Who Received a Placement Notification in the Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## The Problem

Hitting the database on every page visit to retrieve notifications becomes a bottleneck as traffic grows, leading to increased query load and slower response times.

## Approaches to Resolve the Issue

**Caching with Redis** stores a copy of retrieved notifications in memory. Subsequent requests are served from the cache rather than the database. When a new notification is added, the relevant cache entry is invalidated.
- *Pros:* Dramatically faster reads and reduced database load.
- *Cons:* Cache invalidation logic adds complexity, and Redis requires additional infrastructure.

**Pagination** limits each response to a fixed number of notifications — say, 20 per page — rather than loading all 300 at once.
- *Pros:* Simple to implement and reduces data transferred per request.
- *Cons:* The database is still queried on every page load.

**WebSockets (push over polling)** loads notifications once at login, then relies on a persistent WebSocket connection to push new notifications to the client in real time.
- *Pros:* Eliminates redundant database queries entirely; notifications arrive instantly.
- *Cons:* More complex to scale horizontally and carries a higher memory footprint per connection.

**Read Replicas** separate read and write traffic across different database instances — one primary for writes, multiple replicas for reads.
- *Pros:* Removes read pressure from the write database and improves overall throughput.
- *Cons:* Replication introduces a slight propagation delay, and maintaining replica instances adds operational cost.

## Recommended Approach

Combine Redis caching for frequently accessed data, pagination to keep payloads lightweight, and WebSockets for real-time delivery of new notifications. This layered approach addresses latency, throughput, and freshness simultaneously.

---

# Stage 5

## The Problem

The current approach of processing 50,000 students sequentially has several critical weaknesses. A failure at student #200 silently blocks notifications for the remaining 49,800 students. There is no mechanism to track, retry, or report failed email sends. Additionally, the database write and the email dispatch are tightly coupled — if either step fails, both are lost.

## Should the Database Save and Email Happen Together?

No. The database write is fast and reliable. Email delivery depends on a third-party API that may be slow, rate-limited, or temporarily unavailable. Coupling them means a transient email failure can prevent the notification from ever being saved. The two operations must be decoupled.

## Redesigned Solution: Message Queue

1. HR clicks "Notify All"
2. All 50,000 student records are inserted into the database in a single bulk operation
3. All student IDs are pushed onto a message queue
4. Worker processes pull IDs from the queue, send the email, and trigger the push notification
5. If an email fails, the message remains in the queue and is automatically retried

## Advantages

The bulk insert makes the database operation nearly instantaneous regardless of student count. Failed emails are retried automatically without any manual intervention. Multiple workers process the queue in parallel, compressing total delivery time significantly. The database and email delivery are now fully independent — a failure in one does not affect the other.

---

# Stage 6

## Top 10 Priority Notifications

```json
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
````