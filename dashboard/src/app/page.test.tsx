import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Dashboard Page', () => {
  it('should render the dashboard heading', () => {
    render(<Page />);
    expect(screen.getByText('Agent Office Dashboard')).toBeInTheDocument();
  });
});
