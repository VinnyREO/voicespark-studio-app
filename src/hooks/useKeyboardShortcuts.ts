import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onPlayPause?: () => void;
  onSplit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSeekLeft?: () => void;
  onSeekRight?: () => void;
  onSeekToStart?: () => void;
  onSeekToEnd?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Space: Play/Pause
      if (e.code === 'Space' && !cmdKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onPlayPause?.();
      }

      // S: Split
      else if (e.key === 's' && !cmdKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onSplit?.();
      }

      // Delete/Backspace: Delete selected
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !cmdKey) {
        e.preventDefault();
        handlers.onDelete?.();
      }

      // Cmd/Ctrl + C: Copy
      else if (e.key === 'c' && cmdKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onCopy?.();
      }

      // Cmd/Ctrl + V: Paste
      else if (e.key === 'v' && cmdKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onPaste?.();
      }

      // Cmd/Ctrl + Z: Undo
      else if (e.key === 'z' && cmdKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
      }

      // Cmd/Ctrl + Shift + Z: Redo
      else if (e.key === 'z' && cmdKey && e.shiftKey) {
        e.preventDefault();
        handlers.onRedo?.();
      }

      // Left Arrow: Seek left (frame by frame)
      else if (e.key === 'ArrowLeft' && !cmdKey) {
        e.preventDefault();
        handlers.onSeekLeft?.();
      }

      // Right Arrow: Seek right (frame by frame)
      else if (e.key === 'ArrowRight' && !cmdKey) {
        e.preventDefault();
        handlers.onSeekRight?.();
      }

      // Home: Seek to start
      else if (e.key === 'Home') {
        e.preventDefault();
        handlers.onSeekToStart?.();
      }

      // End: Seek to end
      else if (e.key === 'End') {
        e.preventDefault();
        handlers.onSeekToEnd?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, enabled]);
}
