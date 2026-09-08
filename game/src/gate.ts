const UNLOCKED_KEY = 'connected.unlocked';

export function gateRequired(expected: string | undefined): expected is string {
  return expected !== undefined && expected.trim() !== '';
}

export function gateOpens(entered: string, expected: string): boolean {
  const wanted = expected.trim().toLowerCase();
  return wanted !== '' && entered.trim().toLowerCase() === wanted;
}

export function openGate(expected: string | undefined): Promise<void> {
  if (!gateRequired(expected) || localStorage.getItem(UNLOCKED_KEY) === 'true') {
    return Promise.resolve();
  }

  const container = document.getElementById('game-container')!;

  return new Promise((unlock) => {
    const form = document.createElement('form');
    form.id = 'gate';

    const label = document.createElement('label');
    label.htmlFor = 'gate-code';
    label.textContent = 'Connected is still being built. Enter the code you were given.';

    const field = document.createElement('input');
    field.id = 'gate-code';
    field.autocomplete = 'off';

    const button = document.createElement('button');
    button.textContent = 'enter';

    form.append(label, field, button);
    container.append(form);
    field.focus();

    field.addEventListener('input', () => form.classList.remove('wrong'));

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!gateOpens(field.value, expected)) {
        form.classList.add('wrong');
        field.select();
        return;
      }

      localStorage.setItem(UNLOCKED_KEY, 'true');
      form.remove();
      unlock();
    });
  });
}
