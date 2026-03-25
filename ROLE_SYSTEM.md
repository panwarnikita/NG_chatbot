# ChatBot Role-Based Response System

## ✅ Feature Implemented

The NaviAI chatbot now provides role-specific answers based on user selection.

## How It Works

### 1. **Frontend (React)**
- User selects role on landing page: **Student | Parent | Partner**
- Selected role is stored in React state (`selectedRole`)
- Role is sent with every chat message to backend

### 2. **Backend (Flask)**
- Each role has a specific instruction prompt in `ROLE_PROMPTS` dictionary
- Role is received in `/ask` POST request body
- Role-specific instruction is prepended to the main system prompt
- Role is saved in MongoDB for each chat session

## Role-Specific Behaviors

### 👨‍🎓 **Student**
```
"You are a NavGurukul admissions assistant helping a student. 
Give simple, clear, and friendly answers with step-by-step guidance."
```
- Simple language
- Step-by-step explanations
- Friendly tone
- Focus on student perspective

### 👩‍👧 **Parent**
```
"You are a NavGurukul admissions assistant speaking to a parent. 
Provide clear, trustworthy, and reassuring information about safety, 
eligibility, and outcomes."
```
- Reassuring tone
- Safety & eligibility focus
- Outcome-oriented information
- Trustworthy & professional

### 🤝 **Partner** (NGO/Government/Teacher)
```
"You are a NavGurukul admissions assistant assisting an institutional partner. 
Give professional, concise, and structured information about programs, 
collaboration, and processes."
```
- Professional tone
- Structured information
- Program & collaboration details
- Concise & business-focused

## Testing

1. **Start Backend:**
   ```powershell
   C:/Python314/python.exe app.py
   ```

2. **Start Frontend:**
   ```powershell
   npm --prefix frontend run dev
   ```

3. **Visit:** `http://localhost:5173`

4. **Test Flow:**
   - Page loads → Role selection screen appears
   - Click "Student" → Ask "What is NavGurukul?" → Gets student-friendly answer
   - New chat → Select "Parent" → Same question → Gets parent-focused answer
   - New chat → Select "Partner" → Same question → Gets professional answer

## Backend API

**Endpoint:** `POST /ask`

**Request Body:**
```json
{
  "query": "What is NavGurukul?",
  "chat_id": "uuid-or-null",
  "role": "student|parent|partner"
}
```

**Response:**
```json
{
  "response": "AI generated response based on role",
  "chat_id": "uuid",
  "role": "selected_role"
}
```

## Files Modified

- `backend/app.py` - Role prompts + role parameter handling
- `frontend/src/App.jsx` - Role selection UI + role state management
- `frontend/src/styles.css` - Role card styling

## Status: ✅ COMPLETE

Role-based chatbot response system is fully functional!
