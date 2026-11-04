// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollToHash } from './ScrollToHash';

const scrollIntoView = vi.fn();

function addTarget(id: string) {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ScrollToHash />
    </MemoryRouter>
  );
}

describe('ScrollToHash', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    scrollIntoView.mockClear();
  });

  it('scrolls to the element named in the hash', () => {
    addTarget('discover');
    renderAt('/#discover');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('decodes percent-encoded ids', () => {
    addTarget('cách');
    renderAt('/#c%C3%A1ch');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not crash on a malformed hash and uses it as written', () => {
    addTarget('100%');
    expect(() => renderAt('/#100%')).not.toThrow();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a hash', () => {
    addTarget('discover');
    renderAt('/');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
