import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ServiceCommandCenter from '../components/ServiceCommandCenter';

describe('ServiceCommandCenter', () => {
  it('renders without crashing', () => {
    render(<ServiceCommandCenter />);
    expect(screen.getByText(/Centro de dirección/i)).toBeTruthy();
  });

  it('changes phase when nav buttons are clicked', () => {
    render(<ServiceCommandCenter />);
    const serviceBtns = screen.getAllByRole('button', { name: /servicio/i });
    // pick the first matched nav button and click
    fireEvent.click(serviceBtns[0]);
    expect(screen.getByText(/Prioriza lo que necesita decisión ahora/i)).toBeTruthy();
  });

  it('toggles a task done state', () => {
    render(<ServiceCommandCenter />);
    // Multiple tasks exist; pick the first 'Completar tarea' button
    const completeBtns = screen.getAllByLabelText(/Completar tarea/i);
    fireEvent.click(completeBtns[0]);
    // After clicking, at least one button should now have the aria-label for marking pending
    const pendingBtns = screen.queryAllByLabelText(/Marcar tarea como pendiente/i);
    expect(pendingBtns.length).toBeGreaterThan(0);
  });
});
