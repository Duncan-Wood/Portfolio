import { type TouchAction, type TouchControls } from './input/touch-controls';

// Pointer events, not touch events: a released finger that never fires pointerup
// on the button it started on still reaches the document listener below.
export function wireTouchButtons(controls: TouchControls): void {
  const panel = document.getElementById('touch');
  if (panel === null) {
    return;
  }

  for (const button of panel.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
    const action = button.dataset.action as TouchAction;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      controls.press(action);
    });

    for (const ending of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
      button.addEventListener(ending, () => controls.release(action));
    }
  }

  document.addEventListener('pointercancel', () => controls.releaseAll());
  window.addEventListener('blur', () => controls.releaseAll());
}
