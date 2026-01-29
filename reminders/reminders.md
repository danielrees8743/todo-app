# Project Reminders

Testing checklist for recent deployments and fixes.

---

## Task #1: Verify Mobile Layout Fixes on Vercel Deployment

**Status:** Pending
**Priority:** High
**Related PRs:** #28, #29

### Description
Check that the modal mobile layout fixes are working correctly on the live Vercel deployment at `todo-app-mu-eight-82.vercel.app`

### Steps to Test

**Wait 5-10 minutes for Vercel to deploy**, then test:

1. **Open the Vercel app** on mobile (todo-app-mu-eight-82.vercel.app)
2. **Hard refresh** the browser to clear cache
3. **Click "Add New Task"** button
4. **Check AddTodoModal inputs stack correctly**:
   - Title input: Full width ✅
   - Description: Full width ✅
   - Date input: Full width (should be stacked)
   - Time input: Full width below date (should be stacked)
   - Priority buttons: 3 in a row ✅
5. **Open existing task** (click any task card)
6. **Check TodoDetailsModal inputs stack correctly**:
   - Same layout as above
   - Date and time should stack vertically on mobile

### Expected Behavior on Mobile (< 640px)

```
┌─────────────┐
│ [Date ----] │
│ [Time ----] │
└─────────────┘
```

### Troubleshooting

**If still showing side-by-side**, try:
- Close and reopen browser
- Clear browser cache
- Check GitHub Actions for deployment status
- Verify commit 62b61da deployed successfully

### Files Changed

- `src/components/AddTodoModal/AddTodoModal.tsx` (line 181)
- `src/components/TodoDetailsModal/TodoDetailsModal.tsx` (line 279)

Both should have: `flex flex-col sm:flex-row gap-3`

---

## Task #2: Verify Username Validation Fix on Profile Page

**Status:** Pending
**Priority:** High
**Related PR:** #30

### Description
Test that the username length validation is working correctly on the user profile page.

### Steps to Test

**Wait 5-10 minutes for Vercel deployment**, then test:

1. **Go to Profile page** (click profile icon → Profile)
2. **Test username validation**:
   - Try entering 1-2 characters → Should show error: "Username must be at least 3 characters long"
   - Try entering 31+ characters → Should show error: "Username must be 30 characters or less"
   - Try entering 3-30 characters → Should save successfully

### Expected Behavior

- ✅ Error appears BEFORE submitting to database
- ✅ Clear, helpful error messages
- ✅ HTML5 validation shows instantly (browser hints)
- ✅ Valid usernames (3-30 chars) save without issues
- ✅ No more "username_length" constraint violation errors

### Visual Changes to Verify

- All input fields now use stone/violet color scheme
- Save/Update buttons have scale animations
- Helpful hint text: "(3-30 characters)" next to Username
- Password fields show: "(min 6 characters)"

### Database Constraint (Reference)

```sql
constraint username_length check (char_length(username) >= 3)
```

### Files Changed

- `src/components/UserProfile/UserProfile.tsx` (lines 249-268, 411-423)

---

## Notes

- Both tasks require testing on the **live Vercel deployment**
- Allow 5-10 minutes after merge for deployment to complete
- Hard refresh browser to ensure latest code is loaded
- Test on actual mobile device or mobile viewport in DevTools

## Completion

Once verified, mark tasks as complete:
- [ ] Task #1: Mobile Layout Fixes
- [ ] Task #2: Username Validation
