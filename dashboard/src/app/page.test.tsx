import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Dashboard Page', () => {
  it('should render the dashboard heading', () => {
    render(<Page />);
    const headings = screen.getAllByText('Agent Office');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
