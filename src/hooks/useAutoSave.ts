import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoSave({
  onSave,
  interval = 30000, // 30 seconds default
  enabled = true,
}: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<Date | null>(null);

  // Trigger auto-save
  const triggerAutoSave = useCallback(async () => {
    if (!enabled || isSaving) return;

    try {
      setIsSaving(true);
      await onSave();
      const now = new Date();
      setLastSaved(now);
      lastSaveRef.current = now;
      setHasUnsavedChanges(false);
      console.log('[AutoSave] Saved successfully at', now.toLocaleTimeString());
    } catch (error) {
      console.error('[AutoSave] Save failed:', error);
      toast.error('Failed to auto-save project');
    } finally {
      setIsSaving(false);
    }
  }, [enabled, isSaving, onSave]);

  // Mark as having changes (normal priority - 30s save)
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Mark as having changes with quick save (5s save for major changes)
  const markAsChangedQuick = useCallback(() => {
    setHasUnsavedChanges(true);

    // Cancel existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule quick save (5 seconds)
    const timeout = setTimeout(() => {
      triggerAutoSave();
    }, 5000);

    saveTimeoutRef.current = timeout;
  }, [triggerAutoSave]);

  // Manual save - optimistic UI with proper error handling
  const saveNow = useCallback(async () => {
    if (isSaving) return; // Prevent double saves

    try {
      setIsSaving(true);
      await onSave();
      const now = new Date();
      setLastSaved(now);
      lastSaveRef.current = now;
      setHasUnsavedChanges(false);
      toast.success('Project saved', { duration: 2000 });
    } catch (error) {
      console.error('[AutoSave] Manual save failed:', error);
      toast.error('Failed to save project');
      // Don't throw - allow user to retry
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave]);

  // Auto-save interval (only if no quick save is scheduled)
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const timeout = setTimeout(() => {
      triggerAutoSave();
    }, interval);

    saveTimeoutRef.current = timeout;

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, hasUnsavedChanges, interval, triggerAutoSave]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    markAsChanged,
    markAsChangedQuick,
    saveNow,
  };
}
