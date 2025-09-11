# Slot Calculation System - Booking Page

## Overview

The slot calculation system in `/book/[venueName]` is responsible for generating available time slots for each pitch, checking for conflicts with existing bookings, and ensuring no double bookings occur. This document explains the complete flow and logic.

## File Location

**Main File:** `src/app/book/[venueName]/page.tsx`

## Key Components

### 1. Data Structures

```typescript
interface TimeSlot {
  time: string;           // Format: "HH:00" (e.g., "14:00")
  available: boolean;     // Whether this slot is available for booking
  conflictingBookings?: string[]; // Array of booking IDs that conflict
}

interface DaySchedule {
  date: string;           // Format: "YYYY-MM-DD"
  dayName: string;        // Greek day name (e.g., "Δευτέρα")
  dayNumber: number;      // Day of month
  isAvailable: boolean;   // Whether this day has any available slots
  slots: TimeSlot[];      // Array of time slots for this day
}

interface Pitch {
  id: string;
  name: string;
  type: string;           // e.g., "7x7", "5x5"
  pricePerSlot: number;
  slotDuration: number;   // Duration in minutes (usually 60)
  defaultOpeningHours: {
    [dayKey: string]: {   // dayKey: 'monday', 'tuesday', etc.
      isOpen: boolean;
      slots: Array<{
        start: string;    // Format: "HH:MM" (e.g., "09:00")
        end: string;      // Format: "HH:MM" (e.g., "22:00")
      }>;
    };
  };
}

interface Booking {
  id: string;
  pitchId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  // ... other fields
}
```

### 2. Main Function: `generateWeekSchedule()`

This is the core function that generates the weekly schedule with available slots.

**Location:** Lines 273-351 in `page.tsx`

#### Step-by-Step Process:

1. **Initialize Week Schedule**
   ```typescript
   const weekSchedule: DaySchedule[] = [];
   ```

2. **Loop Through 7 Days**
   ```typescript
   for (let i = 0; i < 7; i++) {
     const date = new Date(currentWeek);
     date.setDate(currentWeek.getDate() + i);
   ```

3. **Get Day Information**
   ```typescript
   const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
   const dayName = dayNames[date.getDay()];
   const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
   ```

4. **Check Opening Hours**
   ```typescript
   const dayOpeningHours = selectedPitch.defaultOpeningHours[dayKey];
   ```

5. **Generate Time Slots** (if venue is open)
   ```typescript
   if (dayOpeningHours?.isOpen && dayOpeningHours.slots && dayOpeningHours.slots.length > 0) {
     // Generate slots for each opening period
     dayOpeningHours.slots.forEach(timeSlot => {
       const startHour = parseInt(timeSlot.start.split(':')[0]);
       const endHour = parseInt(timeSlot.end.split(':')[0]);
       
       // Generate hourly slots
       for (let hour = startHour; hour < endHour; hour++) {
         const slotTime = `${hour.toString().padStart(2, '0')}:00`;
   ```

### 3. Conflict Detection System

This is the most critical part - preventing double bookings.

**Location:** Lines 308-336 in `page.tsx`

#### Conflict Detection Logic:

```typescript
// Check if this slot conflicts with existing bookings
const conflictingBookings = existingBookings.filter(booking => {
  // 1. Filter by pitch and status
  if (booking.pitchId !== selectedPitch.id || booking.status === 'cancelled') {
    return false;
  }
  
  // 2. Check if it's the same date
  const bookingDate = new Date(booking.startTime);
  const currentDate = new Date(currentWeek);
  currentDate.setDate(currentWeek.getDate() + i);
  
  if (bookingDate.toDateString() !== currentDate.toDateString()) {
    return false;
  }
  
  // 3. Check time overlap
  const bookingStartHour = bookingDate.getHours();
  const bookingEndHour = new Date(booking.endTime).getHours();
  
  // Check if the requested slot overlaps with the booking
  return hour >= bookingStartHour && hour < bookingEndHour;
});

const isAvailable = conflictingBookings.length === 0;
```

#### Time Overlap Logic:

The system checks if a requested slot (e.g., 14:00-15:00) overlaps with any existing booking:

- **Booking exists:** 13:00-15:00
- **Requested slot:** 14:00-15:00
- **Overlap check:** `14 >= 13 && 14 < 15` = **TRUE** (conflict)
- **Result:** Slot marked as unavailable

### 4. Data Flow

```
1. User selects pitch
   ↓
2. Load existing bookings for that pitch
   ↓
3. generateWeekSchedule() called
   ↓
4. For each day in the week:
   a. Check if venue is open
   b. Get opening hours
   c. Generate hourly slots
   d. Check each slot against existing bookings
   e. Mark slot as available/unavailable
   ↓
5. Return weekSchedule with availability
```

### 5. Key Variables

- **`currentWeek`**: The starting date of the current week being displayed
- **`existingBookings`**: Array of all bookings for the selected pitch
- **`selectedPitch`**: The currently selected pitch object
- **`weekSchedule`**: The generated schedule for the current week

### 6. Slot Generation Rules

1. **Hourly Slots**: Each slot is exactly 1 hour (e.g., 14:00-15:00)
2. **Opening Hours**: Only generate slots during venue opening hours
3. **No Gaps**: Slots are generated consecutively (14:00, 15:00, 16:00, etc.)
4. **Conflict Prevention**: Any slot that overlaps with existing bookings is marked unavailable
5. **Status Filtering**: Only consider bookings with status 'confirmed', 'pending', or 'completed'

### 7. Example Scenario

**Venue Opening Hours:**
- Monday: 09:00-22:00

**Existing Bookings:**
- Booking 1: Monday 14:00-16:00 (confirmed)
- Booking 2: Monday 18:00-19:00 (confirmed)
- Booking 3: Monday 20:00-21:00 (cancelled)

**Generated Slots:**
```
09:00 - Available
10:00 - Available
11:00 - Available
12:00 - Available
13:00 - Available
14:00 - UNAVAILABLE (conflicts with Booking 1)
15:00 - UNAVAILABLE (conflicts with Booking 1)
16:00 - Available
17:00 - Available
18:00 - UNAVAILABLE (conflicts with Booking 2)
19:00 - Available
20:00 - Available (Booking 3 is cancelled)
21:00 - Available
```

### 8. Performance Considerations

1. **Booking Filtering**: Only loads bookings for the selected pitch
2. **Date Comparison**: Uses efficient date string comparison
3. **Status Filtering**: Excludes cancelled bookings early in the process
4. **Hour-based Logic**: Simple integer comparisons for time overlap

### 9. Error Handling

- **No Pitch Selected**: Returns empty array
- **No Opening Hours**: Day marked as unavailable
- **Invalid Dates**: Handled by Date constructor
- **Missing Bookings**: Treated as no conflicts

### 10. Integration Points

- **UI Components**: `WeeklyCalendar` component uses this data
- **Booking Creation**: New bookings are added to `existingBookings`
- **Real-time Updates**: Schedule regenerates when bookings change
- **Week Navigation**: `currentWeek` changes trigger regeneration

## Testing Scenarios

1. **No Bookings**: All slots should be available
2. **Full Day Booked**: All slots should be unavailable
3. **Partial Day Booked**: Mixed availability
4. **Cancelled Bookings**: Should not block slots
5. **Different Pitches**: Bookings on one pitch shouldn't affect another
6. **Week Boundaries**: Proper handling of week transitions

## Common Issues

1. **Timezone Problems**: Ensure all dates are in the same timezone
2. **Date Format Inconsistency**: Use consistent date string formats
3. **Booking Status**: Always check booking status before conflict detection
4. **Memory Leaks**: Clear old booking data when switching pitches

## Future Enhancements

1. **Custom Slot Durations**: Support for 30-minute or 90-minute slots
2. **Recurring Bookings**: Handle weekly/monthly recurring bookings
3. **Buffer Time**: Add buffer time between bookings
4. **Advanced Filtering**: Filter by booking type or customer
5. **Caching**: Cache generated schedules for better performance
