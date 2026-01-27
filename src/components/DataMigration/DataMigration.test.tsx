import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DataMigration from './DataMigration';

describe('DataMigration', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <DataMigration  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
