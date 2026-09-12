import { type TouchAction, type TouchControls } from './input/touch-controls';
import { type ControlScheme, controlScheme, rememberControlScheme } from './progress';

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

export function showControlScheme(scheme: ControlScheme = controlScheme()): void {
  document.body.dataset.controls = scheme;

  const toggle = document.getElementById('scheme');
  if (toggle !== null) {
    toggle.textContent = `controls: ${scheme}`;
  }
}

export function wireControlScheme(onChange: (scheme: ControlScheme) => void): void {
  const show = (scheme: ControlScheme): void => {
    showControlScheme(scheme);
    onChange(scheme);
  };

  show(controlScheme());

  document.getElementById('scheme')?.addEventListener('click', () => {
    const next: ControlScheme = controlScheme() === 'swipe' ? 'buttons' : 'swipe';
    rememberControlScheme(next);
    show(next);
  });
}
