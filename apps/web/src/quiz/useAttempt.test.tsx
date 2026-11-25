import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { sampleQuiz } from '@/fixtures';
import i18n from '@/i18n';
import { useAttempt } from './useAttempt';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('useAttempt', () => {
  beforeEach(async () => {
    vi.mocked(toast.error).mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await i18n.changeLanguage('en');
  });

  it('shows a translated toast and keeps the Attempt when Finish throws', () => {
    const { result } = renderHook(() => useAttempt(sampleQuiz));
    const before = result.current.attempt;

    let finished = true;
    act(() => {
      finished = result.current.finish();
    });

    expect(finished).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(i18n.t('attempt.actionFailed'));
    expect(result.current.attempt).toBe(before);
  });

  it('shows the toast in the current Interface Language', async () => {
    await i18n.changeLanguage('uk');
    const { result } = renderHook(() => useAttempt(sampleQuiz));

    act(() => {
      result.current.tryAgain();
    });

    expect(toast.error).toHaveBeenCalledWith(i18n.t('attempt.actionFailed', { lng: 'uk' }));
  });

  it('records a choice without a toast', () => {
    const { result } = renderHook(() => useAttempt(sampleQuiz));
    const question = result.current.attempt.questions[0]!;

    let ok = false;
    act(() => {
      ok = result.current.choose(question.id, question.options[0]!.id);
    });

    expect(ok).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.inProgress).toBe(true);
  });
});
