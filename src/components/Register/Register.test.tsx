import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';

describe('Register', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Register  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
