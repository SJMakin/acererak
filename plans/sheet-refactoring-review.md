# Sheet System Refactoring - Comprehensive Code Review

## Executive Summary

The refactoring from Character → Sheet has been **mostly completed**, but there are **several critical issues** that need to be addressed before the system is fully consistent. The main problems are:

1. **Duplicate files** - Old Character* files coexist with new Sheet* files
2. **CSS class name inconsistencies** - Some files reference old CSS classes
3. **Orphaned files** - Old files that are no longer imported but still exist
4. **Minor naming inconsistencies** in UI text

---

## 1. CRITICAL: Duplicate/Orphaned Files

### Files that still exist with old naming:

| File | Status | Issue |
|------|--------|-------|
| `CharacterSheetModal.tsx` | **ORPHANED** | Not imported anywhere, but still exists |
| `CharacterSheetModal.css` | **ORPHANED** | Referenced by CharacterSheetModal.tsx only |
| `CharacterSheetContent.tsx` | **ORPHANED** | Not imported anywhere, but still exists |
| `CharacterSheetEditor.tsx` | **ORPHANED** | Not imported anywhere, but still exists |
| `CharacterSheetEditor.css` | **ORPHANED** | Referenced by CharacterSheetEditor.tsx only |
| `CharacterLibraryPanel.css` | **ORPHANED** | Not referenced anywhere |

### New files that replaced them:

| File | Status |
|------|--------|
| `SheetModal.tsx` | ✅ Active - imported by App.tsx |
| `SheetModal.css` | ✅ Active |
| `SheetContent.tsx` | ✅ Active - imported by SheetModal.tsx |
| `SheetEditor.tsx` | ✅ Active - imported by SheetContent.tsx |
| `SheetEditor.css` | ⚠️ **MISSING** - SheetEditor.tsx imports `./CharacterSheetEditor.css` |

### Action Required:
**Delete the orphaned files:**
- `CharacterSheetModal.tsx`
- `CharacterSheetModal.css`
- `CharacterSheetContent.tsx`
- `CharacterSheetEditor.tsx`
- `CharacterSheetEditor.css`
- `CharacterLibraryPanel.css`

---

## 2. CSS Import Inconsistency

### Issue in `SheetEditor.tsx` (line 36):
```typescript
import './CharacterSheetEditor.css';
```

This imports from the **old** CSS file that should be deleted. The CSS file should either:
- Be renamed to `SheetEditor.css`, OR
- The import should reference the existing CSS file consistently

### Current CSS class usage in SheetEditor.tsx:
The file uses these CSS class prefixes:
- `character-sheet-editor__*` (in the old CSS file)
- Should be renamed to `sheet-editor__*` for consistency

---

## 3. CSS Class Name Inconsistencies

### In `SheetContent.tsx`:
The new file correctly uses `sheet-modal__*` class names:
- `sheet-modal__header`
- `sheet-modal__title`
- `sheet-modal__mode-buttons`
- `sheet-modal__mode-btn`
- `sheet-modal__close`
- `sheet-modal__editor`
- `sheet-modal__footer`

### In `CharacterSheetContent.tsx` (orphaned):
Uses `character-sheet-modal__*` class names (old naming).

### In `SheetModal.css`:
Need to verify it defines all the `sheet-modal__*` classes used by SheetContent.tsx.

---

## 4. UI Text Inconsistencies

### In `SheetContent.tsx` (line 145):
```tsx
<Button ...>Create Character</Button>
```
Should be: `Create Sheet`

### In `SheetContent.tsx` (line 67):
```tsx
placeholder="Untitled Sheet"
```
✅ This is correct.

---

## 5. Type Consistency Review

### ✅ types/index.ts
- Correctly imports and re-exports `Sheet` from `./character`
- `TokenElement.sheetId` is correctly named (line 80)
- `GameState.sheets` is correctly typed (line 169)

### ✅ types/character.ts
- Sheet type is properly defined with all fields: `id`, `name`, `content`, `shadowState`, `projections`, `category`, `tags`, `createdAt`, `updatedAt`
- P2P message types are properly exported

### ⚠️ File naming concern:
The Sheet types are in `character.ts` - this file should ideally be renamed to `sheet.ts` for consistency, though this is a lower-priority cosmetic issue.

---

## 6. Store Review

### ✅ sheetStore.ts
- All functions properly named
- P2P handlers correctly set up
- Export functions `handleIncomingSheetUpdate` and `handleIncomingSheetDelete` are properly exported
- `setSheetStoreGM` helper is exported

### ✅ libraryStore.ts
- Simplified correctly (no token templates)
- LibraryItem type is minimal with `type: 'token'` only

---

## 7. LibraryPanel Implementation Review

### ✅ Overall Implementation
The LibraryPanel correctly:
- Shows both library items AND sheets
- Has "Create Sheet" button
- Shows sheets with Place Token, Edit Sheet, Delete Sheet actions
- Uses sheet category for icons
- Has proper modal for creating new sheets with templates

### ⚠️ Minor Issues:

1. **Filter SegmentedControl** (lines 200-209):
   ```tsx
   <SegmentedControl
     data={[
       { label: 'All', value: 'all' },
       { label: '🎭 Tokens', value: 'token' },
     ]}
   />
   ```
   This only shows token filter. Since LibraryItem.type is only `'token'`, this is correct but the filter doesn't affect sheets display - sheets are always shown below regardless of filter.

2. **No sheet filtering**: Sheets are displayed unconditionally below library items. Consider whether sheets should be filterable too.

---

## 8. Sidebar Review

### ✅ Sidebar.tsx
- No references to old Character names
- LibraryPanel is properly integrated
- No "Add Token" form (correctly removed)

---

## 9. useRoom.ts P2P Handlers Review

### ✅ P2P Sheet Handling
- `sendSheetUpdate` / `sendSheetDelete` actions properly defined
- `onSheetUpdate` / `onSheetDelete` handlers properly registered
- Sheet state synced with game state in `onSync` handler (line 544-546)
- Sheets included in sync payloads (lines 474, 597, 1010)

### ✅ No Issues Found

---

## 10. Database Schema Review

### ✅ database.ts
- `sheets` table properly defined in Dexie schema (line 48, 57)
- All CRUD operations for sheets implemented:
  - `saveSheets()` - bulk save
  - `loadSheets()` - load all
  - `saveSheet()` - single save
  - `getSheet()` - single get
  - `deleteSheet()` - single delete

---

## 11. Import Chain Verification

### Current import chain (✅ working):
```
App.tsx
  → SheetModal.tsx
    → SheetContent.tsx (named export)
      → SheetEditor.tsx (named export)
```

### Orphaned import chain (❌ should be deleted):
```
CharacterSheetModal.tsx (not imported by anything)
  → CharacterSheetContent.tsx
    → CharacterSheetEditor.tsx
```

---

## Summary of Required Actions

### HIGH PRIORITY (Must Fix):

1. **Delete orphaned files:**
   - `vtt/src/components/character/CharacterSheetModal.tsx`
   - `vtt/src/components/character/CharacterSheetModal.css`
   - `vtt/src/components/character/CharacterSheetContent.tsx`
   - `vtt/src/components/character/CharacterSheetEditor.tsx`
   - `vtt/src/components/character/CharacterSheetEditor.css`
   - `vtt/src/components/character/CharacterLibraryPanel.css`

2. **Fix CSS import in SheetEditor.tsx:**
   - Change `import './CharacterSheetEditor.css'` to `import './SheetEditor.css'`
   - Create `SheetEditor.css` with renamed classes from `character-sheet-editor__*` to `sheet-editor__*`

3. **Fix UI text in SheetContent.tsx:**
   - Line 145: Change "Create Character" to "Create Sheet"

### MEDIUM PRIORITY (Should Fix):

4. **Rename types/character.ts to types/sheet.ts:**
   - Update import in `types/index.ts` from `'./character'` to `'./sheet'`

### LOW PRIORITY (Cosmetic):

5. **Consider adding sheet filtering to LibraryPanel:**
   - Currently sheets are always shown regardless of filter selection
   - Consider adding category filter for sheets

---

## Architecture Diagram

```mermaid
graph TB
    subgraph App
        App[App.tsx]
    end
    
    subgraph Sheet System
        SheetModal[SheetModal.tsx]
        SheetContent[SheetContent.tsx]
        SheetEditor[SheetEditor.tsx]
        SheetStore[sheetStore.ts]
    end
    
    subgraph Library System
        LibraryPanel[LibraryPanel.tsx]
        LibraryStore[libraryStore.ts]
    end
    
    subgraph P2P
        useRoom[useRoom.ts]
    end
    
    subgraph Database
        DB[database.ts]
    end
    
    App --> SheetModal
    SheetModal --> SheetContent
    SheetContent --> SheetEditor
    SheetModal --> SheetStore
    SheetContent --> SheetEditor
    LibraryPanel --> SheetStore
    LibraryPanel --> LibraryStore
    useRoom --> SheetStore
    SheetStore --> DB
    LibraryStore --> DB
    
    style SheetModal fill:#90EE90
    style SheetContent fill:#90EE90
    style SheetEditor fill:#FFD700
    style SheetStore fill:#90EE90
    style LibraryPanel fill:#90EE90
    style useRoom fill:#90EE90
    style DB fill:#90EE90
```

**Legend:**
- 🟢 Green = Fully refactored
- 🟡 Yellow = Needs attention (CSS import)

---

## Conclusion

The refactoring is **~90% complete**. The core functionality is working correctly, but the presence of orphaned files and one CSS import inconsistency creates potential confusion and maintenance burden. The fixes required are straightforward file deletions and one import path update.
